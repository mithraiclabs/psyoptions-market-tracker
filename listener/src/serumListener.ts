import { Market, OpenOrders } from "@mithraic-labs/serum";
import { decodeEventQueue, decodeEventsSince, Event, EVENT_QUEUE_LAYOUT } from "@mithraic-labs/serum/lib/queue";
import { AccountInfo, Connection, Context, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Change, Done, EventTypes, Fill, Trade } from "./events.types";
import { findOpenOrderByAddress, getSerumMarketByAddress, submitSerumEvents, subscribeToActivePsyOptionMarkets, upsertOpenOrder, upsertSerumMarket } from "./graphQLClient";
import { IndexedSerumMarket } from "./types";
import { ClusterEnv } from "@mithraic-labs/market-meta/dist/types";
import { batchSerumMarkets } from "./helpers/serum";
import { wait } from "./helpers/helpers";
import { logger } from "./helpers/logger";

const getOpenOrderAccount = async (connection: Connection, address: PublicKey, serumProgramId: PublicKey, attempt = 0): Promise<OpenOrders|null> => {
  try {
    if (attempt >= 0) {
      const delay = attempt**2 * 250;
      await wait(delay)
    }
    return await OpenOrders.load(connection, address, serumProgramId)
  } catch (error) {
    logger.error('Caught error in getOpenOrderAccount')
    logger.error(error)
    if (attempt < 10) {
      return getOpenOrderAccount(connection, address, serumProgramId, attempt + 1)
    }
    return null;
  }
}

// Used to track with open order accounts are being fetched from the chain to avoid redundant
// RPC requests. OpenOrders only need to be added once and then they will be associated to 
// any order they've made.
const openOrdersFetching = {};
const addOpenOrdersIfMissing = async (connection: Connection, serumProgramId: PublicKey, openOrdersKey: PublicKey) => {
  const { error, response } = await findOpenOrderByAddress(openOrdersKey.toString())
  if (response) {
    const { data } = await response.json()
    if (!data?.open_order_accounts?.length) {
      if (openOrdersFetching[openOrdersKey.toString()]) {
        return 
      } else {
        openOrdersFetching[openOrdersKey.toString()] = true
        
        // get the open order account info from the chain
        const openOrders = await getOpenOrderAccount(connection, openOrdersKey, serumProgramId)
        if (openOrders) {
          upsertOpenOrder(openOrders)
        }
        delete openOrdersFetching[openOrdersKey.toString()]
      }
    }
  }
}

function divideBnToNumber(numerator: BN, denominator: BN): number {
  const quotient = numerator.div(denominator).toNumber();
  const rem = numerator.umod(denominator);
  const gcd = rem.gcd(denominator);
  return quotient + rem.div(gcd).toNumber() / denominator.div(gcd).toNumber();
}

const _getFillSize = (market: Market, event: Event) => {
  return divideBnToNumber(
    event.eventFlags.bid ? event.nativeQuantityReleased : event.nativeQuantityPaid,
    (market as any)._baseSplTokenMultiplier
  )
}

const _getFillPrice = (market: Market, event: Event) => {
  let priceBeforeFees

  if (event.eventFlags.bid) {
    priceBeforeFees = event.eventFlags.maker
      ? event.nativeQuantityPaid.add(event.nativeFeeOrRebate)
      : event.nativeQuantityPaid.sub(event.nativeFeeOrRebate)
  } else {
    priceBeforeFees = event.eventFlags.maker
      ? event.nativeQuantityReleased.sub(event.nativeFeeOrRebate)
      : event.nativeQuantityReleased.add(event.nativeFeeOrRebate)
  }

  const price = divideBnToNumber(
    priceBeforeFees.mul((market as any)._baseSplTokenMultiplier),
    (market as any)._quoteSplTokenMultiplier.mul(
      event.eventFlags.bid ? event.nativeQuantityReleased : event.nativeQuantityPaid
    )
  )

  return price
}

const _mapEventToDataMessage = (
  event: Event,
  market: Market,
  timestamp: string,
  slot: number,
): Fill | Done | Change | undefined => {
  const clientId = (event as any).clientOrderId ? (event as any).clientOrderId.toString() : undefined

  const side = event.eventFlags.bid ? 'buy' : 'sell'
  const orderId = event.orderId.toString()
  const openOrdersAccount = event.openOrders.toBase58()
  const openOrdersSlot = event.openOrdersSlot
  const feeTier = event.feeTier

  if (event.eventFlags.fill) {
    const fillMessage: Fill = {
      type: 'fill',
      serumMarketAddress: market.address.toString(),
      timestamp,
      slot,
      orderId,
      clientId,
      side,
      price: _getFillPrice(market, event),
      size: _getFillSize(market, event),
      maker: event.eventFlags.maker,
      feeCost: market.quoteSplSizeToNumber(event.nativeFeeOrRebate) * (event.eventFlags.maker ? -1 : 1),
      account: openOrdersAccount,
      accountSlot: openOrdersSlot,
      feeTier: feeTier
    }
    return fillMessage
  } else if (event.nativeQuantityPaid.eqn(0)) {
    // we can use nativeQuantityPaid === 0 to detect if order is 'done'
    // this is what the dex uses at event processing time to decide if it can release the slot in an OpenOrders account.
    // done means that there won't be any more messages for the order (is no longer in the order book or never was - cancelled, ioc)

    const doneMessage: Done = {
      type: 'done',
      serumMarketAddress: market.address.toString(),
      timestamp,
      slot,
      orderId,
      clientId,
      side,
      account: openOrdersAccount,
      accountSlot: openOrdersSlot
    }

    return doneMessage
  }

  return
}

// TODO figure out how to make this resistant to concurrent calls for the same market 
// (i.e. something like an advisory lock on a row, so we can determine if a market's 
// event queue is being consumed by some other process)
export const handleEventQueueChange = (connection: Connection, serumProgramId: PublicKey, market: Market) => async (accountInfo: AccountInfo<Buffer>, context: Context) => {
  logger.debug(`handleEventQueueChange for market: ${market.address.toString()}`)
  // retrieve the last event queue sequence number that was tracked from the database
  const timestamp = new Date().toISOString()
  const {error, response} = await getSerumMarketByAddress(market.address.toString())
  if (error) return;
  const { data } = await response.json()
  let indexedMarket: IndexedSerumMarket = undefined;
  if (!data.serum_markets.length) {
    // Add the serum market if it does not exist
    indexedMarket = {
      address: market.address.toString(),
      program_id: serumProgramId.toString(),
      base_mint_address: market.baseMintAddress.toString(),
      quote_mint_address: market.quoteMintAddress.toString(),
      // @ts-ignore: Serum decoded
      request_queue_address: market?._decoded?.requestQueue?.toString(),
      // @ts-ignore: Serum decoded
      event_queue_address: market?._decoded?.eventQueue?.toString(),
      // @ts-ignore: Serum decoded
      bids_address: market?._decoded?.bids?.toString(),
      // @ts-ignore: Serum decoded
      asks_address: market?._decoded?.asks?.toString(),
    }
    upsertSerumMarket(indexedMarket)
  } else {
    indexedMarket = data.serum_markets[0] as IndexedSerumMarket
  }
  let events: Event[] = [];

  // Update the Serum market with the latest seq number
  const header = EVENT_QUEUE_LAYOUT.HEADER.decode(accountInfo.data);
  upsertSerumMarket({...indexedMarket, last_event_seq_num: header.seqNum})

  if (indexedMarket.last_event_seq_num) {
    logger.debug(`Decoding events from seq: ${indexedMarket.last_event_seq_num} to: ${header.seqNum}`)
    events = decodeEventsSince(accountInfo.data, indexedMarket.last_event_seq_num)
  } else {
    logger.debug("Decoding all events")
    events = decodeEventQueue(accountInfo.data)
  }
  // map the events to better structure
  const formattedEvents: EventTypes[] = []
  const fillsForTradeMatching: Record<string, Fill> = {}
  events.forEach(event => {
    const formattedEvent = _mapEventToDataMessage(event, market, timestamp, context.slot)
    if (formattedEvent) {
      formattedEvents.push(formattedEvent)
      /**
       * Below we capture a Trade event by matching opposite Fill events. This logic
       * expects that the both Fill events for a trade will be decoded during the same
       * iteration of reading the event queue. Basically this makes the assumption that
       * corresponding Fill events will always occur during in the same block.
       */
      if (formattedEvent.type === 'fill') {
        const key = `${formattedEvent.serumMarketAddress}|${formattedEvent.price}|${formattedEvent.size}|${formattedEvent.side}|${formattedEvent.maker}`
        fillsForTradeMatching[key] = formattedEvent

        const oppositeKey = `${formattedEvent.serumMarketAddress}|${formattedEvent.price}|${formattedEvent.size}|${formattedEvent.side === 'buy' ? 'sell' : 'buy'}|${!formattedEvent.maker}`
        const marketFillOrder = fillsForTradeMatching[oppositeKey]

        if (marketFillOrder) {
          // get the maker opposite fill order id
          const makerFillOrderId = marketFillOrder.orderId
          const tradeId = `${formattedEvent.orderId}|${makerFillOrderId}`
          const tradeEvent: Trade = {
            type: 'trade',
            serumMarketAddress: formattedEvent.serumMarketAddress,
            timestamp,
            slot: formattedEvent.slot,
            id: tradeId,
            side: formattedEvent.side,
            price: formattedEvent.price,
            size: formattedEvent.size
          }
          formattedEvents.push(tradeEvent)
        }
      }
    }
    addOpenOrdersIfMissing(connection, serumProgramId, event.openOrders)
  })
  // Submit all events to the DB
  if (formattedEvents.length) {
    submitSerumEvents(formattedEvents)
  }
}

export const subscribeToPackagedSerumMarkets = async (connection: Connection, clusterMeta: ClusterEnv) => {
  const activeMarkets = clusterMeta.optionMarkets.filter(marketMeta => 
    marketMeta.expiration * 1000 > new Date().getTime()
  )
  const serumMarketKeys = activeMarkets.map(marketMeta => 
    ({
      key: new PublicKey(marketMeta.serumMarketAddress),
      programId: new PublicKey(marketMeta.serumProgramId)
    })
  )

  // batch get the Serum market data
  const markets = await batchSerumMarkets(connection, serumMarketKeys)

  const starterPromise = Promise.resolve(null)
  await markets.reduce(async (accumulator, market) => {
    await accumulator;

    logger.info(`Subscribing to market: ${market.address.toString()}`)
    // subscribe to the serum event queue
    connection.onAccountChange(
      // @ts-ignore: serum decoded
      new PublicKey(market._decoded.eventQueue),
      handleEventQueueChange(connection, market.programId, market)
    )
    // process the market initially
    // @ts-ignore: serum decoded
    const accountInfo = await connection.getAccountInfo(market._decoded.eventQueue)
    await handleEventQueueChange(connection, market.programId, market)(accountInfo, {slot: null})
    return wait(1_000)
  }, starterPromise)
  
}

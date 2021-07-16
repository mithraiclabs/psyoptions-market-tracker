import { Market } from "@mithraic-labs/serum";
import { decodeEventQueue, decodeEventsSince, Event, EVENT_QUEUE_LAYOUT } from "@mithraic-labs/serum/lib/queue";
import { AccountInfo, Connection, Context, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Change, Done, EventTypes, Fill } from "./events.types";
import { getSerumMarketByAddress, submitSerumEvents, subscribeToActivePsyOptionMarkets, upsertSerumMarket } from "./graphQLClient";
import { IndexedSerumMarket } from "./types";
import { wait } from "./helpers"

type ActiveSubscription = {
  market: Market;
  subscriptionId: number;
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

export const handleEventQueueChange = (market: Market) => async (accountInfo: AccountInfo<Buffer>, context: Context) => {
  // retrieve the last event queue sequence number that was tracked from the database
  const timestamp = new Date().toISOString()
  const {error, response} = await getSerumMarketByAddress(market.address.toString())
  if (error) return;
  const { data } = await response.json()
  console.log('****** SERUM MARKETS ', data.serum_markets)
  if (data.serum_markets.length) {
    const indexedMarket = data.serum_markets[0] as IndexedSerumMarket
    let events: Event[] = [];

    // Update the Serum market with the latest seq number
    const header = EVENT_QUEUE_LAYOUT.HEADER.decode(accountInfo.data);
    upsertSerumMarket({...indexedMarket, last_event_seq_num: header.seqNum})

    if (indexedMarket.last_event_seq_num) {
      events = decodeEventsSince(accountInfo.data, indexedMarket.last_event_seq_num)
    } else {
      events = decodeEventQueue(accountInfo.data)
    }
    // map the events to better structure
    const formattedEvents: EventTypes[] = []
    events.forEach(event => {
      const formattedEvent = _mapEventToDataMessage(event, market, timestamp, context.slot)
      if (formattedEvent) {
        formattedEvents.push(formattedEvent) 
      }
    })
    // Submit all events to the DB
    if (formattedEvents.length) {
      submitSerumEvents(formattedEvents)
    }
  }
}

/**
 * Subscribe to active PsyOption Serum markets and index the events from the event queue.
 */
export const subscribeToSerumMarkets = (connection: Connection, serumProgramId: PublicKey) => {
  let activeSubscriptions: Record<string, ActiveSubscription> = {};
  subscribeToActivePsyOptionMarkets({onEvent: async (eventData) => {
    const activePsyOptionMarkets = eventData.data.markets;
    const serumMarketAddresses = activePsyOptionMarkets.map(m => m.serum_market.address);

    // find all addresses that are missing from the latest return and unsubscribe them
    const addressesToUnsub = Object.keys(activeSubscriptions).filter(addr => !serumMarketAddresses.includes(addr))
    if (addressesToUnsub.length) {
      // unsubscribe dead inactive markets
      addressesToUnsub.forEach(address => {
        const subscription = activeSubscriptions[address]
        if (subscription) {
          connection.removeAccountChangeListener(subscription.subscriptionId)
          delete activeSubscriptions[address]
        }
      })
    }

    // Subscribe to new PsyOption serum markets
    const starterPromise = Promise.resolve(null);
    await activePsyOptionMarkets.reduce(async (accumulator, {serum_market}) => {
      await accumulator
      if (!activeSubscriptions[serum_market.address]) {
        // load the Serum market
        const market = await Market.load(connection, new PublicKey(serum_market.address), {}, serumProgramId)
        // subscribe to the serum event queue
        const subscriptionId = connection.onAccountChange(
          new PublicKey(serum_market.event_queue_address),
          handleEventQueueChange(market)
        )
        // process the market initially
        // @ts-ignore: ignore decoded
        const accountInfo = await connection.getAccountInfo(market._decoded.eventQueue)
        await handleEventQueueChange(market)(accountInfo, {slot: null})
        // add market to active subscription
        activeSubscriptions[serum_market.address] = {
          subscriptionId,
          market,
        }
        return wait(1000)
      }
      return starterPromise
    }, starterPromise)
  }})
}
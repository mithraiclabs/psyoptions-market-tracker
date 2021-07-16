import { AccountInfo, Connection, PublicKey } from '@solana/web3.js'
import { OPTION_MARKET_LAYOUT, Market as PsyOptionsMarket } from '@mithraic-labs/psyoptions'
import { addMarketToDatabase, addSerumAddressToPsyOptionsMarket, subscribeToMissingSerumMarkets, upsertSerumMarket } from './graphQLClient';
import { getMintDecimals, _MARKET_STATE_LAYOUT_V2 } from '@mithraic-labs/serum/lib/market'
import { Market as SerumMarket } from '@mithraic-labs/serum'
import { wait } from "./helpers"

const USDCKey = new PublicKey(
  'E6Z6zLzk8MWY3TY8E87mr88FhGowEPJTeMWzkqtL6qkF',
)

const handlePsyOptionsAccountChange = ({accountId, accountInfo, connection, psyOptionsProgramId}: {
  psyOptionsProgramId: PublicKey;
  accountId: PublicKey;
  accountInfo: AccountInfo<Buffer>;
  connection: Connection;
}) => {
  console.log(`Change to account id: ${accountId.toString()}`)
  // decode the PsyOptions market
  const psyOptionsMarket = new PsyOptionsMarket(psyOptionsProgramId, accountId, accountInfo.data);

  if (psyOptionsMarket.marketData.initialized) {
    // upsert the market that changed to the DB
    addMarketToDatabase({ connection, market: psyOptionsMarket, serumQuoteAsset: USDCKey})
  }

}

export const listenForNewPsyOptionsMarkets = ({
  connection,
  psyOptionsProgramId
}: {
  connection: Connection;
  psyOptionsProgramId: PublicKey;
}) => {

  connection.onProgramAccountChange(
    psyOptionsProgramId,
    (keyedAccountInfo, context) => {

      const { accountId, accountInfo } = keyedAccountInfo
      handlePsyOptionsAccountChange({
        accountId,
        accountInfo,
        connection,
        psyOptionsProgramId
      })

    },
    'confirmed',
    [{dataSize: OPTION_MARKET_LAYOUT.span}]
  )
}

export const listenForMissingSerumMarkets = ({
  connection,
  serumProgramId
}: {
  connection: Connection;
  serumProgramId: PublicKey;
}) => {
  
  // make a GraphQL request to get the markets that are missing a serum address
  const marketAddressesMissingSerum = {};
  const consumer = subscribeToMissingSerumMarkets({ onEvent: (eventData) => {
    eventData.data.markets.forEach(m => {
      marketAddressesMissingSerum[m.data.optionMintKey] = m.data.optionMarketKey
    })
  }})

  connection.onProgramAccountChange(
    serumProgramId,
    async (keyedAccountInfo, context) => {
      try {
        const { accountId, accountInfo } = keyedAccountInfo

        // Sometimes the Mint is not found so we must wait.
        // TODO find a better solution
        await wait(500)
        // decode the Serum Market
        const decoded = SerumMarket.getLayout(serumProgramId).decode(accountInfo.data);
        const [baseMintDecimals, quoteMintDecimals] = await Promise.all([
          getMintDecimals(connection, decoded.baseMint),
          getMintDecimals(connection, decoded.quoteMint),
        ]);
        const serumMarket = new SerumMarket(decoded, baseMintDecimals, quoteMintDecimals, {}, serumProgramId)

        // check that the base mint is waiting for a market
        const psymarketMissingSerumAddress = marketAddressesMissingSerum[serumMarket.baseMintAddress.toString()];
        if (psymarketMissingSerumAddress) {
          // if the above is true then update the PsyOptions market in the database and add the Serum Market
          upsertSerumMarket({
            program_id: serumProgramId.toString(),
            address: serumMarket.address.toString(),
            base_mint_address: serumMarket.baseMintAddress.toString(),
            quote_mint_address: serumMarket.quoteMintAddress.toString(),
            // @ts-ignore: Serum Market poor type
            request_queue_address: serumMarket?._decoded?.requestQueue?.toString(),
            // @ts-ignore: Serum Market poor type
            event_queue_address: serumMarket?._decoded?.eventQueue?.toString(),
            // @ts-ignore: Serum Market poor type
            bids_address: serumMarket?._decoded?.bids?.toString(),
            // @ts-ignore: Serum Market poor type
            asks_address: serumMarket?._decoded?.asks?.toString(),
          })
          addSerumAddressToPsyOptionsMarket({address: psymarketMissingSerumAddress, serumAddress: serumMarket.address.toString()})
        }
      } catch(error) {
        console.error(error)
      }
    },
    'confirmed',
    // the bytes are Base58 encoding of `Buffer.from([3, 0,0,0,0,0,0,0])`, which denotes an
    // initialized Serum MarketState account
    [{memcmp: { bytes:  'W723RTUpoZ', offset: _MARKET_STATE_LAYOUT_V2.offsetOf('accountFlags') }}]
  )
}

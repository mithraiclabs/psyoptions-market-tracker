import { AccountInfo, Connection, PublicKey } from '@solana/web3.js'
import { OPTION_MARKET_LAYOUT, Market as PsyOptionsMarket } from '@mithraic-labs/psyoptions'
import { addMarketToDatabase, marketsMissingSerumAddress } from './graphQLClient';

const USDCKey = new PublicKey(
  'E6Z6zLzk8MWY3TY8E87mr88FhGowEPJTeMWzkqtL6qkF',
)

const assetsWaitingForSerumMarkets = [];

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

export const listenForMissingSerumMarkets = async ({
  connection,
  serumProgramId
}: {
  connection: Connection;
  serumProgramId: PublicKey;
}) => {
  // TODO make a GraphQL request to get the markets that are missing a serum address
  const { response } = await marketsMissingSerumAddress()
  if (response) {
    const json = await response.json();
    console.log('*** json response = ', json)
  }

  // connection.onProgramAccountChange(
  //   serumProgramId,
  //   (keyedAccountInfo, context) => {

  //     const { accountId, accountInfo } = keyedAccountInfo
  //     // TODO decode the Serum Market
  //     // TODO check that the base and quote mints are correct and waiting for a market
  //     // TODO if the above is true then update the PsyOptions market in the database and add the Serum Market

  //   },
  //   'confirmed',
  //   [{dataSize: OPTION_MARKET_LAYOUT.span}]
  // )
}
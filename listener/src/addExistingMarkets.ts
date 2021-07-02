import { Connection, PublicKey } from "@solana/web3.js"
import { Market } from "@mithraic-labs/psyoptions"
import { Market as SerumMarket } from "@mithraic-labs/serum"
import { addMarketToDatabase, addSerumAddressToPsyOptionsMarket, getMarkets, marketsMissingSerumAddress, wait } from "./graphQLClient"

const USDCKey = new PublicKey(
  'E6Z6zLzk8MWY3TY8E87mr88FhGowEPJTeMWzkqtL6qkF',
)

export const addExistingMarkets = async ({connection, psyOptionsProgramId, serumProgramId}:{
  connection: Connection;
  psyOptionsProgramId: PublicKey;
  serumProgramId: PublicKey;
}) => {
  let marketsInDatabase = [];
  const {response} = await getMarkets()
  if (response) {
    const {data} = await response.json()
    marketsInDatabase = data.markets
  }

  const existingPubkeys = marketsInDatabase.map( x => x.address )

  const markets = await Market.getAllMarkets(connection, psyOptionsProgramId)
  const newMarkets = markets.filter( ({pubkey}) => !existingPubkeys.includes(pubkey.toString()))

  const starterPromise = Promise.resolve(null);
  await newMarkets.reduce(async (accumulator, currentMarket) => {
    await accumulator
    // avoid rate limiting errors
    await wait(500)
    return addMarketToDatabase({connection, market: currentMarket, serumQuoteAsset: USDCKey})
  }, starterPromise)
  // After we have added all missing PsyOptions markets to the database, we need to 
  // run through the PsyOptions markets that are missing a Serum Market address
  return checkExistingMarketsForSerumMarket({connection, serumProgramId})
}

export const checkExistingMarketsForSerumMarket = async ({connection, serumProgramId}: {
  connection: Connection;
  serumProgramId: PublicKey;
}) => {
  // Query the GraphQL endpoint for PsyOptions markets that have a null 
  // serum_address column
  const {response} = await marketsMissingSerumAddress()

  if (response) {
    const {data} = await response.json()
    const starterPromise = Promise.resolve(null);
    data.markets.reduce(async (accumulator, currentMarket) => {
      await accumulator
      // avoid RPC Node rate limiting errors
      await wait(500)
      return (async () => {
        // TODO I don't think this is working for some reason
        const serumMarketsAccountInfo = await SerumMarket.findAccountsByMints(
          connection,
          new PublicKey(currentMarket.data.optionMintKey),
          USDCKey,
          serumProgramId,
        )[0]

        if (serumMarketsAccountInfo) {
          await addSerumAddressToPsyOptionsMarket({address: currentMarket.data.optionMarketKey, serumAddress: serumMarketsAccountInfo.publicKey.toString()})
        }
      })()
    }, starterPromise)
  }
}

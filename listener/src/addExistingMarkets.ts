import { Connection, PublicKey } from "@solana/web3.js"
import { Market } from "@mithraic-labs/psyoptions"
import { addMarketToDatabase, getMarkets } from "./graphQLClient"

const USDCKey = new PublicKey(
  'E6Z6zLzk8MWY3TY8E87mr88FhGowEPJTeMWzkqtL6qkF',
)

export const addExistingMarkets = async ({connection, psyOptionsProgramId}:{
  connection: Connection;
  psyOptionsProgramId: PublicKey;
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

  console.log('*** newMarkets ', newMarkets.length, newMarkets[0]);

  const starterPromise = Promise.resolve(null);
  await newMarkets.reduce(async (accumulator, currentMarket) => {
    await accumulator
    return addMarketToDatabase({connection, market: currentMarket, serumQuoteAsset: USDCKey})
  }, starterPromise)

}

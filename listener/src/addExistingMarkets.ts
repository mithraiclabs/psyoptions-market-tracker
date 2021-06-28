import { Connection, PublicKey } from "@solana/web3.js"
import { Market } from "@mithraic-labs/psyoptions"
import { Market as SerumMarket } from "@mithraic-labs/serum"
import fetch from "node-fetch"

const USDCKey = new PublicKey(
  'E6Z6zLzk8MWY3TY8E87mr88FhGowEPJTeMWzkqtL6qkF',
)

export const addExistingMarkets = async ({connection, psyOptionsProgramId}:{
  connection: Connection;
  psyOptionsProgramId: PublicKey;
}) => {
  const markets = await Market.getAllMarkets(connection, psyOptionsProgramId)
  console.log('*** markets ', markets.length, markets[0]);

  const starterPromise = Promise.resolve(null);
  await markets.reduce(async (accumulator, currentMarket) => {
    await accumulator
    return addMarketToDatabase({connection, market: currentMarket, serumQuoteAsset: USDCKey})
  }, starterPromise)

}


export const addMarketToDatabase = async ({connection, market, serumQuoteAsset}: {
  connection: Connection;
  market: Market;
  serumQuoteAsset: PublicKey
}) => {
  const serumMarkets = await SerumMarket.findAccountsByMints(
    connection,
    market.marketData.optionMintKey,
    serumQuoteAsset,
    new PublicKey(process.env['DEX_PROGRAM_ID']),
  )
  const body = {
    query: `
    mutation (
      $serum_cluster: serum_clusters_enum
      $serum_address: String
      $expires_at: timestamp
      $data: jsonb
      $quote_asset_mint_address: String
      $underlying_asset_mint_address: String
      $quote_asset_per_contract: numeric
      $underlying_asset_per_contract: numeric
      $address: String
    ) {
      insert_markets_one(
        object: {
          address: $address
          serum_cluster: $serum_cluster
          serum_address: $serum_address
          expires_at: $expires_at
          data: $data
          quote_asset_per_contract: $quote_asset_per_contract
          underlying_asset_per_contract: $underlying_asset_per_contract
          quote_asset: {
            data: {
              mint_address: $quote_asset_mint_address,
            },
            on_conflict: { constraint: assets_pkey, update_columns: mint_address },
          },
          underlying_asset: {
            data: {
              mint_address: $underlying_asset_mint_address,
            },
            on_conflict: { constraint: assets_pkey, update_columns: mint_address },
          }
        }
      ) {
        id
      }
    }
      `,
    variables: {
      address: market.marketData.optionMarketKey.toString(),
      serum_cluster: 'devnet',
      serum_address: serumMarkets[0]?.publicKey.toString(),
      // expiration is the unix timestamp in seconds, JS expects miliseconds
      expires_at: new Date(market.marketData.expiration * 1000).toISOString(),
      data: market.marketData,
      quote_asset_mint_address: market.marketData.quoteAssetMintKey.toString(),
      underlying_asset_mint_address: market.marketData.underlyingAssetMintKey.toString(),
      quote_asset_per_contract: market.marketData.quoteAmountPerContract.toNumber(),
      underlying_asset_per_contract: market.marketData.amountPerContract.toNumber(),
    },
  };

  try {
    await fetch(String(process.env["GRAPHQL_URL"]), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

  } catch (err) {
    console.log('*** error making request to hasura')
    console.error({ err });
  }
}
import { Market } from "@mithraic-labs/psyoptions";
import { Connection, PublicKey } from "@solana/web3.js";
import { Market as SerumMarket } from "@mithraic-labs/serum"
import fetch, { Response } from "node-fetch"

export const wait = (delayMS: number) => new Promise((resolve) => setTimeout(resolve, delayMS))

export const waitUntilServerUp = async () => {
  while(true) {
    try {
      const response = await fetch(String(process.env["GRAPHQL_URL"]), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({query: {}}),
      });
      if (response.status === 200) {
        break
      }
    } catch (error) {
      console.error(error)
    }
    console.log('...GraphQL server not ready, waiting')
    await wait(1000)
  }
  return true
}


const makeRequest = async ({body}: {body: object}): Promise<{
  error?: Error,
  response?: Response
}> => {
  try {
    const response = await fetch(String(process.env["GRAPHQL_URL"]), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    return {response}
  } catch (err) {
    console.log('*** error making request to hasura')
    console.error({ err });
    return {error: err};
  }
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

  makeRequest({body})
}

export const getMarkets = () => {
  const body = {
    query: `
    query {
        markets {
        address
      }
    }
    `
  }

  return makeRequest({body})
}

export const marketsMissingSerumAddress = () => {
  const body = {
    query: `
    query MarketsMissingSerum {
        markets(where: {serum_address: {_is_null: true}}) {
        data
        serum_address
        address
      }
    }
    `
  }

  return makeRequest({body})
}
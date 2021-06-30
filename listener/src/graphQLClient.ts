import { Market } from "@mithraic-labs/psyoptions";
import { Connection, PublicKey } from "@solana/web3.js";
import { Market as SerumMarket } from "@mithraic-labs/serum"
import fetch, { Response } from "node-fetch"
import { execute } from 'apollo-link';
import { WebSocketLink } from 'apollo-link-ws';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import { gql } from 'graphql-tag';

const ws = require('ws');

export const wait = (delayMS: number) => new Promise((resolve) => setTimeout(resolve, delayMS))

const getWsClient = function(wsurl) {
  const client = new SubscriptionClient(
    wsurl, {reconnect: true}, ws
  );
  return client;
};

const createSubscriptionObservable = (wsurl, query, variables) => {
  const link = new WebSocketLink(getWsClient(wsurl));
  return execute(link, {query: query, variables: variables});
};

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
  let data = {};
  Object.keys(market.marketData).forEach(key => {
    const value = market.marketData[key]
    if (value instanceof PublicKey) {
      data[key] = value.toString()
    } else {
      data[key] = value
    }
  })
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
      quote_asset_mint_address: market.marketData.quoteAssetMintKey.toString(),
      underlying_asset_mint_address: market.marketData.underlyingAssetMintKey.toString(),
      quote_asset_per_contract: market.marketData.quoteAmountPerContract.toNumber(),
      underlying_asset_per_contract: market.marketData.amountPerContract.toNumber(),
      data,
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

export const addSerumAddressToPsyOptionsMarket = ({address, serumAddress}: {
  address: string;
  serumAddress: string;
}) => {
  const body = {
    query: `
    mutation UpdateSerumAddress (
      $serum_address: String!
      $address: String!
    ) {
      update_markets (
        where: {address: {_eq: $address} },
        _set: {
          serum_address: $serum_address
        }
      ) {
        affected_rows,
        returning {
          id
        }
      }
    }
    `,
    variables: {
      address: address,
      serum_address: serumAddress,
    },
  }

  return makeRequest({body})
}

type SubscriptionArguments = {
  onEvent: (eventData: any) => void,
  onError?: (error: Error) => void,
}
export const subscribeToMissingSerumMarkets = ({onEvent, onError}: SubscriptionArguments) => {
  const SUBSCRIBE_QUERY = gql`
  subscription MarketsMissingSerum {
      markets(where: {serum_address: {_is_null: true}}) {
      data
      serum_address
      address
    }
  }
  `
  const subscriptionClient = createSubscriptionObservable(
    process.env['GRAPHQL_URL'],
    SUBSCRIBE_QUERY,                                     // Subscription query
    {}                                                   // Query variables
  );
  return subscriptionClient.subscribe(onEvent, (error) => {
    console.error(error)
    if (onError) {
      onError(error)
    }
  })
}

export const subscribeToActivePsyOptionMarkets = ({onEvent, onError}: SubscriptionArguments) => {
  // To be considered active the PsyOptions market must have a Serum address and not be expired
  const SUBSCRIBE_QUERY = gql`
  subscription ActivePsyOptionMarkets {
    markets(where: {serum_address: {_is_null: false}, expires_at: {_gte: "now()"}}) {
      data
      serum_address
    }
  }
  `
  const subscriptionClient = createSubscriptionObservable(
    process.env['GRAPHQL_URL'],
    SUBSCRIBE_QUERY,                                     // Subscription query
    {}                                                   // Query variables
  );
  return subscriptionClient.subscribe(onEvent, (error) => {
    console.error(error)
    if (onError) {
      onError(error)
    }
  })
}

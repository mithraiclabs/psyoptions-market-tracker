import { Market } from "@mithraic-labs/psyoptions";
import { Connection, PublicKey } from "@solana/web3.js";
import { Market as SerumMarket, OpenOrders } from "@mithraic-labs/serum"
import fetch, { Response } from "node-fetch"
import { execute } from 'apollo-link';
import { WebSocketLink } from 'apollo-link-ws';
import { SubscriptionClient } from 'subscriptions-transport-ws';
import { gql } from 'graphql-tag';
import { ActivePsyOptionsMarketsEventData, IndexedSerumMarket } from "./types";
import { EventTypes } from "./events.types";
import { objectKeysCamelToSnake, wait } from "./helpers/helpers";

const ws = require('ws');

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


export const makeRequest = async ({body}: {body: object}): Promise<{
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

/**
 * Add a PsyOptions market to the database
 * 
 * TODO separate the adding PsyOption market and retrieving SerumMarket information
 */
export const addMarketToDatabase = async ({connection, market, serumQuoteAsset}: {
  connection: Connection;
  market: Market;
  serumQuoteAsset: PublicKey
}) => {
  const serumProgramId = new PublicKey(process.env['DEX_PROGRAM_ID'])
  const serumMarkets = await SerumMarket.findAccountsByMints(
    connection,
    market.marketData.optionMintKey,
    serumQuoteAsset,
    serumProgramId,
  )
  let serumMarket: SerumMarket|undefined;
  if (serumMarkets.length) {
    serumMarket = await SerumMarket.load(connection, serumMarkets[0].publicKey, {}, serumProgramId)
  }
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
      $cluster: clusters_enum
      $serum_address: String
      $expires_at: timestamp
      $data: jsonb
      $quote_asset_mint_address: String
      $underlying_asset_mint_address: String
      $quote_asset_per_contract: numeric
      $underlying_asset_per_contract: numeric
      $address: String!
      $serum_program_id: String
      $srm_base_mint_address: String
      $srm_quote_mint_address: String
      $request_queue_address: String
      $event_queue_address: String
      $bids_address: String
      $asks_address: String
    ) {
      insert_markets_one(
        object: {
          address: $address
          cluster: $cluster
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
          },
          ${serumMarket ? `
          serum_market: {
            data: {
              address: $serum_address,
              program_id: $serum_program_id,
              base_mint_address: $srm_base_mint_address,
              quote_mint_address: $srm_quote_mint_address,
              request_queue_address: $request_queue_address,
              event_queue_address: $event_queue_address,
              bids_address: $bids_address,
              asks_address: $asks_address,
            },
            on_conflict: { constraint: serum_markets_pkey, update_columns: [
              program_id, base_mint_address, quote_mint_address, request_queue_address,
              event_queue_address, bids_address, asks_address
            ] },
          },
          `: ''}
        }
      ) {
        id
      }
    }
      `,
    variables: {
      address: market.marketData.optionMarketKey.toString(),
      cluster: 'devnet',
      serum_address: serumMarket?.address?.toString(),
      // expiration is the unix timestamp in seconds, JS expects miliseconds
      expires_at: new Date(market.marketData.expiration * 1000).toISOString(),
      quote_asset_mint_address: market.marketData.quoteAssetMintKey.toString(),
      underlying_asset_mint_address: market.marketData.underlyingAssetMintKey.toString(),
      quote_asset_per_contract: market.marketData.quoteAmountPerContract.toNumber(),
      underlying_asset_per_contract: market.marketData.amountPerContract.toNumber(),
      data,
      serum_program_id: serumProgramId.toString(),
      srm_base_mint_address: serumMarket?.baseMintAddress?.toString(),
      srm_quote_mint_address: serumMarket?.quoteMintAddress?.toString(),
      // @ts-ignore: Serum Market poor type
      request_queue_address: serumMarket?._decoded?.requestQueue?.toString(),
      // @ts-ignore: Serum Market poor type
      event_queue_address: serumMarket?._decoded?.eventQueue?.toString(),
      // @ts-ignore: Serum Market poor type
      bids_address: serumMarket?._decoded?.bids?.toString(),
      // @ts-ignore: Serum Market poor type
      asks_address: serumMarket?._decoded?.asks?.toString(),
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

export const findOpenOrderByAddress = (address: string) => {
  const body = {
    query: `
    query {
      open_order_accounts(where: {address: {_eq: "${address}"}}, limit: 1) {
        address,
      }
    }
    `
  }

  return makeRequest({body})
}

export type MissingOpenOrdersResponse = {
  data: {
    serum_events: {account: string}[]
  }
}
/**
 * Gets all records from serum_events where the joined open_orders_account is missing
 * 
 * @returns 
 */
export const getEventsWithMissingOpenOrders = () => {
  const body = {
    query: `
    query {
      serum_events(where: {_not: {open_order_account: {}}}) {
        account
      }
    }
    `
  }

  return makeRequest({body})
}

export const getSerumMarketByAddress = (address: string) => {
  const body = {
    query: `
    query {
      serum_markets(where: {address: {_eq: "${address}"}}, limit: 1) {
        address,
        program_id,
        base_mint_address,
        quote_mint_address,
        request_queue_address,
        event_queue_address,
        bids_address,
        asks_address,
        last_event_seq_num,
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

export const upsertOpenOrder = async (openOrders: OpenOrders) => {
  const body = {
    query: `
    mutation (
      $address: String!
      $market: String!
      $owner: String!
    ) {
      insert_open_order_accounts (
        objects: [{
          address: $address
          market: $market
          owner: $owner
        }],
        on_conflict: {
          constraint: open_order_accounts_pkey,
          update_columns: [market, owner]
        }
      ) {
        returning {
          owner
        }
      }
    }
      `,
    variables: {
      address: openOrders.address.toString(),
      market: openOrders.market.toString(),
      owner: openOrders.owner.toString(),
    },
  };

  return makeRequest({body})
}

export const upsertSerumMarket = async (serumMarket: IndexedSerumMarket) => {
  const body = {
    query: `
    mutation ($object: serum_markets_insert_input!) {
      insert_serum_markets_one (
        object: $object,
        on_conflict: {
          constraint: serum_markets_pkey,
          update_columns: [last_event_seq_num]
        }
      ) {
          address
      }
    }
      `,
    variables: {
      object: serumMarket
    },
  };

  return makeRequest({body})
}

export const submitSerumEvents = async (events: EventTypes[]) => {
  const objects = events.map(event => objectKeysCamelToSnake(event))
  const body = {
    query: `
    mutation ($objects: [serum_events_insert_input!]!) {
      insert_serum_events(
        objects: $objects
      ) {
        returning {
          serum_market_address
        }
      }
    }
      `,
    variables: { objects },
  };

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

type ActivePsyOptionsMarketSubArgs = {
  onEvent: (eventData: ActivePsyOptionsMarketsEventData) => void,
  onError?: (error: Error) => void,
}

export const subscribeToActivePsyOptionMarkets = ({onEvent, onError}: ActivePsyOptionsMarketSubArgs) => {
  // To be considered active the PsyOptions market must have a Serum address and not be expired
  const SUBSCRIBE_QUERY = gql`
  subscription ActivePsyOptionMarkets {
    markets(where: {serum_address: {_is_null: false}, expires_at: {_gte: "now()"}}, order_by: {id: asc}) {
      serum_market {
        address,
        event_queue_address,
      }
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

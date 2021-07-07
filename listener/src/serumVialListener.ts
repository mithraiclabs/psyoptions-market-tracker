import { OpenOrders } from "@mithraic-labs/serum";
import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs"
import { makeRequest, subscribeToActivePsyOptionMarkets } from "./graphQLClient";
const WebSocket = require("ws")

const getOpenOrderAccount = async (connection: Connection, address: PublicKey, serumProgramId: PublicKey) => {
  return OpenOrders.load(connection, address, serumProgramId);
}

const upsertOpenOrder = async (openOrders: OpenOrders) => {
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

const submitSerumEvent = async (data: any) => {
  const body = {
    query: `
    mutation (
      $account: String
      $account_slot: Int
      $client_id: String
      $data: jsonb
      $fee_tier: Int
      $id: String
      $order_id: String
      $price: numeric
      $serum_address: String!
      $side: side
      $size: numeric
      $slot: bigint
      $timestamp: timestamp
      $type: serum_vial_event_types_enum
      $version: Int
    ) {
      insert_serum_events_one(
        object: {
          account: $account
          account_slot: $account_slot
          client_id: $client_id
          data: $data
          fee_tier: $fee_tier
          id: $id
          order_id: $order_id
          price: $price
          side: $side
          size: $size
          slot: $slot
          timestamp: $timestamp
          type: $type
          version: $version
          serum_market_address: $serum_address
        }
      ) {
        id
      }
    }
      `,
    variables: {
      account: data.account,
      account_slot: data.accountSlot,
      client_id: data.clientId,
      data,
      fee_tier: data.feeTier,
      id: data.id,
      order_id: data.orderId,
      price: data.price,
      serum_address: data.market,
      side: data.side,
      size: data.size,
      slot: data.slot,
      timestamp: data.timestamp,
      type: data.type,
      version: data.version,
    },
  };

  return makeRequest({body})
}

const serumVialListener = (connection: Connection, serumProgramId: PublicKey) => {
  const ws = new WebSocket(
    String(process.env["SERUM_VIAL_URL"])
  );

  ws.on("open", function () {
    const channels = String(process.env["CHANNELS"])
    .split(",")
    .map((c) => c.trim());

    let activeSubscriptions: String[] = [];
    subscribeToActivePsyOptionMarkets({onEvent: (eventData) => {
      const marketAddresses = eventData.data.markets.map(m => m.serum_address);

      // find all addresses that are missing from the latest return and unsubscribe them
      const addressesToUnsub = activeSubscriptions.filter(addr => !marketAddresses.includes(addr))
      channels.forEach((channel) => {
        ws.send(
          JSON.stringify({
            op: "unsubscribe",
            channel,
            markets: addressesToUnsub,
          })
        );
      });

      // Re-subscribe to all active PsyOption serum markets
      // Serum Vial should handle de-duping subscriptions
      channels.forEach((channel) => {
        ws.send(
          JSON.stringify({
            op: "subscribe",
            channel,
            markets: marketAddresses,
          })
        );
      });
      activeSubscriptions = marketAddresses;

    }})
  });
  
  ws.on("message", async function (message: any) {
    const data = JSON.parse(message);
  
    if (!["trade", "open", "change"].includes(data.type)) return;

    submitSerumEvent(data)
    console.log(`** recieved message with account ${data.account}`)
    const openOrders = await getOpenOrderAccount(connection, new PublicKey(data.account), serumProgramId)
    upsertOpenOrder(openOrders)
    
  });
  
  ws.on("error", function (error) {
    console.log('**** websocket error')
    console.error(error)
  })

}

export default serumVialListener;

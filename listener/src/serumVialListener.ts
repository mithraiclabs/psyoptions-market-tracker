import * as fs from "fs"
import { subscribeToActivePsyOptionMarkets } from "./graphQLClient";
const WebSocket = require("ws")

const serumVialListener = () => {
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
        $serum_address: String
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
            market: {
              data: { serum_address: $serum_address }
              on_conflict: { constraint: markets_serum_address_key, update_columns: serum_address }
            }
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
  });
  
  ws.on("error", function (error) {
    console.log('**** websocket error')
    console.error(error)
  })

}

export default serumVialListener;

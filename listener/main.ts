import type { WebSocketClient } from "./deps.ts";
import { StandardWebSocketClient } from "./deps.ts";

console.log('*** ENV vars', Deno.env.get("SERUM_VIAL_URL"), Deno.env.get("GRAPHQL_URL"))

const ws: WebSocketClient = new StandardWebSocketClient(
  String(Deno.env.get("SERUM_VIAL_URL"))
);

ws.on("open", function () {
  console.log('Websocket opened')
  const markets: Array<{
    address: string;
    deprecated: boolean;
    name: string;
    programId: string;
  }> = JSON.parse(Deno.readTextFileSync("./markets.json"));

  String(Deno.env.get("CHANNELS"))
    .split(",")
    .map((c) => c.trim())
    .forEach((channel) => {
      ws.send(
        JSON.stringify({
          op: "subscribe",
          channel,
          markets: markets.map((m) => m.name),
        })
      );
    });
});

ws.on("message", async function (message: any) {
  const data = JSON.parse(message.data);
  console.log('*** new message', data)

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
    await fetch(String(Deno.env.get("GRAPHQL_URL")), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    console.log(data);
  } catch (err) {
    console.error({ err });
  }
});

ws.on("error", function (error) {
  console.log('**** websocket error')
  console.error(error)
})
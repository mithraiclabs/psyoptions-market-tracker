import type { WebSocketClient } from "./deps.ts";
import { StandardWebSocketClient } from "./deps.ts";

const ws: WebSocketClient = new StandardWebSocketClient(
  String(Deno.env.get("SERUM_VIAL_URL"))
);

ws.on("open", function () {
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
  const { market, slot, timestamp, type, version, ...data } = JSON.parse(
    message.data
  );

  // don't bother saving useless data

  if (type === "recent_trades" && data.trades.length === 0) return;
  if (Object.keys(data).length === 0) return;
  if (
    data.asks &&
    data.bids &&
    data.asks.length === 0 &&
    data.bids.length === 0
  )
    return;

  await fetch(String(Deno.env.get("GRAPHQL_URL")), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
          mutation InsertEvent(
            $data: jsonb,
            $serum_market_id: String,
            $slot: bigint,
            $timestamp: timestamptz,
            $type: serum_vial_event_types_enum,
            $version: Int
          ) {
            insert_serum_vial_events_one(object: {
              data: $data,
              serum_market_id: $serum_market_id,
              slot: $slot,
              timestamp: $timestamp,
              type: $type,
              version: $version
            }) {
              timestamp
            }
          }
        `,
      variables: {
        data,
        serum_market_id: market,
        slot,
        timestamp,
        type,
        version,
      },
    }),
  });

  console.log({ timestamp, data });
});

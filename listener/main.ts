import type { WebSocketClient } from "./deps.ts";
import { StandardWebSocketClient } from "./deps.ts";

const ws: WebSocketClient = new StandardWebSocketClient(
  String(Deno.env.get("SERUM_VIAL_URL"))
);

ws.on("open", function () {
  // https://github.com/tardis-dev/serum-vial#supported-channels--corresponding-message-types
  const channels = [
    "trades", // unused?
    "level1", // for 'quote'
    "level2", // for 'l2update'
    "level3", // for 'open' and 'done'
  ];

  const markets: Array<{
    address: string;
    deprecated: boolean;
    name: string;
    programId: string;
  }> = JSON.parse(Deno.readTextFileSync("./markets.json"));

  channels.forEach((channel) => {
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
  const { timestamp, ...data } = JSON.parse(message.data);

  await fetch(String(Deno.env.get("GRAPHQL_URL")), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
          mutation InsertEvent($data: jsonb, $timestamp: timestamptz) {
            insert_serum_vial_events_one(object: {data: $data, timestamp: $timestamp}) {
              timestamp
            }
          }
        `,
      variables: {
        data,
        timestamp,
      },
    }),
  });

  console.log({ timestamp, data });
});

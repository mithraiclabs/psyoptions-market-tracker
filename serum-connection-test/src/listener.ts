import axios from "axios";
import WebSocket from "ws";
import markets from "./data/markets.json";

const ws = new WebSocket("ws://localhost:8000/v1/ws");

ws.onmessage = async (message) => {
  try {
    const { timestamp, ...data } = JSON.parse(message.data);

    await axios.post("http://localhost:8080/v1/graphql", {
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
    });

    console.log({ timestamp, data });
  } catch (err) {
    console.error({ err });
  }
};

ws.onopen = () => {
  // https://github.com/tardis-dev/serum-vial#supported-channels--corresponding-message-types
  const channels = [
    "trades", // unused?
    "level1", // for 'quote'
    "level2", // for 'l2update'
    "level3", // for 'open' and 'done'
  ];

  channels.forEach((channel) => {
    const subscribeTrades = {
      op: "subscribe",
      channel,
      markets: markets.map((m) => m.name),
    };

    ws.send(JSON.stringify(subscribeTrades));
  });
};

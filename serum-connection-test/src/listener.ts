import WebSocket from "ws";
import markets from "./data/markets.json";

const ws = new WebSocket("ws://localhost:8000/v1/ws");

ws.onmessage = (message) => {
  console.log(JSON.parse(message.data));
};

ws.onopen = () => {
  // https://github.com/tardis-dev/serum-vial#supported-channels--corresponding-message-types
  const channels = [
    // "trades",
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

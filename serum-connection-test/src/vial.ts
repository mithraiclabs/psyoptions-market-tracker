import WebSocket from "ws";
import markets from "./markets.json";

const ws = new WebSocket("ws://localhost:8000/v1/ws");

ws.onmessage = (message) => {
  console.log(JSON.parse(message.data));
};

ws.onopen = () => {
  const subscribeTrades = {
    op: "subscribe",
    channel: "trades",
    markets: markets.map((m) => m.name),
  };

  ws.send(JSON.stringify(subscribeTrades));
};

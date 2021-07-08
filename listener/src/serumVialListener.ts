import { OpenOrders } from "@mithraic-labs/serum";
import { Connection, PublicKey } from "@solana/web3.js";
import { submitSerumEvent, subscribeToActivePsyOptionMarkets, upsertOpenOrder } from "./graphQLClient";
const WebSocket = require("ws")

const getOpenOrderAccount = async (connection: Connection, address: PublicKey, serumProgramId: PublicKey) => {
  return OpenOrders.load(connection, address, serumProgramId);
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
      // TODO handle potential delay when SerumVial says the market is not available to subscribe
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
    const openOrders = await getOpenOrderAccount(connection, new PublicKey(data.account), serumProgramId)
    upsertOpenOrder(openOrders)
    
  });
  
  ws.on("error", function (error) {
    console.log('**** websocket error')
    console.error(error)
  })

}

export default serumVialListener;

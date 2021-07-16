import { OpenOrders } from "@mithraic-labs/serum";
import { Connection, PublicKey } from "@solana/web3.js";
import { subscribeToActivePsyOptionMarkets, upsertOpenOrder, wait } from "./graphQLClient";
import WebSocket = require("ws")

const getOpenOrderAccount = async (connection: Connection, address: PublicKey, serumProgramId: PublicKey, attempt = 0) => {
  try {
    if (attempt >= 0) {
      const delay = attempt**2 * 250;
      await wait(delay)
    }
    return await OpenOrders.load(connection, address, serumProgramId)
  } catch (error) {
    console.log('Caught error in getOpenOrderAccount')
    console.error(error)
    if (attempt < 10) {
      return getOpenOrderAccount(connection, address, serumProgramId, attempt + 1)
    }
    return null;
  }
}

let attempt = 1;
const reconnectInterval = () => {
  attempt += 1
  return attempt**2 * 100
}
const serumVialListener = (connection: Connection, serumProgramId: PublicKey) => {
  const ws = new WebSocket(
    String(process.env["SERUM_VIAL_URL"])
  );

  ws.on("close", () => {
    console.log('*** websocket closed')
    setTimeout(() => serumVialListener(connection, serumProgramId), reconnectInterval())
  })

  ws.on("open", function () {
    // reset the number of attempts
    attempt = 1;
    const channels = String(process.env["CHANNELS"])
    .split(",")
    .map((c) => c.trim());

    let activeSubscriptions: string[] = [];
    subscribeToActivePsyOptionMarkets({onEvent: (eventData) => {
      // When SerumVial receives an update to Active PsyOptions markets the Serum producers could 
      // take a while to spin up since they are handled sequentially with a delay to avoid rate limits.
      //
      // TODO handle potential delay when SerumVial says the market is not available to subscribe
      const marketAddresses = eventData.data.markets.map(m => m.serum_market.address);

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

    // submitSerumEvent(data)
    const openOrders = await getOpenOrderAccount(connection, new PublicKey(data.account), serumProgramId)
    upsertOpenOrder(openOrders)
    
  });
  
  ws.on("error", function (error) {
    console.log('**** websocket error')
    console.error(error)
  })

}

export default serumVialListener;

import { Market } from "@project-serum/serum";
import { Connection, PublicKey } from "@solana/web3.js";
import data from "./data/devnet_beta_market_data.json";
import { sortData } from "./utils";
// import notifier from "node-notifier";

const connection = new Connection(process.env.RPC_URL);
const dexProgramId = new PublicKey(process.env.DEX_PROGRAM_ID);

const seenOrderIds = new Set<string>();

async function go() {
  console.log(new Date().toLocaleString());

  // sort data into calls and put arrays sorted in ascending order
  const { calls, puts } = sortData(data);

  for (const market of [...calls, ...puts]) {
    const { serumMarketAddress } = market;

    const marketAddress = new PublicKey(serumMarketAddress);

    try {
      const market = await Market.load(
        connection,
        marketAddress,
        undefined,
        dexProgramId
      );
      const fills = await market.loadFills(connection);

      // TODO: check that fills are ordered newest>oldest
      for (let i = 0; i < fills.length; i++) {
        const fill = fills[i];
        const id = fill.orderId.toString();

        if (seenOrderIds.has(id)) break;
        seenOrderIds.add(id);

        // this is a new fill, push it out to DB

        console.log(JSON.stringify(fill, null, 2));
      }
    } catch (err) {
      console.error({ error: err });
    }
  }

  // check for new trades every 20 - 60 seconds
  setTimeout(go, Math.max(20, Math.random() * 60) * 1000);
}

go();

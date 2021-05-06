import { Market } from "@project-serum/serum";
import { Connection, PublicKey } from "@solana/web3.js";
import notifier from "node-notifier";
import data from "./data/devnet_beta_market_data.json";
import { sortData } from "./utils";

const connection = new Connection(process.env.RPC_URL);
const dexProgramId = new PublicKey(process.env.DEX_PROGRAM_ID);

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
      let fills = await market.loadFills(connection);

      if (fills.length > 0) {
        notifier.notify({
          title: serumMarketAddress,
          message: JSON.stringify(fills),
        });
      }
    } catch (err) {
      console.error({ error: err });
    }
  }

  // check for new trades every 20 - 60 seconds
  setTimeout(go, Math.max(20, Math.random() * 60) * 1000);
}

go();

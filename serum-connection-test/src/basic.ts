import { Market } from "@project-serum/serum";
import { Connection, PublicKey } from "@solana/web3.js";
import notifier from "node-notifier";
import data from "./data/devnet_beta_market_data.json";
import { sortData } from "./utils";

const connection = new Connection(process.env.RPC_URL);
const programId = new PublicKey(process.env.PROGRAM_ID);
const dexProgramId = new PublicKey(process.env.DEX_PROGRAM_ID);

async function go() {
  console.log(new Date().toLocaleString());

  // sort data into calls and put arrays sorted in ascending order
  const { calls, puts } = sortData(data);

  for (const market of [...calls, ...puts]) {
    const {
      quoteAssetPerContract,
      quoteAssetSymbol,
      serumMarketAddress,
      underlyingAssetPerContract,
      underlyingAssetSymbol,
    } = market;

    const marketAddress = new PublicKey(serumMarketAddress);
    // const marketAddress = new PublicKey(market.optionMarketAddress);

    try {
      // attempt to connect to the serum market
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

        console.log(
          [
            `${underlyingAssetPerContract} ${underlyingAssetSymbol}`,
            `${quoteAssetPerContract} ${quoteAssetSymbol}`,
          ].join(" : "),
          fills
        );
      }
    } catch (err) {
      console.error({ error: err });
    }
  }
  setTimeout(go, 60000);
}

go();

import { Market } from "@project-serum/serum";
import { Connection, PublicKey } from "@solana/web3.js";
import data from "./data/devnet_beta_market_data.json";
import { sortData } from "./utils";

const connection = new Connection(process.env.RPC_URL);
const programId = new PublicKey(process.env.DEX_PROGRAM_ID);

(async function () {
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

    console.log(
      [
        `${underlyingAssetPerContract} ${underlyingAssetSymbol}`,
        `${quoteAssetPerContract} ${quoteAssetSymbol}`,
      ].join(" : ")
    );

    try {
      // attempt to connect to the serum market
      await Market.load(connection, marketAddress, undefined, programId);
      console.log("connection successful");
    } catch (err) {
      console.error({ error: err });
    }
  }
})();

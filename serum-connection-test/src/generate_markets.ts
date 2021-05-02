import { writeFileSync } from "fs";
import data from "./data/devnet_beta_market_data.json";
import { sortData } from "./utils";

interface Market {
  address: string;
  deprecated: boolean;
  name: string;
  programId: string;
}

const { calls, puts } = sortData(data);

const markets: Array<Market> = [...calls, ...puts].map((market) => ({
  address: market.serumMarketAddress,
  deprecated: false,
  name: [
    `${market.underlyingAssetPerContract / 10 ** 9} ${
      market.underlyingAssetSymbol
    }`,
    `${market.quoteAssetPerContract / 10 ** 9} ${market.quoteAssetSymbol}`,
  ].join(" : "),
  programId: process.env.DEX_PROGRAM_ID,
}));

writeFileSync(
  `${__dirname}/data/markets.json`,
  JSON.stringify(markets, null, 2)
);

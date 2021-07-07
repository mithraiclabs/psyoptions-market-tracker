const { writeFileSync } = require("fs");
const data = require("../marketMeta.json");

// assets {
//   mint_address
//   symbol
// }

// clusters {
//   devnet
// }

// markets {
//   id
//   cluster: devnet
//   serum_address
//   expires_at: 2020-01
//   quote_asset {
//     mint_address
//     symbol
//   }
//   underlying_asset: {
//     mint_address
//     symbol
//   }
//   data: {
//     option_market_address
//     option_contract_mint_address
//     option_write_token_mint_address
//     quote_asset_per_contract
//     underlying_asset_per_contract
//   }
// }

const objects = data.map((market, i) => {
  const {
    serumMarketAddress,
    quoteAssetMint,
    quoteAssetSymbol,
    underlyingAssetMint,
    underlyingAssetSymbol,
    quoteAssetPerContract,
    underlyingAssetPerContract,
  } = market;

  // id: i + 1,
  return `{
    cluster: devnet,
    serum_address: "${serumMarketAddress}",
    expires_at: "${new Date(market.expiration * 1000).toISOString()}",
    quote_asset: {
      data: {
        symbol: "${quoteAssetSymbol}",
        mint_address: "${quoteAssetMint}",
      },
      on_conflict: { constraint: assets_pkey, update_columns: mint_address },
    },
    underlying_asset: {
      data: {
        symbol: "${underlyingAssetSymbol}",
        mint_address: "${underlyingAssetMint}",
      },
      on_conflict: { constraint: assets_pkey, update_columns: mint_address },
    },
    quote_asset_per_contract: ${Number(quoteAssetPerContract) / 10 ** 9},
    underlying_asset_per_contract: ${
      Number(underlyingAssetPerContract) / 10 ** 9
    },
    data: ${JSON.stringify(market).replace(/"([^"]+)":/g, "$1:")}
  }`;
});

writeFileSync(
  "./mutation.gql",
  `
mutation CreateMarkets {
  insert_markets(
    objects: [${objects}],
    on_conflict: { constraint: markets_serum_address_key, update_columns: data }
  ) {
    returning {
      id
    }
  }
}
`
);

writeFileSync(
  "markets.json",
  JSON.stringify(
    data.map((market) => ({
      address: market.serumMarketAddress,
      deprecated: false,
      name: market.serumMarketAddress,
      programId: "DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY",
    })),
    null,
    2
  )
);

console.info(`
markets files regenerated!

1. copy the contents of mutation.gql and paste in hasura console
2. restart docker-compose so that serum-vial tracks the new markets.json
`);

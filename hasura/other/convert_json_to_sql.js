const rows = require("./devnet_beta_market_data.json").map((market) => {
  return {
    id: market.serumMarketAddress,
    expires_at: new Date(market.expiration * 1000).toISOString(),
    data: market,
  };
});

require("fs").writeFileSync(
  "../seeds/1620470005989_serum_markets.sql",
  `
INSERT INTO serum_markets
SELECT * FROM json_populate_recordset (NULL::serum_markets,
  '${JSON.stringify(rows, null, 2)}');
`
);

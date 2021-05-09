export const formatMarketName = (market: any) =>
  [
    market.quote_asset_per_contract,
    market.quote_asset.symbol,
    "/",
    market.underlying_asset_per_contract,
    market.underlying_asset.symbol,
  ].join(" ");

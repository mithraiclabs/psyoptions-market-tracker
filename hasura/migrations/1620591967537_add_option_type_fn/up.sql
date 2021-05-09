CREATE OR REPLACE FUNCTION option_type(market_row markets)
RETURNS TEXT AS $$
  select CASE WHEN assets.symbol = 'USDC' THEN 'call' ELSE 'put' END AS option_type FROM markets INNER JOIN assets ON assets.mint_address = market_row.quote_asset_mint_address LIMIT 1;
$$ LANGUAGE sql STABLE;

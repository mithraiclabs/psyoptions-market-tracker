CREATE FUNCTION latest_price(market_row serum_markets)
RETURNS NUMERIC AS $$
  select price
  from serum_events
  where serum_events.serum_market_address = market_row.address and serum_events.type = 'trade' ORDER BY serum_events.timestamp desc LIMIT 1
$$ LANGUAGE sql STABLE;

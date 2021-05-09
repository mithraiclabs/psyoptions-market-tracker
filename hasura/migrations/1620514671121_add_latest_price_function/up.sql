CREATE FUNCTION latest_price(market_row markets)
RETURNS NUMERIC AS $$
  select price
  from serum_events
  where serum_events.market_id = market_row.id and serum_events.type = 'trade' ORDER BY serum_events.timestamp desc LIMIT 1
$$ LANGUAGE sql STABLE;

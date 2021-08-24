DROP FUNCTION IF EXISTS volume(market_row serum_markets, duration text);

CREATE FUNCTION volume(market_row serum_markets)
RETURNS NUMERIC AS $$
  SELECT SUM(serum_events.size) FROM serum_events
  WHERE serum_events.serum_market_address = market_row.address AND serum_events.type = 'trade'
$$ LANGUAGE sql STABLE;

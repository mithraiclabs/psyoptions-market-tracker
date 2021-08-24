DROP FUNCTION IF EXISTS volume(market_row serum_markets);

CREATE FUNCTION volume(market_row serum_markets, duration text = '24 hours')
RETURNS NUMERIC AS $$
  SELECT SUM(serum_events.size) FROM serum_events
  WHERE serum_events.serum_market_address = market_row.address AND serum_events.type = 'trade' AND timestamp > now() - duration::interval
$$ LANGUAGE sql STABLE;

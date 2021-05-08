CREATE FUNCTION volume(market_row markets)
RETURNS NUMERIC AS $$
  SELECT SUM(serum_events.price * serum_events.size) FROM serum_events
  WHERE serum_events.market_id = market_row.id AND serum_events.type = 'trade'
$$ LANGUAGE sql STABLE;

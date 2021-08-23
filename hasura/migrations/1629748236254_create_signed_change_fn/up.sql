CREATE FUNCTION signed_change(market_row serum_markets, duration text = '24 hours', percentage boolean = true)
RETURNS NUMERIC AS $$
  select
  CASE WHEN percentage THEN
    sign(price - (select price from serum_events where timestamp < now() - duration::interval and serum_events.type = 'trade' ORDER BY serum_events.timestamp desc LIMIT 1)) * (price/(select price from serum_events where timestamp < now() - duration::interval and serum_events.type = 'trade' ORDER BY serum_events.timestamp desc LIMIT 1) * 100)
  ELSE
    (price - (select price from serum_events where timestamp < now() - duration::interval and serum_events.type = 'trade' ORDER BY serum_events.timestamp desc LIMIT 1))
  END
  from serum_events
  where serum_events.serum_market_address = market_row.address and serum_events.type = 'trade' ORDER BY serum_events.timestamp desc LIMIT 1
$$ LANGUAGE sql STABLE;

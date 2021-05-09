CREATE FUNCTION change(market_row markets, duration text = '24 hours', percentage boolean = true)
RETURNS NUMERIC AS $$
  select
  CASE WHEN percentage THEN
    (price/(select price from serum_events where timestamp < now() - '1 hour'::interval and serum_events.type = 'trade' ORDER BY serum_events.timestamp desc LIMIT 1) * 100)
  ELSE
    (price - (select price from serum_events where timestamp < now() - duration::interval and serum_events.type = 'trade' ORDER BY serum_events.timestamp desc LIMIT 1))
  END
  from serum_events
  where serum_events.market_id = market_row.id and serum_events.type = 'trade' ORDER BY serum_events.timestamp desc LIMIT 1
$$ LANGUAGE sql STABLE;

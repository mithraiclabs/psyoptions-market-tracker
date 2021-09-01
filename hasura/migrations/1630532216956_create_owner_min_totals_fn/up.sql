CREATE FUNCTION owner_min_totals(min_value NUMERIC = 0)
RETURNS SETOF owner_totals  AS $$
  SELECT 
    open_order_accounts.owner,
    SUM(total_value)
  FROM serum_events
  INNER JOIN open_order_accounts ON open_order_accounts.address = serum_events.account
  WHERE serum_events.type = 'fill'
  GROUP BY open_order_accounts.owner
  HAVING SUM(total_value) > min_value;
$$ LANGUAGE sql STABLE;

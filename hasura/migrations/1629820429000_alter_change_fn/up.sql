CREATE OR REPLACE FUNCTION public.change(market_row serum_markets, duration text DEFAULT '24 hours'::text, percentage boolean DEFAULT true)
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
  select
  CASE WHEN percentage THEN
      ((price - (select price from serum_events where serum_events.serum_market_address = market_row.address and timestamp < now() - duration::interval and serum_events.type = 'trade' ORDER BY serum_events.timestamp desc LIMIT 1))/(select price from serum_events where serum_events.serum_market_address = market_row.address and timestamp < now() - duration::interval and serum_events.type = 'trade' ORDER BY serum_events.timestamp desc LIMIT 1)) * 100
  ELSE
    (price - (select price from serum_events where serum_events.serum_market_address = market_row.address and timestamp < now() - duration::interval and serum_events.type = 'trade' ORDER BY serum_events.timestamp desc LIMIT 1))
  END
  from serum_events
  where serum_events.serum_market_address = market_row.address and serum_events.type = 'trade' ORDER BY serum_events.timestamp desc LIMIT 1
$function$;

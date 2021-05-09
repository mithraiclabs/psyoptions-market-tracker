CREATE OR REPLACE FUNCTION public.change(market_row markets, duration text DEFAULT '24 hours'::text, percentage boolean DEFAULT true)
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
  select
  CASE WHEN percentage THEN
    (price / (select price from serum_events where serum_events.market_id = market_row.id and timestamp < now() - duration::interval and serum_events.type = 'trade' ORDER BY serum_events.timestamp desc LIMIT 1) * 100)
  ELSE
    (price - (select price from serum_events where serum_events.market_id = market_row.id and timestamp < now() - duration::interval and serum_events.type = 'trade' ORDER BY serum_events.timestamp desc LIMIT 1))
  END
  from serum_events
  where serum_events.market_id = market_row.id and serum_events.type = 'trade' ORDER BY serum_events.timestamp desc LIMIT 1
$function$;

alter table "public"."serum_vial_events"
           add constraint "serum_vial_events_serum_market_id_fkey"
           foreign key ("serum_market_id")
           references "public"."serum_markets"
           ("id") on update restrict on delete restrict;

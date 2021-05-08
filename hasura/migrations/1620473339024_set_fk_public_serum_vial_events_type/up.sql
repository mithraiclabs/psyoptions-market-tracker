alter table "public"."serum_vial_events"
           add constraint "serum_vial_events_type_fkey"
           foreign key ("type")
           references "public"."serum_vial_event_types"
           ("value") on update restrict on delete restrict;

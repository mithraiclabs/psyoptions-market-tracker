ALTER TABLE "public"."serum_events" 
ADD COLUMN "total_value" numeric GENERATED ALWAYS AS (size * price) STORED;

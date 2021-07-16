CREATE TABLE "public"."serum_markets"(
  "address" text NOT NULL UNIQUE,
  "program_id" text NOT NULL,
  "base_mint_address" text NOT NULL,
  "quote_mint_address" text NOT NULL,
  "request_queue_address" text NOT NULL,
  "event_queue_address" text NOT NULL,
  "bids_address" text NOT NULL,
  "asks_address" text NOT NULL,
  "last_event_seq_num" numeric,
  PRIMARY KEY ("address") 
);

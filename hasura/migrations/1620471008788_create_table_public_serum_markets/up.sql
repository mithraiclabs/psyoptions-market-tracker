CREATE TABLE "public"."serum_markets"(
  "address" text NOT NULL UNIQUE,
  "program_id" text NOT NULL,
  "base_mint_address" text NOT NULL,
  "quote_mint_address" text NOT NULL,
  PRIMARY KEY ("address") 
);

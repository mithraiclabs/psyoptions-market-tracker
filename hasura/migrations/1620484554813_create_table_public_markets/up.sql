CREATE TABLE "public"."markets" (
  "id" serial NOT NULL,
  "address" text NOT NULL,
  "cluster" text NULL,
  "serum_address" text NULL,
  "expires_at" timestamp NULL,
  "data" jsonb NULL,
  "quote_asset_mint_address" text NULL,
  "underlying_asset_mint_address" text NULL,
  "quote_asset_per_contract" numeric NULL,
  "underlying_asset_per_contract" numeric NULL,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("quote_asset_mint_address") REFERENCES "public"."assets"("mint_address") ON UPDATE restrict ON DELETE restrict,
  FOREIGN KEY ("cluster") REFERENCES "public"."clusters"("value") ON UPDATE restrict ON DELETE restrict,
  FOREIGN KEY ("underlying_asset_mint_address") REFERENCES "public"."assets"("mint_address") ON UPDATE restrict ON DELETE restrict,
  UNIQUE ("serum_address"),
  UNIQUE ("address")
);

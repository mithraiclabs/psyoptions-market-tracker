CREATE TABLE "public"."markets"("id" serial NOT NULL, "serum_cluster" text NOT NULL, "serum_address" text NOT NULL, "expires_at" timestamp NOT NULL, "data" jsonb NOT NULL, "quote_asset_mint_address" text NOT NULL, "underlying_asset_mint_address" text NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("quote_asset_mint_address") REFERENCES "public"."assets"("mint_address") ON UPDATE restrict ON DELETE restrict, FOREIGN KEY ("serum_cluster") REFERENCES "public"."serum_clusters"("value") ON UPDATE restrict ON DELETE restrict, FOREIGN KEY ("underlying_asset_mint_address") REFERENCES "public"."assets"("mint_address") ON UPDATE restrict ON DELETE restrict, UNIQUE ("serum_address"));
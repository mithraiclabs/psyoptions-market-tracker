ALTER TABLE "public"."markets" 
DROP COLUMN "address";
ALTER TABLE "public"."markets"
ALTER COLUMN "serum_address" NOT NULL;

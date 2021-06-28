ALTER TABLE "public"."markets"
ADD COLUMN address TEXT NOT NULL UNIQUE;
ALTER TABLE "public"."markets"
ALTER COLUMN "serum_address" DROP NOT NULL;

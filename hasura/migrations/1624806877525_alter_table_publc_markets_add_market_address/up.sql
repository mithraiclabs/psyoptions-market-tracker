ALTER TABLE "public"."markets"
ADD COLUMN address TEXT NOT NULL ;
CREATE UNIQUE INDEX idx_markets_address
ON markets(address);

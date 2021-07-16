

export type IndexedSerumMarket = {
  address: string;
  program_id: string;
  base_mint_address: string;
  quote_mint_address: string;
  request_queue_address: string;
  event_queue_address: string;
  bids_address: string;
  asks_address: string;
  last_event_seq_num?: number;
}

type IndexedPsyOptionsMarket = {

}
type PsyOptionsMarketData = {
  bumpSeed: number;
  expiration: number;
  mintFeeKey: string;
  initialized: string;
  optionMintKey: string;
  exerciseFeeKey: string;
  optionMarketKey: string;
  amountPerContract: string;
  quoteAssetMintKey: string;
  quoteAssetPoolKey: string;
  writerTokenMintKey: string;
  quoteAmountPerContract: string;
  underlyingAssetMintKey: string;
  underlyingAssetPoolKey: string;
}

export type ActivePsyOptionsMarketsEventData = {
  data: {
    markets: {
      data: PsyOptionsMarketData;
      serum_market: {
        address: string;
        event_queue_address: string;
      };
    }[]
  }
}
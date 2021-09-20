import { Connection, clusterApiUrl } from "@solana/web3.js";
import { MarketMeta } from "@mithraic-labs/market-meta";
// TODO: Connect with Solana and load all underlying and quote asset pool accounts
// TODO: Correlate the pool mints with the real world assets
// TODO: Pull the asset prices for the assets and calculate TVL

// Establish new connection with mainnet
const connection = new Connection(clusterApiUrl('mainnet-beta'))


const groupBy = (arr: any[], key: string) => {
  const initialValue = {};
  return arr.reduce((acc, cval) => {
    const myAttribute = cval[key];
    acc[myAttribute] = [...(acc[myAttribute] || []), cval]
    return acc;
  }, initialValue);
};

/**
 * {
 *  ETH_MINT: 1230,
 *  BTC_MINT: 1234 
 * }
 */
export const getUnderlyingAndQuoteCountsByMint = () => {
  const ans = groupBy(MarketMeta.mainnet.optionMarkets, 'underlyingAssetMint')
  console.log('**', ans)
}

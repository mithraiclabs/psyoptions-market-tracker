import { waitUntilServerUp } from "./graphQLClient"
import { Connection } from "@solana/web3.js";
import { subscribeToPackagedSerumMarkets } from "./serumListener";
import { MarketMeta } from "@mithraic-labs/market-meta"
import { ClusterEnv } from "@mithraic-labs/market-meta/dist/types";
import * as fs from 'fs'

const connection = new Connection(process.env['RPC_URL']);
const solanaCluster = process.env['SOLANA_CLUSTER'];


(async () => {
  console.log('Starting listener')
  // wait until hasura has started
  await waitUntilServerUp()

  let marketMeta: ClusterEnv;
  if (solanaCluster === 'devnet') {
    marketMeta = MarketMeta.devnet
  } else if (solanaCluster === 'testnet') {
    marketMeta = MarketMeta.testnet
  } else if (solanaCluster === 'mainnet') {
    marketMeta = MarketMeta.mainnet
  } else if (solanaCluster === 'localnet') {
    marketMeta = JSON.parse(fs.readFileSync('/app/marketMeta.json') as unknown as string) as ClusterEnv
  } else {
    throw new Error(`Unknown SOLANA_CLUSTER ${solanaCluster}`)
  }
  subscribeToPackagedSerumMarkets(connection, marketMeta)
})();



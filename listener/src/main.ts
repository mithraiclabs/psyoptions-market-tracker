import { addExistingMarkets, addMissingOpenOrders } from "./addExistingMarkets"
import { 
  listenForNewPsyOptionsMarkets,
  listenForMissingSerumMarkets, 
} from "./newMarketListener"
import { waitUntilServerUp } from "./graphQLClient"
import { Connection, PublicKey } from "@solana/web3.js";
import { subscribeToSerumMarkets } from "./serumListener";

const connection = new Connection(process.env['RPC_URL']);
const psyOptionsProgramId = new PublicKey(process.env['PROGRAM_ID']);
const serumProgramId = new PublicKey(process.env['DEX_PROGRAM_ID']);


(async () => {
  // wait until hasura has started
  await waitUntilServerUp()

  listenForNewPsyOptionsMarkets({connection, psyOptionsProgramId})
  listenForMissingSerumMarkets({connection, serumProgramId})

  await Promise.all([
    addMissingOpenOrders(connection, serumProgramId),
    addExistingMarkets({connection, psyOptionsProgramId, serumProgramId})
  ])

  subscribeToSerumMarkets(connection, serumProgramId)
})();



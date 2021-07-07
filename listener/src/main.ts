import serumVialListener from "./serumVialListener"
import { addExistingMarkets } from "./addExistingMarkets"
import { 
  listenForNewPsyOptionsMarkets,
  listenForMissingSerumMarkets, 
} from "./newMarketListener"
import { wait, waitUntilServerUp } from "./graphQLClient"
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection(process.env['RPC_URL']);
const psyOptionsProgramId = new PublicKey(process.env['PROGRAM_ID']);
const serumProgramId = new PublicKey(process.env['DEX_PROGRAM_ID']);


(async () => {
  // wait until hasura has started
  await waitUntilServerUp()
  // TODO fix this wait, it has to do with SerumVial's server not ready to accept connections
  await wait(5000)

  serumVialListener(connection, serumProgramId);
  addExistingMarkets({connection, psyOptionsProgramId, serumProgramId});
  listenForNewPsyOptionsMarkets({connection, psyOptionsProgramId})
  listenForMissingSerumMarkets({connection, serumProgramId})
})();



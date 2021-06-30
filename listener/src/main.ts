import serumVialListener from "./serumVialListener"
import { addExistingMarkets } from "./addExistingMarkets"
import { 
  listenForNewPsyOptionsMarkets,
  listenForMissingSerumMarkets, 
} from "./newMarketListener"
import { waitUntilServerUp } from "./graphQLClient"
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection(process.env['RPC_URL']);
const psyOptionsProgramId = new PublicKey(process.env['PROGRAM_ID']);


(async () => {
  // wait until hasura has started
  await waitUntilServerUp()

  serumVialListener();
  addExistingMarkets({connection, psyOptionsProgramId});
  listenForNewPsyOptionsMarkets({connection, psyOptionsProgramId})
  listenForMissingSerumMarkets({connection, serumProgramId: psyOptionsProgramId})
})();



import serumVialListener from "./serumVialListener"
import { addExistingMarkets } from "./addExistingMarkets"
import { listenForNewPsyOptionsMarkets } from "./newMarketListener"
import { Connection, PublicKey } from "@solana/web3.js";

const connection = new Connection(process.env['RPC_URL']);
const psyOptionsProgramId = new PublicKey(process.env['PROGRAM_ID']);

serumVialListener();
addExistingMarkets({connection, psyOptionsProgramId});
listenForNewPsyOptionsMarkets({connection, psyOptionsProgramId})


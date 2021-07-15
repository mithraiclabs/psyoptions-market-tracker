import { AccountInfo, Connection, Context, PublicKey } from "@solana/web3.js";
import { subscribeToActivePsyOptionMarkets } from "./graphQLClient";
import { IndexedSerumMarket } from "./types";

type ActiveSubscription = {
  market: IndexedSerumMarket;
  subscriptionId: number;
}

const handleEventQueueChange = (accountInfo: AccountInfo<Buffer>, context: Context) => {
  
}

export const subscribeToSerumMarkets = (connection: Connection, ) => {
  let activeSubscriptions: Record<string, ActiveSubscription> = {};
  subscribeToActivePsyOptionMarkets({onEvent: (eventData) => {
    const activePsyOptionMarkets = eventData.data.markets;
    const serumMarketAddresses = activePsyOptionMarkets.map(m => m.serum_market.address);

    // find all addresses that are missing from the latest return and unsubscribe them
    const addressesToUnsub = Object.keys(activeSubscriptions).filter(addr => !serumMarketAddresses.includes(addr))
    if (addressesToUnsub.length) {
      // unsubscribe dead inactive markets
      addressesToUnsub.forEach(address => {
        const subscription = activeSubscriptions[address]
        if (subscription) {
          connection.removeAccountChangeListener(subscription.subscriptionId)
        }
      })
    }

    // Subscribe to new PsyOption serum markets
    activePsyOptionMarkets.forEach(async ({serum_market}) => {
      if (!activeSubscriptions[serum_market.address]) {
        // subscribe to the serum event queue
        connection.onAccountChange(new PublicKey(serum_market.event_queue_address), handleEventQueueChange)
      }
    })
    // activeSubscriptions = marketAddresses;

  }})
}
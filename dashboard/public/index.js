import { SubscriptionClient } from "graphql-subscriptions-client";
import hydrate from "preact-iso/hydrate";
import { ErrorBoundary } from "preact-iso/lazy";
import { LocationProvider, Router } from "preact-iso/router";
import {
  createClient,
  defaultExchanges,
  Provider,
  subscriptionExchange,
} from "urql";
import Header from "./header.js";
import Home from "./pages/home/index.js";
import NotFound from "./pages/_404.js";

const GRAPHQL_URL = import.meta.env.GRAPHQL_URL ?? "";

const subscriptionClient = new SubscriptionClient(
  GRAPHQL_URL.replace("http", "ws"),
  { reconnect: true }
);

const client = createClient({
  url: GRAPHQL_URL,
  exchanges: [
    ...defaultExchanges,
    subscriptionExchange({
      forwardSubscription(operation) {
        return subscriptionClient.request(operation);
      },
    }),
  ],
});

export function App() {
  return (
    <Provider value={client}>
      <LocationProvider>
        <div class="app">
          <Header />
          <ErrorBoundary>
            <Router>
              <Home path="/" />
              <NotFound default />
            </Router>
          </ErrorBoundary>
        </div>
      </LocationProvider>
    </Provider>
  );
}

hydrate(<App />);

export async function prerender(data) {
  const { default: prerender } = await import("preact-iso/prerender");
  return await prerender(<App {...data} />);
}

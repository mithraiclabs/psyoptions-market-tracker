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
import Home from "./pages/home";
import NotFound from "./pages/_404";

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

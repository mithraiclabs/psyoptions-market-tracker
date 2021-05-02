import { useSubscription } from "urql";
import styles from "./style.module.css";

const SerumVialEventsQuery = `
subscription MyQuery {
  serum_vial_events(
    limit: 100,
    order_by: {timestamp: desc},
    where: {data: {_contains: {type: "open"}}}
  ) {
    timestamp
    data
  }
}`;

export default function Home() {
  const [{ data, fetching, error }, reexecuteQuery] = useSubscription({
    query: SerumVialEventsQuery,
  });

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  return (
    <section class={styles.home}>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Side</th>
            <th>Type</th>
            <th>Asset Pair</th>
            <th>Expiration</th>
            <th>Strike Price</th>
            <th>Contract Size</th>
            <th>Order Size</th>
            <th>Limit Price</th>
          </tr>
        </thead>
        <tbody>
          {data.serum_vial_events.map((event) => (
            <tr title={JSON.stringify(event, null, 2)}>
              <td>{new Date(event.timestamp).toLocaleString()}</td>
              <td>buy</td>
              <td>{event.data.market.endsWith("BTC") ? "put" : "call"}</td>
              <td>
                {event.data.market.endsWith("BTC") ? "BTC/USDC" : "USDC/BTC"}
              </td>
              <td>{new Date(1622246399000).toLocaleString()}</td>
              <td>{event.data.market.match(/(\d+)/g).sort().pop()}</td>
              <td>-</td>
              <td>{event.data.size}</td>
              <td>{event.data.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

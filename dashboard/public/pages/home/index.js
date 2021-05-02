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
            <th>Market</th>
            <th>Side</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {data.serum_vial_events.map((event) => (
            <tr title={JSON.stringify(event, null, 2)}>
              <td>{new Date(event.timestamp).toLocaleString()}</td>
              <td>{event.data.market}</td>
              <td>{event.data.market.endsWith("BTC") ? "PUT" : "CALL"}</td>
              <td>{event.data.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

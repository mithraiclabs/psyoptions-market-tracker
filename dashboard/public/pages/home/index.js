import { useState } from "preact/hooks";
import { useQuery } from "urql";
import styles from "./style.module.css";

const SerumVialEventsQuery = `
query {
  serum_vial_events {
    timestamp
    data
  }
}`;

export default function Home() {
  const [count, setCount] = useState(0);

  const [{ data, fetching, error }, reexecuteQuery] = useQuery({
    query: SerumVialEventsQuery,
  });

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  return (
    <>
      <section class={styles.home}>
        <pre>{JSON.stringify(data.serum_vial_events)}</pre>
        <h1>Home</h1>
        <p>This is the home page.</p>
        <>
          <button style={{ width: 30 }} onClick={() => setCount(count - 1)}>
            -
          </button>
          <output style={{ padding: 10 }}>Count: {count}</output>
          <button style={{ width: 30 }} onClick={() => setCount(count + 1)}>
            +
          </button>
        </>
      </section>
    </>
  );
}

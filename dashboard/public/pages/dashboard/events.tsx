import { formatDistanceToNow } from "date-fns";
import { useSubscription } from "urql";
import { formatMarketName } from "./shared";

const EventsQuery = `
subscription {
  serum_events(order_by: {timestamp: desc}, limit: 100, where: {type: {_eq: trade}, serum_market_address: {_eq: "CHBtL1yfw24JxbCTQtrMZ1Tq5XsvfsqDCdi2QYdtVzvc"}}) {
    serum_market {
      address
      base_mint_address
      quote_mint_address
      last_event_seq_num
    }
    price
    type
    timestamp
    side
    size
  }
}
`;

export default function Events() {
  const [{ data, fetching, error }] = useSubscription<any>({
    query: EventsQuery,
  });

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Serum Market</th>
          <th>Type</th>
          <th>Side</th>
          <th>Price</th>
          <th>Size</th>
        </tr>
      </thead>
      <tbody>
        {data.serum_events.map((event: any) => (
          <tr>
            <td title={new Date(event.timestamp + "Z").toLocaleString()}>
              {formatDistanceToNow(new Date(event.timestamp + "Z"))} ago
            </td>
            <td>
              <th>{event.serum_market.address}</th>
            </td>
            <td>{event.type}</td>
            <td>{event.side}</td>
            <td>{event.price}</td>
            <td>{event.size}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

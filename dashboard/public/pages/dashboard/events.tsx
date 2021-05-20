import { formatDistanceToNow } from "date-fns";
import { useSubscription } from "urql";
import { formatMarketName } from "./shared";

const EventsQuery = `
subscription {
  serum_events(order_by: {timestamp: desc}, limit: 20) {
    market {
      option_type
      quote_asset {
        symbol
      }
      underlying_asset {
        symbol
      }
      underlying_asset_per_contract
      quote_asset_per_contract
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
          <th>Market</th>
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
              <th>{formatMarketName(event.market)}</th>
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

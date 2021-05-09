import { formatDistanceToNow } from "date-fns";
import { useSubscription } from "urql";

const EventsQuery = `
subscription {
  serum_events(order_by: {timestamp: desc}, limit: 15) {
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
      {data.serum_events.map((event: any) => (
        <tbody>
          <tr>
            <td title={new Date(event.timestamp + "Z").toLocaleString()}>
              {formatDistanceToNow(new Date(event.timestamp + "Z"))} ago
            </td>
            <td>
              {event.market.quote_asset_per_contract}{" "}
              {event.market.quote_asset.symbol}/
              {event.market.underlying_asset_per_contract}{" "}
              {event.market.underlying_asset.symbol}
            </td>
            <td>{event.type}</td>
            <td>{event.side}</td>
            <td>
              {event.price} {event.market.quote_asset.symbol}
            </td>
            <td>{event.size}</td>
          </tr>
        </tbody>
      ))}
    </table>
  );
}

import { useSubscription } from "urql";
import Events from "./events";
import { formatMarketName } from "./shared";

const SerumMarketsQuery = `
subscription {
  serum_markets(order_by: {address: asc}) {
    address
    program_id
    base_mint_address
    quote_mint_address
    latest_price
    change(args: { duration: "24 hours", percentage: true })
    volume(args: { duration: "24 hours"})
  }
}
`;

export default function Dashboard() {
  const [{ data, fetching, error }] = useSubscription<any>({
    query: SerumMarketsQuery,
  });

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  return (
    <>
      <section>
          <table>
            <thead>
              <tr>
                <th>Address</th>
                <th>Latest Price</th>
                <th>24hr Change</th>
                <th>24hr Volume</th>
              </tr>
            </thead>
            {data.serum_markets.map((market: any) => (
              <tbody>
                <tr>
                  <th>{market.address}</th>
                  <td>{market.latest_price}</td>
                  <td>{formatChange(market.change)}</td>
                  <td>{num(market.volume)}</td>
                </tr>
              </tbody>
            ))}
          </table>
      </section>
      <section>
        <Events />
      </section>
    </>
  );
}

function sortMarkets(data: any) {
  const { call, put } = data.reduce(
    (acc: any, curr: any) => {
      acc[curr.option_type] = acc[curr.option_type].concat(curr).sort(bySize);
      return acc;
    },
    { call: [], put: [] }
  );

  return [call, put];

  function bySize(a: any, b: any) {
    return (
      a.quote_asset_per_contract +
      a.underlying_asset_per_contract -
      (b.quote_asset_per_contract + b.underlying_asset_per_contract)
    );
  }
}

function formatChange(x?: number | string) {
  const num = Number(x);

  if (!num) return;

  // TODO remove all this, it's unnecessary as - included with API
  const [className, sign] = (() => {
    if (num > 0) {
      return ["pos", "+"];
    } else if (num < 0) {
      return ["neg", ""];
    } else {
      return ["", ""];
    }
  })();

  return (
    <span class={className}>
      {sign}
      {num.toFixed(1)}%
    </span>
  );
}

function num(amount: number) {
  if (amount) return new Intl.NumberFormat().format(amount);
}

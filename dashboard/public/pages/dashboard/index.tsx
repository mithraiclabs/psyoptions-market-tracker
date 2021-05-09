import { useSubscription } from "urql";
import Events from "./events";
import { formatMarketName } from "./shared";

const SerumVialEventsQuery = `
subscription {
  markets {
    option_type
    quote_asset {
      symbol
    }
    underlying_asset {
      symbol
    }
    volume
    latest_price
    change(args: { duration: "1 hour", percentage: true })

    underlying_asset_per_contract
    quote_asset_per_contract
  }
}
`;

export default function Dashboard() {
  const [{ data, fetching, error }] = useSubscription<any>({
    query: SerumVialEventsQuery,
  });

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  const types = sortMarkets(data.markets);

  return (
    <>
      <section>
        {types.map((type: any) => (
          <table>
            <thead>
              <tr>
                <th>{type[0].option_type} Size</th>
                <th>Latest Price</th>
                <th>1hr Change</th>
                <th>Volume</th>
              </tr>
            </thead>
            {type.map((market: any) => (
              <tbody>
                <tr>
                  <th>{formatMarketName(market)}</th>
                  <td>{market.latest_price}</td>
                  <td>{formatChange(market.change)}</td>
                  <td>{num(market.volume)}</td>
                </tr>
              </tbody>
            ))}
          </table>
        ))}
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

  const [className, sign] = (() => {
    if (num > 0) {
      return ["pos", "+"];
    } else if (num < 0) {
      return ["neg", "-"];
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

export function sortData(data) {
  return data.reduce(
    (acc, curr) => {
      const type = curr.underlyingAssetSymbol === "BTC" ? "calls" : "puts";
      acc[type] = acc[type].concat(curr).sort(lowestToHighest);
      return acc;
    },
    { calls: [], puts: [] }
  );

  function lowestToHighest(a, b) {
    return (
      Number(a.quoteAssetPerContract) +
      Number(a.underlyingAssetPerContract) -
      (Number(b.quoteAssetPerContract) + Number(b.underlyingAssetPerContract))
    );
  }
}

## how to regenerate seeds

`cd other`
add new `devnet_beta_market_data.json` file
run `node convert_json_to_sql.js`
`cd ..`
`hasura seeds apply`

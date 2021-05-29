## How to run locally

1. install direnv (macOS: brew, ubuntu: apt) + [hook into shell](https://direnv.net/docs/hook.html)

2. run `direnv allow && docker-compose up --build`. it will probably take a few mins of docker doing its thing before everything is ready

3. annoying step that won't be necessary soon... copy the contents of `mutation.gql`, then `cd hasura && hasura console`. Once the browser console opens, paste the generated mutation in the graphql editor and run it, it should create all the market and associated asset records.

4. open http://localhost

5. do a buy or sell trade on devnet BTC-USDC June 2021 options

6. hopefully it'll show up in the table on http://localhost within a few seconds

## Architecture

![excalidraw diagram](docs/architecture.png)

## Deployment

Edit `.envrc` and run `docker-compose up --build -d`

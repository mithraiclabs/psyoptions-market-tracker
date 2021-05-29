# install hasura cli

https://hasura.io/docs/latest/graphql/core/hasura-cli/install-hasura-cli.html#install-hasura-cli

## running local db

first run `docker-compose up` in the root directory. It may take a few minutes after the first launch for hasura to be ready to accept connections

run `hasura console` to open the local console, all modifications should be saved in the local config files

## accessing production db

run `hasura console --endpoint http://45.76.139.181:8080`, please don't edit anything there atm!

### TODO:

- add production config/password
- improve SQL functions

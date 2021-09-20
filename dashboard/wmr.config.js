// @ts-nocheck
const rollupPluginReplace = require("@rollup/plugin-replace");

// const GRAPHQL_URL = process.env.GRAPHQL_URL.replace(
//   "hasura",
//   process.env.EXT_HOST
// );

const GRAPHQL_URL = "https://api.psyoptions.io/v1/graphql"

console.log({ GRAPHQL_URL });

module.exports = function (config) {
  config.plugins.push(
    rollupPluginReplace({
      preventAssignment: true,
      "import.meta.env.GRAPHQL_URL": JSON.stringify(GRAPHQL_URL),
    })
  );
};

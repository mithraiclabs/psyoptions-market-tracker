const rollupPluginReplace = require("@rollup/plugin-replace");

const GRAPHQL_URL = process.env.GRAPHQL_URL.replace(
  "hasura",
  process.env.EXT_HOST
);

console.log({ GRAPHQL_URL });

module.exports = function (config) {
  config.plugins.push(
    // @ts-ignore
    rollupPluginReplace({
      preventAssignment: true,
      "import.meta.env.GRAPHQL_URL": JSON.stringify(GRAPHQL_URL),
    })
  );
};

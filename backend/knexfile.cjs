require("dotenv/config");

/** For the Knex CLI (e.g. `npx knex migrate:make <name>`). Actual app migrations run via `npm run migrate` (src/db/migrate.ts). */
module.exports = {
  client: "pg",
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: "./src/db/migrations",
    loadExtensions: [".cjs"],
  },
};

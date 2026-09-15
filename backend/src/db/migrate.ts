import "dotenv/config";
import Knex from "knex";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const knex = Knex({
    client: "pg",
    connection: connectionString,
    migrations: {
      directory: "./src/db/migrations",
      loadExtensions: [".cjs"],
    },
  });

  console.log("Running migrations...");
  const [batch, applied] = await knex.migrate.latest();
  if (applied.length === 0) {
    console.log(`Already up to date (batch ${batch}).`);
  } else {
    console.log(`Batch ${batch} applied:\n${applied.map((f: string) => `  - ${f}`).join("\n")}`);
  }

  await knex.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

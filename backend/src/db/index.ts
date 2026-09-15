import Knex from "knex";
import type { Knex as KnexTypes } from "knex";
import pg from "pg";
import { postProcessResponse, toSnakeCase } from "./caseMap";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// node-postgres parses DATE columns into JS Date objects by default; the
// app treats calendar-date fields (scheduledDate, deadline, ...) as plain
// "YYYY-MM-DD" strings throughout (string comparisons, Luxon parsing), so
// keep them as the raw string the server sends instead. TIMESTAMPTZ columns
// are left as Date objects — that's what the focus-timer/reschedule code
// expects (`.getTime()` etc).
pg.types.setTypeParser(1082 /* date */, (value: string) => value);

export const db = Knex({
  client: "pg",
  connection: connectionString,
  wrapIdentifier: (value, origImpl) => origImpl(toSnakeCase(value)),
  postProcessResponse,
});

/**
 * Raw/parameterized queries (used for recursive CTEs and aggregates) go
 * through the driver directly rather than the query builder, so Knex's
 * postProcessResponse hook isn't applied automatically — this wraps it so
 * callers still get camelCase rows like every other query in the app.
 */
export async function queryRaw<T = Record<string, unknown>>(sql: string, bindings: readonly KnexTypes.RawBinding[] = []): Promise<T[]> {
  const result = await db.raw(sql, bindings);
  return postProcessResponse(result.rows) as T[];
}

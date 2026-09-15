/**
 * The app's JS/JSON layer is camelCase (matches the frontend contract that
 * was already built against the Drizzle-backed API); Postgres columns are
 * snake_case. Rather than rewrite every field reference across the app,
 * these run as Knex's wrapIdentifier/postProcessResponse hooks so queries
 * can be written in camelCase and results come back in camelCase too.
 */

export function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function toCamelCase(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

function camelCaseKeys<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => camelCaseKeys(item)) as unknown as T;
  }
  if (input !== null && typeof input === "object" && !(input instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      result[toCamelCase(key)] = camelCaseKeys(value);
    }
    return result as T;
  }
  return input;
}

export function postProcessResponse(result: unknown): unknown {
  return camelCaseKeys(result);
}

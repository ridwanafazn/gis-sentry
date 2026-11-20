import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __gissentryPool: Pool | undefined;
}

export function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;

  if (!global.__gissentryPool) {
    global.__gissentryPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }

  return global.__gissentryPool;
}

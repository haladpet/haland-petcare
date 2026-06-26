import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { serverSchema } from "./schema";

let pool: Pool | null = null;
let serverDb: ReturnType<typeof drizzle> | null = null;

export function getServerPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize server database pool");
  }
  pool = new Pool({ connectionString });
  return pool;
}

export function getServerDb() {
  if (serverDb) return serverDb;
  const p = getServerPool();
  serverDb = drizzle(p, { schema: serverSchema });
  return serverDb;
}
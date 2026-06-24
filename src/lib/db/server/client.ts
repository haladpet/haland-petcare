import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { serverSchema } from "./schema";

let pool: Pool | null = null;
let serverDb: ReturnType<typeof drizzle> | null = null;

export function getServerPool() {
  if (pool) return pool;
  const connection = process.env.DATABASE_URL || "";
  pool = new Pool({ connectionString: connection });
  return pool;
}

export function getServerDb() {
  if (serverDb) return serverDb;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to initialize server database");
  }
  const p = new Pool({ connectionString });
  serverDb = drizzle(p, { schema: serverSchema });
  return serverDb;
}

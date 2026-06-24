import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { localSchema } from "./schema";

let localDb: ReturnType<typeof drizzle> | null = null;
let localClient: PGlite | null = null;

export function getLocalDb() {
  if (!localDb) {
    localClient = new PGlite({ dataDir: "./pglite-local-db" });
    localDb = drizzle(localClient, { schema: localSchema });
  }
  return localDb;
}

export function getLocalClient() {
  if (!localClient) {
    getLocalDb(); // Ensure client is initialized
  }
  return localClient!;
}

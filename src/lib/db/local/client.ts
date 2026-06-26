import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { localSchema } from "./schema";

type LocalDatabase = ReturnType<typeof drizzle<typeof localSchema>>;

let localDb: LocalDatabase | null = null;
let localClient: PGlite | null = null;

export function getLocalDb(): LocalDatabase {
  if (!localDb) {
    localClient = new PGlite({ dataDir: "./pglite-local-db" });
    localDb = drizzle(localClient, { schema: localSchema }) as LocalDatabase;
  }
  return localDb;
}

export function getLocalClient(): PGlite {
  if (!localClient) {
    getLocalDb(); // Ensure client is initialized
  }
  if (!localClient) {
    throw new Error("Failed to initialize local database client");
  }
  return localClient;
}
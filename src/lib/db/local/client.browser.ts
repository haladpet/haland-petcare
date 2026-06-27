import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { localSchema } from "./schema";

type LocalDatabase = ReturnType<typeof drizzle<typeof localSchema>>;

let localDb: LocalDatabase | null = null;
let localClient: PGlite | null = null;

export function getLocalBrowserDb(): LocalDatabase {
  if (typeof window === "undefined") {
    throw new Error(
      "getLocalBrowserDb() called on server — browser PGlite client uses IndexedDB and can only run in the browser"
    );
  }

  if (!localDb) {
    localClient = new PGlite("idb://haland-petcare-local");
    localDb = drizzle(localClient, { schema: localSchema }) as LocalDatabase;
  }
  return localDb;
}

export function getLocalBrowserClient(): PGlite {
  if (!localClient) {
    getLocalBrowserDb();
  }
  if (!localClient) {
    throw new Error("Failed to initialize browser local database client");
  }
  return localClient;
}
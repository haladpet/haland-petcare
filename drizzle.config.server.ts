import type { Config } from "drizzle-kit";

export default {
  schema: "src/lib/db/server/schema.ts",
  out: "drizzle/server",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://user:password@localhost:5432/haland_petcare",
  },
} as any;

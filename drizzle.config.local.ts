// Using a loose config to avoid type incompatibilities in this template
export default {
  schema: "src/lib/db/local/schema.ts",
  out: "drizzle/local",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://local:local@localhost/pglite",
  },
} as any;

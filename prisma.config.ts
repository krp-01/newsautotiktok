import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error(
    "[prisma.config] DATABASE_URL is missing. Set a PostgreSQL connection string before running db push, migrate, or seed."
  );
} else if (databaseUrl.startsWith("file:") || /sqlite/i.test(databaseUrl)) {
  console.error(
    "[prisma.config] SQLite is not supported. Use a postgresql:// DATABASE_URL from Railway Postgres."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl ?? "",
  },
});

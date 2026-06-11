import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

export function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();

  if (!url) {
    console.error(
      "[database] DATABASE_URL is not set. Link PostgreSQL on Railway and set DATABASE_URL to a postgresql:// connection string."
    );
    throw new Error("DATABASE_URL is not set");
  }

  if (url.startsWith("file:") || /sqlite/i.test(url)) {
    console.error(
      "[database] SQLite is not supported. Set DATABASE_URL to a PostgreSQL connection string (postgresql://...)."
    );
    throw new Error("SQLite DATABASE_URL is not supported");
  }

  return url;
}

export function createPrismaClient(): PrismaClient {
  const connectionString = resolveDatabaseUrl();
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

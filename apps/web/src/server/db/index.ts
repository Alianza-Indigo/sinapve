import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let cachedDb: ReturnType<typeof createDb> | null = null;

function createDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for database access. Use demo repositories for local UI without Neon.");
  }

  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

export function getDb() {
  if (!cachedDb) cachedDb = createDb();
  return cachedDb;
}

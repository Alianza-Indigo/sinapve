import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let cachedDb: ReturnType<typeof createDb> | null = null;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is required. Link the existing Neon database environment before using live data routes.");
  }
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function createDb() {
  if (!process.env.DATABASE_URL) {
    throw new DatabaseNotConfiguredError();
  }

  const sql = neon(process.env.DATABASE_URL);
  return drizzle(sql, { schema });
}

export function getDb() {
  if (!cachedDb) cachedDb = createDb();
  return cachedDb;
}

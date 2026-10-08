import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseNotConfiguredError();

  const client = postgres(url, {
    // Required for Supabase's transaction pooler (port 6543): it hands each query to
    // whichever real connection is free, so "prepared statements" saved on one
    // connection would not exist on the next.
    prepare: false,
    max: 5,
  });
  return drizzle(client, { schema });
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not set");
  }
}

// Created on first use, not at import time, so `next build` works without the secret.
// The module-level variable is reused by later requests on the same server instance.
let db: ReturnType<typeof createDb> | undefined;

export function getDb() {
  db ??= createDb();
  return db;
}

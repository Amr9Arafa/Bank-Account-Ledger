import type { getDb } from "@/server/db/client";

type Db = ReturnType<typeof getDb>;
/** The object Drizzle passes into db.transaction(async (tx) => ...). */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

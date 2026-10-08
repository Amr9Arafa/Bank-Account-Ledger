/**
 * Postgres reports constraint failures with a 5-character code. Drizzle may wrap the
 * driver's error, so look at the error and at its `cause`.
 */
function pgCode(err: unknown): string | undefined {
  for (let e = err, depth = 0; e && typeof e === "object" && depth < 3; depth++) {
    if ("code" in e && typeof e.code === "string") return e.code;
    e = "cause" in e ? e.cause : undefined;
  }
  return undefined;
}

/** 23505 = unique_violation (e.g. the same cheque number twice on one account). */
export function isUniqueViolation(err: unknown) {
  return pgCode(err) === "23505";
}

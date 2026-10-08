import { AuthError } from "@/server/auth/session";
import { LedgerError } from "@/server/ledger/errors";

/** What every form action returns to its form (shown via useActionState). */
export type FormState = {
  /** Translation key under "Errors". */
  error?: string;
  /** Per-field translation keys under "Errors". */
  fields?: Record<string, string>;
  /** Set when a likely duplicate was found; the form offers "Save anyway". */
  duplicateOf?: string;
  /** What the user typed, so the form can show it again after an error. */
  values?: Record<string, string>;
  /** Success message key under "Flash". */
  done?: string;
};

export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  formData.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$")) out[k] = v;
  });
  return out;
}

/** Turn a thrown error into a FormState. Unknown errors are logged, not shown. */
export function errorState(err: unknown, values?: Record<string, string>): FormState {
  if (err instanceof AuthError) return { error: err.code, values };
  if (err instanceof LedgerError) {
    return err.field
      ? { error: err.code, fields: { [err.field]: err.code }, values }
      : { error: err.code, values };
  }
  console.error("Unexpected action error", err);
  return { error: "unexpected", values };
}

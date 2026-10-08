// Form input rules, shared by the server actions. Error messages are translation keys
// (see "Errors" in messages/*.json), so the same rule shows in English or Arabic.
import { z } from "zod";
import { toMinor } from "./money";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "invalidDate" });
const optionalDate = z
  .string()
  .trim()
  .transform((v) => v || null)
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: "invalidDate" });
const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, { message: "tooLong" })
    .transform((v) => v || null);
const amount = z
  .string()
  .transform((v) => toMinor(v))
  .refine((v): v is number => v !== null, { message: "invalidAmount" });
const id = z.string().uuid({ message: "required" });

export const movementTypes = ["transfer_in", "deposit", "fee", "cheque"] as const;
export type MovementType = (typeof movementTypes)[number];

export const movementSchema = z
  .object({
    type: z.enum(movementTypes),
    bankAccountId: id,
    amount,
    transactionDate: isoDate,
    partyName: optionalText(),
    reference: optionalText(),
    description: optionalText(),
    chequeNumber: optionalText(40),
    dueDate: optionalDate,
    notes: optionalText(1000),
  })
  .superRefine((v, ctx) => {
    if (v.type === "cheque") {
      if (!v.chequeNumber) ctx.addIssue({ code: "custom", path: ["chequeNumber"], message: "required" });
      if (!v.partyName) ctx.addIssue({ code: "custom", path: ["partyName"], message: "required" });
    }
    if (v.type === "transfer_in" && !v.partyName) {
      ctx.addIssue({ code: "custom", path: ["partyName"], message: "required" });
    }
    if (v.type === "fee" && !v.description) {
      ctx.addIssue({ code: "custom", path: ["description"], message: "required" });
    }
  });
export type MovementInput = z.infer<typeof movementSchema>;

export const internalTransferSchema = z
  .object({
    fromAccountId: id,
    toAccountId: id,
    amount,
    transactionDate: isoDate,
    notes: optionalText(1000),
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, {
    path: ["toAccountId"],
    message: "sameAccount",
  });
export type InternalTransferInput = z.infer<typeof internalTransferSchema>;

export const clearChequeSchema = z.object({ id, clearedDate: isoDate });
export const reasonSchema = z.object({
  id,
  reason: z.string().trim().min(1, { message: "required" }).max(300, { message: "tooLong" }),
});

export const bankAccountSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, { message: "required" }).max(80, { message: "tooLong" }),
  bankName: z.string().trim().min(1, { message: "required" }).max(80, { message: "tooLong" }),
  accountNumber: z.string().trim().min(1, { message: "required" }).max(40, { message: "tooLong" }),
  openingBalance: z
    .string()
    .transform((v) => (v.trim() === "" || v.trim() === "0" ? 0 : toMinor(v)))
    .refine((v): v is number => v !== null, { message: "invalidAmount" }),
  openingDate: isoDate,
  receivesTransfers: z.boolean(),
  issuesCheques: z.boolean(),
});
export type BankAccountInput = z.infer<typeof bankAccountSchema>;

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: "invalidEmail" }),
  name: z.string().trim().min(1, { message: "required" }).max(80, { message: "tooLong" }),
  role: z.enum(["viewer", "accountant", "admin"]),
  password: z.string().min(10, { message: "passwordTooShort" }).max(72, { message: "tooLong" }),
});

/** Turn zod issues into { field: messageKey } for the form to show under each input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

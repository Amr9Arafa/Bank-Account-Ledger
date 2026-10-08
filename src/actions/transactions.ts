"use server";
// Server actions: Next.js turns each exported async function into a POST endpoint that
// forms can call directly. Each one: check role -> validate -> call the ledger -> refresh pages.
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { internalTransferSchema, movementSchema, fieldErrors, reasonSchema } from "@/lib/validation";
import { requireRole } from "@/server/auth/session";
import {
  createInternalTransfer,
  createMovement,
  updateMovement,
  voidMovement,
} from "@/server/ledger/transactions";
import { errorState, formValues, type FormState } from "./result";

function refreshAll() {
  // Balances appear on several pages; re-render all of them on next visit.
  revalidatePath("/", "layout");
}

export async function saveMovementAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = movementSchema.safeParse(values);
  if (!parsed.success) return { error: "fixFields", fields: fieldErrors(parsed.error), values };
  const input = parsed.data;
  const editId = values.id || null;

  let target: string;
  try {
    const user = await requireRole("accountant");
    if (editId) {
      await updateMovement(user, editId, input);
      target = `/accounts/${input.bankAccountId}?saved=1`;
    } else {
      const result = await createMovement(user, input, { allowDuplicate: values.allowDuplicate === "1" });
      if ("duplicateOf" in result) return { duplicateOf: result.duplicateOf, values };
      target =
        values.intent === "saveAndNew"
          ? `/transactions/new?type=${input.type}&account=${input.bankAccountId}&saved=1`
          : `/accounts/${input.bankAccountId}?saved=1`;
    }
  } catch (err) {
    return errorState(err, values);
  }
  refreshAll();
  // redirect() works by throwing, so it must stay outside the try/catch above.
  redirect({ href: target, locale: await getLocale() });
  return {};
}

export async function saveInternalTransferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = internalTransferSchema.safeParse(values);
  if (!parsed.success) return { error: "fixFields", fields: fieldErrors(parsed.error), values };
  try {
    const user = await requireRole("accountant");
    await createInternalTransfer(user, parsed.data);
  } catch (err) {
    return errorState(err, values);
  }
  refreshAll();
  redirect({ href: `/accounts/${parsed.data.fromAccountId}?saved=1`, locale: await getLocale() });
  return {};
}

export async function voidMovementAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = reasonSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "fixFields", fields: fieldErrors(parsed.error) };
  try {
    const user = await requireRole("accountant");
    await voidMovement(user, parsed.data.id, parsed.data.reason);
  } catch (err) {
    return errorState(err);
  }
  refreshAll();
  return { done: "voided" };
}

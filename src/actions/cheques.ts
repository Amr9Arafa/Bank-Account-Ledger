"use server";
import { revalidatePath } from "next/cache";
import { clearChequeSchema, fieldErrors, reasonSchema } from "@/lib/validation";
import { requireRole } from "@/server/auth/session";
import { cancelCheque, clearCheque } from "@/server/ledger/transactions";
import { errorState, formValues, type FormState } from "./result";

export async function clearChequeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = clearChequeSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "fixFields", fields: fieldErrors(parsed.error) };
  try {
    const user = await requireRole("accountant");
    await clearCheque(user, parsed.data.id, parsed.data.clearedDate);
  } catch (err) {
    return errorState(err);
  }
  revalidatePath("/", "layout");
  return { done: "cleared" };
}

export async function cancelChequeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = reasonSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "fixFields", fields: fieldErrors(parsed.error) };
  try {
    const user = await requireRole("accountant");
    await cancelCheque(user, parsed.data.id, parsed.data.reason);
  } catch (err) {
    return errorState(err);
  }
  revalidatePath("/", "layout");
  return { done: "cancelled" };
}

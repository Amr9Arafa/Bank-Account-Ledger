"use server";
import { revalidatePath } from "next/cache";
import { bankAccountSchema, fieldErrors, inviteSchema } from "@/lib/validation";
import { requireRole } from "@/server/auth/session";
import { saveAccount, setAccountArchived } from "@/server/ledger/accounts";
import { inviteUser } from "@/server/ledger/users";
import { errorState, formValues, type FormState } from "./result";

export async function saveAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = bankAccountSchema.safeParse({
    ...values,
    id: values.id || undefined,
    receivesTransfers: formData.get("receivesTransfers") === "on",
    issuesCheques: formData.get("issuesCheques") === "on",
  });
  if (!parsed.success) return { error: "fixFields", fields: fieldErrors(parsed.error), values };
  try {
    const user = await requireRole("admin");
    await saveAccount(user, parsed.data);
  } catch (err) {
    return errorState(err, values);
  }
  revalidatePath("/", "layout");
  return { done: "accountSaved" };
}

export async function archiveAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await requireRole("admin");
    await setAccountArchived(user, String(formData.get("id")), formData.get("archived") === "1");
  } catch (err) {
    return errorState(err);
  }
  revalidatePath("/", "layout");
  return { done: "accountSaved" };
}

export async function inviteUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = inviteSchema.safeParse(values);
  // Never send a password back to the browser.
  const safeValues = { ...values, password: "" };
  if (!parsed.success) return { error: "fixFields", fields: fieldErrors(parsed.error), values: safeValues };
  try {
    const user = await requireRole("admin");
    await inviteUser(user, parsed.data);
  } catch (err) {
    return errorState(err, safeValues);
  }
  revalidatePath("/", "layout");
  return { done: "userInvited" };
}

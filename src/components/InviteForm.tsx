"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { inviteUserAction } from "@/actions/settings";
import type { FormState } from "@/actions/result";
import { Field, FormMessage, SubmitButton } from "./form";
import { input } from "./ui";

export function InviteForm() {
  const t = useTranslations("Settings");
  const tRoles = useTranslations("Nav.roles");
  const [state, formAction] = useActionState<FormState, FormData>(inviteUserAction, {});
  const v = state.done ? {} : (state.values ?? {});
  const err = state.fields ?? {};

  return (
    <form action={formAction} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label={t("name")} name="invite-name" error={err.name}>
          <input id="invite-name" name="name" className={input} defaultValue={v.name ?? ""} required />
        </Field>
        <Field label={t("email")} name="invite-email" error={err.email}>
          <input id="invite-email" name="email" type="email" dir="ltr" className={input} defaultValue={v.email ?? ""} required />
        </Field>
        <Field label={t("role")} name="invite-role" error={err.role}>
          <select id="invite-role" name="role" className={input} defaultValue={v.role ?? "accountant"}>
            <option value="accountant">{tRoles("accountant")}</option>
            <option value="viewer">{tRoles("viewer")}</option>
            <option value="admin">{tRoles("admin")}</option>
          </select>
        </Field>
        <Field label={t("initialPassword")} name="invite-password" error={err.password} hint={t("initialPasswordHint")}>
          <input id="invite-password" name="password" type="password" autoComplete="new-password" dir="ltr" className={input} required minLength={10} />
        </Field>
      </div>
      <SubmitButton>{t("invite")}</SubmitButton>
    </form>
  );
}

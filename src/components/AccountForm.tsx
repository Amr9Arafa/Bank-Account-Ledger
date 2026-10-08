"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { saveAccountAction } from "@/actions/settings";
import type { FormState } from "@/actions/result";
import { Field, FormMessage, SubmitButton } from "./form";
import { input } from "./ui";

export function AccountForm({ initial }: { initial: Record<string, string> }) {
  const t = useTranslations("Settings");
  const [state, formAction] = useActionState<FormState, FormData>(saveAccountAction, {});
  const v = state.values ?? initial;
  const err = state.fields ?? {};
  const key = initial.id || "new";
  // Checkbox: unchecked boxes are not sent at all, so "on" or missing.
  const checked = (name: string) => (state.values ? v[name] === "on" : initial[name] === "on");

  return (
    <form action={formAction} className="space-y-3">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("name")} name={`name-${key}`} error={err.name}>
          <input id={`name-${key}`} name="name" className={input} defaultValue={v.name ?? ""} required />
        </Field>
        <Field label={t("bank")} name={`bank-${key}`} error={err.bankName}>
          <input id={`bank-${key}`} name="bankName" className={input} defaultValue={v.bankName ?? ""} required />
        </Field>
        <Field label={t("accountNumber")} name={`num-${key}`} error={err.accountNumber}>
          <input id={`num-${key}`} name="accountNumber" dir="ltr" className={input} defaultValue={v.accountNumber ?? ""} required />
        </Field>
        <Field label={t("openingBalance")} name={`ob-${key}`} error={err.openingBalance}>
          <input id={`ob-${key}`} name="openingBalance" inputMode="decimal" className={`${input} tabular-nums`} defaultValue={v.openingBalance ?? "0"} />
        </Field>
        <Field label={t("openingDate")} name={`od-${key}`} error={err.openingDate} hint={t("openingHint")}>
          <input id={`od-${key}`} name="openingDate" type="date" className={input} defaultValue={v.openingDate ?? ""} required />
        </Field>
        <div className="space-y-2 pt-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="receivesTransfers" defaultChecked={checked("receivesTransfers")} />
            {t("receivesTransfers")}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="issuesCheques" defaultChecked={checked("issuesCheques")} />
            {t("issuesCheques")}
          </label>
        </div>
      </div>
      <SubmitButton>{t("save")}</SubmitButton>
    </form>
  );
}

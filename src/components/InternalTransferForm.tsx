"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { saveInternalTransferAction } from "@/actions/transactions";
import type { FormState } from "@/actions/result";
import type { AccountOption } from "./MovementForm";
import { Field, FormMessage, SubmitButton } from "./form";
import { input } from "./ui";

export function InternalTransferForm({
  accounts,
  initial,
}: {
  accounts: AccountOption[];
  initial: Record<string, string>;
}) {
  const t = useTranslations("Entry");
  const [state, formAction] = useActionState<FormState, FormData>(saveInternalTransferAction, {});
  const v = state.values ?? initial;
  const err = state.fields ?? {};

  const accountSelect = (name: "fromAccountId" | "toAccountId", label: string) => (
    <Field label={label} name={name} error={err[name]}>
      <select
        id={name}
        name={name}
        className={input}
        defaultValue={v[name] ?? ""}
        aria-invalid={!!err[name]}
        required
      >
        <option value="">{t("chooseAccount")}</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} — {a.bankName}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        {accountSelect("fromAccountId", t("from"))}
        {accountSelect("toAccountId", t("to"))}
        <Field label={t("amount")} name="amount" error={err.amount}>
          <input
            id="amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            className={`${input} tabular-nums`}
            defaultValue={v.amount ?? ""}
            aria-invalid={!!err.amount}
            required
          />
        </Field>
        <Field label={t("date")} name="transactionDate" error={err.transactionDate}>
          <input
            id="transactionDate"
            name="transactionDate"
            type="date"
            className={input}
            defaultValue={v.transactionDate ?? ""}
            aria-invalid={!!err.transactionDate}
            required
          />
        </Field>
      </div>
      <Field label={t("notes")} name="notes" error={err.notes}>
        <textarea id="notes" name="notes" rows={2} className={input} defaultValue={v.notes ?? ""} />
      </Field>
      <SubmitButton>{t("save")}</SubmitButton>
    </form>
  );
}

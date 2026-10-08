"use client";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { saveMovementAction } from "@/actions/transactions";
import type { FormState } from "@/actions/result";
import type { MovementType } from "@/lib/validation";
import { Field, FormMessage, SubmitButton } from "./form";
import { buttonSecondary, input } from "./ui";

export type AccountOption = { id: string; name: string; bankName: string };

export function MovementForm({
  type,
  accounts,
  initial,
  nextChequeNumbers,
  editId,
}: {
  type: MovementType;
  accounts: AccountOption[];
  initial: Record<string, string>;
  /** Suggested next cheque number per account id. */
  nextChequeNumbers: Record<string, string>;
  editId?: string;
}) {
  const t = useTranslations("Entry");
  const [state, formAction] = useActionState<FormState, FormData>(saveMovementAction, {});
  // After an error, show what the user typed; otherwise the initial values.
  const v = state.values ?? initial;
  const [accountId, setAccountId] = useState(v.bankAccountId ?? "");
  const err = state.fields ?? {};
  const isCheque = type === "cheque";

  const partyLabel = type === "transfer_in" ? t("sender") : isCheque ? t("payee") : t("description");
  const partyName = type === "fee" || type === "deposit" ? "description" : "partyName";

  if (accounts.length === 0) return <p className="text-slate-600">{t("noAccountForType")}</p>;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="type" value={type} />
      {editId && <input type="hidden" name="id" value={editId} />}

      <FormMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("account")} name="bankAccountId" error={err.bankAccountId}>
          <select
            id="bankAccountId"
            name="bankAccountId"
            className={input}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            aria-invalid={!!err.bankAccountId}
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

        <Field
          label={type === "transfer_in" ? t("dateReceived") : isCheque ? t("issueDate") : t("date")}
          name="transactionDate"
          error={err.transactionDate}
        >
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

        {isCheque && (
          <>
            <Field label={t("chequeNumber")} name="chequeNumber" error={err.chequeNumber}>
              <input
                // Re-mount when the account changes so the suggested number updates.
                key={accountId}
                id="chequeNumber"
                name="chequeNumber"
                className={`${input} tabular-nums`}
                defaultValue={v.chequeNumber || nextChequeNumbers[accountId] || ""}
                aria-invalid={!!err.chequeNumber}
                required
              />
            </Field>
            <Field label={t("dueDate")} name="dueDate" error={err.dueDate} hint={t("dueDateHint")}>
              <input id="dueDate" name="dueDate" type="date" className={input} defaultValue={v.dueDate ?? ""} />
            </Field>
          </>
        )}

        <Field label={partyLabel} name={partyName} error={err[partyName]}>
          <input
            id={partyName}
            name={partyName}
            className={input}
            defaultValue={v[partyName] ?? ""}
            aria-invalid={!!err[partyName]}
            required={type !== "deposit"}
          />
        </Field>

        {type === "transfer_in" && (
          <Field label={t("reference")} name="reference" error={err.reference}>
            <input id="reference" name="reference" className={input} defaultValue={v.reference ?? ""} />
          </Field>
        )}
      </div>

      <Field label={t("notes")} name="notes" error={err.notes}>
        <textarea id="notes" name="notes" rows={2} className={input} defaultValue={v.notes ?? ""} />
      </Field>

      {state.duplicateOf && (
        <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p>{t("duplicateWarning")}</p>
          <SubmitButton name="allowDuplicate" value="1">
            {t("saveAnyway")}
          </SubmitButton>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <SubmitButton name="intent" value="save">
          {t("save")}
        </SubmitButton>
        {!editId && (
          <SubmitButton name="intent" value="saveAndNew" className={buttonSecondary}>
            {t("saveAndNew")}
          </SubmitButton>
        )}
      </div>
    </form>
  );
}

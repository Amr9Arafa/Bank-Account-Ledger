"use client";
// Small form building blocks used by every form. Client components because
// useFormStatus needs the browser to know when a submission is in flight.
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/actions/result";
import { button } from "./ui";

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("Errors");
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-700">{t(error)}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  children,
  className = button,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  const t = useTranslations("Entry");
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={className}>
      {pending ? t("saving") : children}
    </button>
  );
}

/** Banner for a form-level error or a success message. */
export function FormMessage({ state }: { state: FormState }) {
  const tErr = useTranslations("Errors");
  const tFlash = useTranslations("Flash");
  if (state.error) {
    return (
      <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        {tErr(state.error)}
      </p>
    );
  }
  if (state.done) {
    return (
      <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {tFlash(state.done)}
      </p>
    );
  }
  return null;
}

"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signInAction } from "@/actions/auth";
import type { FormState } from "@/actions/result";
import { Field, FormMessage, SubmitButton } from "./form";
import { input } from "./ui";

export function LoginForm() {
  const t = useTranslations("Login");
  const [state, formAction] = useActionState<FormState, FormData>(signInAction, {});
  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />
      <Field label={t("email")} name="email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          dir="ltr"
          className={input}
          defaultValue={state.values?.email ?? ""}
          required
        />
      </Field>
      <Field label={t("password")} name="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          dir="ltr"
          className={input}
          required
        />
      </Field>
      <SubmitButton className="w-full rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60">
        {t("submit")}
      </SubmitButton>
    </form>
  );
}

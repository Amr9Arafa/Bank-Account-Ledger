"use client";
// A small form bound to one server action (void, clear, cancel, archive...).
// useActionState keeps the action's last result so the form can show its error or success.
import { useActionState } from "react";
import type { FormState } from "@/actions/result";
import { FormMessage } from "./form";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function ActionForm({
  action,
  children,
  className,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="mt-2">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

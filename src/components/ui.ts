// Shared Tailwind class strings, so every screen looks the same without a component library.
export const input =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600 aria-[invalid=true]:border-red-500";
export const button =
  "inline-flex items-center justify-center rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60";
export const buttonSecondary =
  "inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-60";
export const buttonDanger =
  "inline-flex items-center justify-center rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60";
export const card = "rounded-lg border border-slate-200 bg-white p-4";
export const th = "px-3 py-2 text-start text-xs font-medium uppercase tracking-wide text-slate-500";
export const td = "px-3 py-2 align-top";
export const statusBadge: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-800",
  issued: "bg-amber-50 text-amber-800",
  cleared: "bg-emerald-50 text-emerald-800",
  voided: "bg-slate-100 text-slate-500 line-through",
  cancelled: "bg-slate-100 text-slate-500 line-through",
};

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bank Accounts Ledger",
  description: "Track transfers, cheques and balances for the company's bank accounts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang/dir become dynamic (en/ar) when next-intl is added in milestone 1.
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}

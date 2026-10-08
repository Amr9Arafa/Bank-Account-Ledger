import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware versions of Next's Link/redirect: <Link href="/cheques"> goes to /ar/cheques or /en/cheques.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

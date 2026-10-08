// Money helpers. All amounts inside the app are integer piasters ("minor units"):
// 1 EGP = 100 piasters. Floats are only used at the very edge, for display.

export type Locale = "en" | "ar";

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EASTERN_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹"; // Persian/Urdu keyboards

/** "١٬٢٥٠٫٥" or "1,250.5" -> "1250.5". Lets people type with either digit style. */
export function normalizeAmountInput(input: string): string {
  let out = "";
  for (const ch of input.trim()) {
    const a = ARABIC_INDIC.indexOf(ch);
    const e = EASTERN_ARABIC_INDIC.indexOf(ch);
    if (a >= 0) out += String(a);
    else if (e >= 0) out += String(e);
    else if (ch === "٫") out += "."; // Arabic decimal separator
    else if (ch === "," || ch === "٬" || ch === " ") continue; // thousands separators
    else out += ch;
  }
  return out;
}

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Parse a user-typed amount into piasters. Returns null if it is not a valid
 * positive amount with at most 2 decimals.
 * Splits the string instead of multiplying a float: Number("1.15") * 100 is 114.99999999999999.
 */
export function toMinor(input: string): number | null {
  const s = normalizeAmountInput(input);
  if (!AMOUNT_PATTERN.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor <= 0) return null;
  return minor;
}

/** 125050 -> "EGP 1,250.50" (en) or "‏١٬٢٥٠٫٥٠ ج.م.‏" (ar). */
export function formatEGP(minor: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

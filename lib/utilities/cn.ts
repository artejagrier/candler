/**
 * Minimal className combiner.
 *
 * Accepts strings, arrays, and conditional objects and joins the truthy values
 * with a single space. Kept dependency-free on purpose — we don't yet need the
 * conflict-resolution behaviour of `tailwind-merge`, and avoiding it keeps the
 * client bundle lean. Swap in `tailwind-merge` later if utility conflicts
 * become a real problem.
 */
export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === "string" || typeof input === "number") {
      out.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else if (typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (value) out.push(key);
      }
    }
  }

  return out.join(" ");
}

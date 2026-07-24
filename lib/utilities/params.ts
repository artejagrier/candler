/** Helpers for Next.js 16 async `searchParams` (which resolve to this shape). */
export type SearchParams = Record<string, string | string[] | undefined>;

/** Read the first value for a search param key, ignoring repeats. */
export function param(sp: SearchParams, key: string): string | undefined {
  const value = sp[key];
  return Array.isArray(value) ? value[0] : value;
}

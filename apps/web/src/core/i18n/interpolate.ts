/** Interpolate {var} placeholders in i18n strings. */
export function tf(t: (key: string, fallback?: string) => string, key: string, vars?: Record<string, string | number>): string {
  let text = t(key);
  if (!vars) return text;
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

/** Checks syntax and modulo 11 only; it does not verify a person's identity. */
export function normalizeRut(value: string): string {
  const clean = value.trim().replace(/\./g, "").toUpperCase();
  if (!/^\d{7,8}-?[\dK]$/.test(clean)) return "";
  const compact = clean.replace("-", "");
  return `${compact.slice(0, -1)}-${compact.slice(-1)}`;
}
export function isValidRut(value: string): boolean {
  const normalized = normalizeRut(value);
  if (!normalized) return false;
  const [body, digit] = normalized.split("-");
  if (/^(\d)\1+$/.test(body) || Number(body) === 0) return false;
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const result = 11 - (sum % 11);
  return digit === (result === 11 ? "0" : result === 10 ? "K" : String(result));
}

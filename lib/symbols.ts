export function normalizeSymbol(input: string): string {
  const raw = input.trim().toUpperCase();
  if (raw.endsWith('.NS') || raw.endsWith('.BO')) return raw;
  // Default to NSE when not specified
  return `${raw}.NS`;
}

export function formatCurrencyFromCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function centsToDollarsInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return "";
  }
  return (cents / 100).toFixed(2);
}

export function dollarsInputToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.round(parsed * 100);
}

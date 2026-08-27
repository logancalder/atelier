export function dollarsToCents(value: string | number) {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function sessionAmount(rateCents: number, durationMin: number) {
  return Math.round((rateCents * durationMin) / 60);
}

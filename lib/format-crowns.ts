const CROWNS_FORMAT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCrowns(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '0.00'
  return CROWNS_FORMAT.format(amount)
}

export function formatCrownsSigned(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '0.00'
  const sign = amount > 0 ? '+' : ''
  return `${sign}${CROWNS_FORMAT.format(amount)}`
}

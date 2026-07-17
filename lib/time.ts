export function isoTimestampHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

// A market is only really open if it hasn't passed its closes_at deadline —
// `status` can lag behind that moment until the close-expired-markets cron
// (or the on-load fallback) catches up, so display code must check both.
export function isMarketOpen(status: string, closesAt: string): boolean {
  return status === 'open' && new Date(closesAt).getTime() > Date.now()
}

export function displayNameFromEmail(email: string | null | undefined): string {
  if (!email) return 'anonymous'
  return email.split('@')[0] ?? 'anonymous'
}

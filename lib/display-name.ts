export function displayNameFromEmail(email: string | null | undefined): string {
  const localPart = (email ?? '').trim().split('@')[0]
  return localPart || 'anonymous'
}

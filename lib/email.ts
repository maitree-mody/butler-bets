// Best-effort admin email alerts via the Resend HTTP API (no SDK dependency
// needed for one endpoint). Mirrors reviewMarketDraft's fail-open pattern in
// app/actions/reviewMarket.ts: a missing/broken email path must never block
// the calling action — the in-app notification inserted alongside every
// call site here is the reliable path, this is a bonus.

const RESEND_API_URL = 'https://api.resend.com/emails'

export async function sendAdminAlertEmail(subject: string, body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  const adminEmails = (process.env.ADMIN_ALERT_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (!apiKey || !from || adminEmails.length === 0) {
    console.error(
      'sendAdminAlertEmail: RESEND_API_KEY / RESEND_FROM_EMAIL / ADMIN_ALERT_EMAILS not fully configured — skipping email (in-app notification still sent)',
    )
    return
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: adminEmails, subject, text: body }),
    })
    if (!res.ok) {
      console.error('sendAdminAlertEmail: Resend API returned', res.status, await res.text())
    }
  } catch (err) {
    console.error('sendAdminAlertEmail: failed to send, failing open', err)
  }
}

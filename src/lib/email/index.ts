// Outbound email behind one small adapter, so the provider can be swapped in one
// file. Today: Resend (https://resend.com), via its REST API, no extra package.
//
// Before real patient data: Resend is not hosted in the UAE. An invitation reveals
// that a clinic invited this email address, so a pilot should swap this adapter to
// a UAE-hosted sender (e.g. Azure Communication Services, UAE North) or the clinic's
// own mail system. See docs/data-governance.md.
//
// Sending never blocks care: callers treat a failed send as "share the link by
// hand", exactly as before email existed.

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Lets the provider drop accidental duplicates (e.g. a retried request). */
  idempotencyKey?: string;
}

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };

interface EmailConfig {
  provider: "resend";
  apiKey: string;
  from: string;
}

/** Resend's shared test sender delivers only to the Resend account owner's address. */
export const RESEND_TEST_SENDER = "ReproAI <onboarding@resend.dev>";

export function getEmailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return { provider: "resend", apiKey, from: process.env.EMAIL_FROM?.trim() || RESEND_TEST_SENDER };
}

export async function sendEmail(message: EmailMessage, config = getEmailConfig()): Promise<SendResult> {
  if (!config) return { ok: false, error: "Email is not configured (RESEND_API_KEY is not set)." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey } : {})
      },
      body: JSON.stringify({ from: config.from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
      signal: AbortSignal.timeout(10_000)
    });
    const data = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (!res.ok) return { ok: false, error: data?.message ?? `Email provider returned ${res.status}.` };
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Email could not be sent." };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * The invitation email. Deliberately discreet: anyone glancing at an inbox sees
 * only that a clinician invited the person to a private care record. No mention
 * of fertility, no health details, no name. English and Arabic in one message,
 * because the invitee's language is not known yet.
 */
export function buildInvitationEmail(inviteUrl: string): Omit<EmailMessage, "to" | "idempotencyKey"> {
  const subject = "Your clinician has invited you to ReproAI · دعوة من طبيبك إلى ReproAI";
  const text = [
    "Your clinician has invited you to a private ReproAI care record.",
    "",
    `Open this link to create your account: ${inviteUrl}`,
    "",
    "The link works once, and only with this email address. If you were not expecting this, you can ignore this email.",
    "",
    "—",
    "",
    "دعاك طبيبك إلى سجل رعاية خاص في ReproAI.",
    "",
    `افتح هذا الرابط لإنشاء حسابك: ${inviteUrl}`,
    "",
    "يعمل الرابط مرة واحدة، ومع عنوان البريد هذا فقط. إن لم تكن تتوقع هذه الرسالة، يمكنك تجاهلها."
  ].join("\n");
  const url = escapeHtml(inviteUrl);
  const button = (label: string) =>
    `<p style="margin:20px 0"><a href="${url}" style="background:#0c655e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:600">${label}</a></p>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f5f8f6;font-family:Arial,Helvetica,sans-serif;color:#173330">
<div style="max-width:520px;margin:0 auto;padding:28px 24px;background:#ffffff">
  <p style="font-size:18px;font-weight:700;color:#0c655e;margin:0 0 16px">ReproAI</p>
  <div dir="ltr" lang="en">
    <p style="font-size:15px;line-height:1.5">Your clinician has invited you to a private ReproAI care record.</p>
    ${button("Create your account")}
    <p style="font-size:13px;line-height:1.5;color:#71817d">The link works once, and only with this email address. If you were not expecting this, you can ignore this email.</p>
  </div>
  <hr style="border:none;border-top:1px solid #e3eae6;margin:24px 0">
  <div dir="rtl" lang="ar" style="text-align:right">
    <p style="font-size:15px;line-height:1.7">دعاك طبيبك إلى سجل رعاية خاص في ReproAI.</p>
    ${button("أنشئ حسابك")}
    <p style="font-size:13px;line-height:1.7;color:#71817d">يعمل الرابط مرة واحدة، ومع عنوان البريد هذا فقط. إن لم تكن تتوقع هذه الرسالة، يمكنك تجاهلها.</p>
  </div>
  <p style="font-size:12px;color:#71817d;margin-top:24px;word-break:break-all" dir="ltr">${url}</p>
</div></body></html>`;
  return { subject, text, html };
}

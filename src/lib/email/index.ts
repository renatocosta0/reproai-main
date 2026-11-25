// Outbound email behind one small adapter, so the provider can be swapped in one
// file. Uses Nodemailer over SMTP (clinic mail relay, UAE-hosted SMTP, or any
// standard SMTP server).
//
// Sending never blocks care: callers treat a failed send as "share the link by
// hand", exactly as before email existed.

import nodemailer from "nodemailer";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Lets the receiver or relay identify retried requests. */
  idempotencyKey?: string;
}

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };

export interface EmailConfig {
  provider: "nodemailer";
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

export const DEFAULT_SENDER = "ReproAI <noreply@reproai.local>";

export function getEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const parsedPort = Number(process.env.SMTP_PORT?.trim() || "587");
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 587;

  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure = secureEnv === "true" ? true : secureEnv === "false" ? false : port === 465;

  const user = process.env.SMTP_USER?.trim() || undefined;
  const pass = process.env.SMTP_PASS?.trim() || undefined;
  const from = process.env.EMAIL_FROM?.trim() || user || DEFAULT_SENDER;

  return { provider: "nodemailer", host, port, secure, user, pass, from };
}

export async function sendEmail(message: EmailMessage, config = getEmailConfig()): Promise<SendResult> {
  if (!config) return { ok: false, error: "Email is not configured (SMTP_HOST is not set)." };
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      ...(config.user && config.pass ? { auth: { user: config.user, pass: config.pass } } : {}),
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000
    });

    const info = await transporter.sendMail({
      from: config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      ...(message.idempotencyKey ? { headers: { "X-Idempotency-Key": message.idempotencyKey } } : {})
    });

    return { ok: true, id: info.messageId ?? null };
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

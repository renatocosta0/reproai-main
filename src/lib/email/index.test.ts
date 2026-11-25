import { afterEach, describe, expect, it, vi } from "vitest";

const { sendMailMock, createTransportMock } = vi.hoisted(() => {
  const sendMailMock = vi.fn();
  const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));
  return { sendMailMock, createTransportMock };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport: createTransportMock
  }
}));

import { buildInvitationEmail, DEFAULT_SENDER, getEmailConfig, sendEmail } from "./index";

const URL = "https://app.example/register?token=repro_inv_abc";

describe("buildInvitationEmail", () => {
  const email = buildInvitationEmail(URL);

  it("carries the link in both the text and HTML versions, in English and Arabic", () => {
    expect(email.text).toContain(URL);
    expect(email.html).toContain(URL);
    expect(email.html).toContain('lang="en"');
    expect(email.html).toContain('lang="ar"');
    expect(email.subject).toContain("ReproAI");
  });

  it("is discreet: no reproductive-health wording anywhere", () => {
    const all = `${email.subject} ${email.text} ${email.html}`.toLowerCase();
    for (const word of ["fertil", "reproduct", "amh", "sperm", "pregnan", "ivf", "egg", "خصوب", "إنجاب", "حمل"]) {
      expect(all).not.toContain(word);
    }
  });

  it("escapes the link in HTML", () => {
    const html = buildInvitationEmail('https://x.example/?a="><script>').html;
    expect(html).not.toContain("<script>");
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
  });
});

describe("sendEmail (Nodemailer)", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("is off without SMTP_HOST", async () => {
    vi.stubEnv("SMTP_HOST", "");
    expect(getEmailConfig()).toBeNull();
    expect(await sendEmail({ to: "a@b.c", subject: "s", text: "t", html: "h" })).toMatchObject({ ok: false });
  });

  it("sends via Nodemailer SMTP with credentials, sender and idempotency header", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.clinic.ae");
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("SMTP_USER", "invites@clinic.ae");
    vi.stubEnv("SMTP_PASS", "secret");
    vi.stubEnv("EMAIL_FROM", "");
    sendMailMock.mockResolvedValue({ messageId: "<msg_1@clinic.ae>" });

    const res = await sendEmail({ to: "a@b.c", subject: "s", text: "t", html: "h", idempotencyKey: "invitation-email/inv1-primary" });

    expect(res).toEqual({ ok: true, id: "<msg_1@clinic.ae>" });
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.clinic.ae",
        port: 587,
        secure: false,
        auth: { user: "invites@clinic.ae", pass: "secret" }
      })
    );
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "invites@clinic.ae",
        to: "a@b.c",
        subject: "s",
        text: "t",
        html: "h",
        headers: { "X-Idempotency-Key": "invitation-email/inv1-primary" }
      })
    );
  });

  it("uses secure=true automatically for port 465 and falls back to DEFAULT_SENDER when unauthenticated", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.internal.local");
    vi.stubEnv("SMTP_PORT", "465");
    vi.stubEnv("SMTP_SECURE", "");
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASS", "");
    vi.stubEnv("EMAIL_FROM", "");
    sendMailMock.mockResolvedValue({ messageId: "<msg_2@internal.local>" });

    const res = await sendEmail({ to: "a@b.c", subject: "s", text: "t", html: "h" });
    expect(res).toEqual({ ok: true, id: "<msg_2@internal.local>" });
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ host: "smtp.internal.local", port: 465, secure: true })
    );
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ from: DEFAULT_SENDER }));
  });

  it("reports SMTP errors without throwing", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.clinic.ae");
    sendMailMock.mockRejectedValue(new Error("Invalid login"));

    expect(await sendEmail({ to: "a@b.c", subject: "s", text: "t", html: "h" })).toEqual({ ok: false, error: "Invalid login" });
  });
});

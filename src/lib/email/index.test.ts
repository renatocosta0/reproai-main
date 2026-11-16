import { afterEach, describe, expect, it, vi } from "vitest";
import { buildInvitationEmail, getEmailConfig, RESEND_TEST_SENDER, sendEmail } from "./index";

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

describe("sendEmail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("is off without an API key", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(getEmailConfig()).toBeNull();
    expect(await sendEmail({ to: "a@b.c", subject: "s", text: "t", html: "h" })).toMatchObject({ ok: false });
  });

  it("posts to Resend with the key, sender and idempotency key", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "msg_1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await sendEmail({ to: "a@b.c", subject: "s", text: "t", html: "h", idempotencyKey: "invitation-email/inv1-primary" });

    expect(res).toEqual({ ok: true, id: "msg_1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(init.headers["Idempotency-Key"]).toBe("invitation-email/inv1-primary");
    expect(JSON.parse(init.body)).toMatchObject({ from: RESEND_TEST_SENDER, to: ["a@b.c"] });
  });

  it("reports provider errors and network failures without throwing", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "domain not verified" }), { status: 403 })));
    expect(await sendEmail({ to: "a@b.c", subject: "s", text: "t", html: "h" })).toEqual({ ok: false, error: "domain not verified" });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect(await sendEmail({ to: "a@b.c", subject: "s", text: "t", html: "h" })).toEqual({ ok: false, error: "network down" });
  });
});

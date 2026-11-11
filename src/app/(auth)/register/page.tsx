import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { resolveInviteToken } from "@/lib/invites";

export const dynamic = "force-dynamic";

// Prescription-gated registration. The token is checked on the server before
// anything renders, so an invalid link never shows the form.
export default async function RegisterPage({
  searchParams
}: {
  searchParams: { token?: string | string[] };
}) {
  const token = typeof searchParams.token === "string" ? searchParams.token : "";
  const invite = token ? await resolveInviteToken(token) : null;

  if (!invite) {
    return (
      <AuthShell>
        <div className="gate-card">
          <div className="gate-icon">
            <MailCheck size={22} aria-hidden />
          </div>
          <div>
            <div className="eyebrow">{token ? "Link not valid" : "Secure activation"}</div>
            <h2 style={{ marginTop: 10 }}>Invitation Required</h2>
          </div>
          <p>
            ReproAI requires a clinical prescription or a partner pairing invite to activate an
            account. Please verify your invitation link or contact your clinic.
          </p>
          {token && (
            <p style={{ fontSize: 13 }}>
              This link may have already been used or may have expired. Partner invitations are
              valid for 7 days.
            </p>
          )}
          <Link href="/login" className="secondary-link">
            <ArrowLeft size={16} aria-hidden /> Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <RegisterForm
        token={token}
        kind={invite.kind}
        email={invite.allowedEmails[0] ?? ""}
        name={invite.kind === "CLINIC" ? invite.name : null}
        sex={invite.kind === "CLINIC" ? invite.sex : null}
        senderName={invite.kind === "PARTNER" ? invite.senderName : null}
      />
    </AuthShell>
  );
}

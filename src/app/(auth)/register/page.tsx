import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { RegisterInviteGate } from "@/components/auth/InviteGates";
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
        <RegisterInviteGate hadToken={Boolean(token)} />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <RegisterForm
        token={token}
        kind={invite.kind}
        // A couple prescription is valid for either partner's email, so let them type it.
        email={invite.allowedEmails.length === 1 ? invite.allowedEmails[0] : ""}
        // The form shows the couple-email hint in the reader's language.
        emailHint={invite.allowedEmails.length > 1 ? "couple" : undefined}
        name={invite.kind === "CLINIC" && invite.allowedEmails.length === 1 ? invite.name : null}
        sex={invite.kind === "CLINIC" && invite.allowedEmails.length === 1 ? invite.sex : null}
        senderName={invite.kind === "PARTNER" ? invite.senderName : null}
      />
    </AuthShell>
  );
}

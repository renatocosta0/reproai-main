import { AuthShell } from "@/components/auth/AuthShell";
import { PairInvalidGate, PairInviteGate } from "@/components/auth/InviteGates";
import { LocaleProvider } from "@/components/i18n/LocaleContext";
import { getSession } from "@/lib/auth";
import { resolveInviteToken } from "@/lib/invites";

export const dynamic = "force-dynamic";

// Landing page for partner pairing links (/pair?token=...). Signed-in patients
// accept here; everyone else chooses to sign in or activate a new account.
export default async function PairPage({ searchParams }: { searchParams: { token?: string | string[] } }) {
  const token = typeof searchParams.token === "string" ? searchParams.token : "";
  const invite = token ? await resolveInviteToken(token) : null;
  const session = await getSession();
  const role = session?.role === "PATIENT" || session?.role === "CLINICIAN" ? session.role : null;

  return (
    <LocaleProvider>
      <AuthShell>
        {!invite || invite.kind !== "PARTNER" ? (
          <PairInvalidGate />
        ) : (
          <PairInviteGate token={token} senderName={invite.senderName ?? null} role={role} />
        )}
      </AuthShell>
    </LocaleProvider>
  );
}

import Link from "next/link";
import { ArrowRight, HeartHandshake, LogIn, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AcceptPairing } from "@/components/auth/AcceptPairing";
import { getSession } from "@/lib/auth";
import { resolveInviteToken } from "@/lib/invites";

export const dynamic = "force-dynamic";

// Landing page for partner pairing links (/pair?token=...). Signed-in patients
// accept here; everyone else chooses to sign in or activate a new account.
export default async function PairPage({ searchParams }: { searchParams: { token?: string | string[] } }) {
  const token = typeof searchParams.token === "string" ? searchParams.token : "";
  const invite = token ? await resolveInviteToken(token) : null;
  const session = await getSession();

  if (!invite || invite.kind !== "PARTNER") {
    return (
      <AuthShell>
        <div className="gate-card">
          <div className="gate-icon"><MailCheck size={22} aria-hidden /></div>
          <h2>This link isn&apos;t valid</h2>
          <p>
            The partner invitation may have expired, been used already, or been withdrawn. Invitations last 7 days. Ask
            your partner to send a new one from their Couple link page.
          </p>
          <Link href="/login" className="secondary-link">Go to sign in</Link>
        </div>
      </AuthShell>
    );
  }

  const nextPath = `/pair?token=${encodeURIComponent(token)}`;
  const from = invite.senderName ?? "Your partner";

  return (
    <AuthShell>
      <div className="gate-card">
        <div className="gate-icon"><HeartHandshake size={22} aria-hidden /></div>
        <div>
          <div className="eyebrow">Partner invitation</div>
          <h2 style={{ marginTop: 10 }}>{from} invited you to link accounts</h2>
        </div>
        <p>
          Linking adds a joint view for planning a pregnancy together. Your own records stay private to you, and either
          of you can remove the link at any time.
        </p>
        {session?.role === "PATIENT" ? (
          <AcceptPairing token={token} />
        ) : session?.role === "CLINICIAN" ? (
          <p style={{ fontSize: 13 }}>You are signed in as a clinician. Partner links are for patient accounts.</p>
        ) : (
          <>
            <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="primary wide" style={{ textDecoration: "none" }}>
              <LogIn size={17} /> I already have an account
            </Link>
            <Link href={`/register?token=${encodeURIComponent(token)}`} className="secondary-link">
              I&apos;m new to ReproAI <ArrowRight size={16} />
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}

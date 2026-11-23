"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { RegisterInviteGate } from "@/components/auth/InviteGates";
import { api } from "@/lib/api-client";

interface InviteDetails {
  valid: true;
  kind: "CLINIC" | "PARTNER";
  email: string | null;
  emailHint?: "couple" | null;
  name?: string | null;
  sex?: string | null;
  senderName?: string | null;
}

export default function RegisterPage() {
  const [token, setToken] = useState("");
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const inviteToken = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(inviteToken);
    if (!inviteToken) {
      setLoading(false);
      return () => { active = false; };
    }

    api<InviteDetails>(`/api/auth/invite?token=${encodeURIComponent(inviteToken)}`)
      .then((details) => { if (active && details.valid) setInvite(details); })
      .catch(() => { if (active) setInvite(null); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  return (
    <AuthShell>
      {loading ? (
        <div className="gate-card" role="status" aria-live="polite">
          <Loader2 size={22} className="spin" aria-hidden />
        </div>
      ) : invite ? (
        <RegisterForm
          token={token}
          kind={invite.kind}
          email={invite.email ?? ""}
          emailHint={invite.kind === "CLINIC" ? invite.emailHint ?? undefined : undefined}
          name={invite.kind === "CLINIC" ? invite.name ?? null : null}
          sex={invite.kind === "CLINIC" ? invite.sex ?? null : null}
          senderName={invite.kind === "PARTNER" ? invite.senderName ?? null : null}
        />
      ) : (
        <RegisterInviteGate hadToken={Boolean(token)} />
      )}
    </AuthShell>
  );
}

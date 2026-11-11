"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";

export function AcceptPairing({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");
    try {
      await api("/api/pairing/accept", { method: "POST", body: JSON.stringify({ token }) });
      router.replace("/patient/pairing");
      router.refresh();
    } catch (err) {
      setError(userMessage(err, "Could not accept the invitation."));
      setBusy(false);
    }
  }

  return (
    <>
      {error && <FormError>{error}</FormError>}
      <button className="primary wide" onClick={accept} disabled={busy}>
        <HeartHandshake size={17} /> {busy ? "Linking…" : "Accept and link accounts"}
      </button>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { useLocale } from "@/components/i18n/LocaleContext";

const S = {
  en: { error: "Could not accept the invitation.", linking: "Linking…", accept: "Accept and link accounts" },
  ar: { error: "تعذّر قبول الدعوة.", linking: "جارٍ الربط…", accept: "قبول وربط الحسابين" }
};

export function AcceptPairing({ token }: { token: string }) {
  const router = useRouter();
  const L = S[useLocale().locale];
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
      setError(userMessage(err, L.error));
      setBusy(false);
    }
  }

  return (
    <>
      {error && <FormError>{error}</FormError>}
      <button className="primary wide" onClick={accept} disabled={busy}>
        <HeartHandshake size={17} /> {busy ? L.linking : L.accept}
      </button>
    </>
  );
}

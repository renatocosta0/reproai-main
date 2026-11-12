"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { CLINICIAN_STRINGS } from "@/lib/i18n-clinician";

/** Read-only field showing an absolute URL for a relative path, with a copy button. */
export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const L = CLINICIAN_STRINGS[useLocale().locale];
  const url = typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the field is selectable */
    }
  }

  return (
    <div className="copy-link">
      <input readOnly dir="ltr" value={url} onFocus={(e) => e.currentTarget.select()} aria-label={L.invitationLink} />
      <button type="button" onClick={copy} aria-label={L.copyLink}>
        {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? L.copied : L.copy}
      </button>
    </div>
  );
}

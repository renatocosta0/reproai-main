"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Read-only field showing an absolute URL for a relative path, with a copy button. */
export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
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
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Invitation link" />
      <button type="button" onClick={copy} aria-label="Copy link">
        {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

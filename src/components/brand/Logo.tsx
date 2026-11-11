import { HeartHandshake } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark">
        <HeartHandshake size={20} strokeWidth={2.1} aria-hidden />
      </div>
      {!compact && (
        <span>
          Repro<span>AI</span>
        </span>
      )}
    </div>
  );
}

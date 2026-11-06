import { type ReactNode } from "react";
import Link from "next/link";

export type IconName =
  | "alert"
  | "arrow"
  | "calendar"
  | "chart"
  | "check"
  | "database"
  | "download"
  | "external"
  | "heart"
  | "info"
  | "leaf"
  | "lock"
  | "moon"
  | "person"
  | "plus"
  | "refresh"
  | "send"
  | "shield"
  | "spark"
  | "thermometer";

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    alert: (
      <>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9v4m0 3h.01" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4m8-4v4M3 10h18" />
      </>
    ),
    chart: <path d="M4 19V9m6 10V5m6 14v-7m4 7V3" />,
    check: <path d="m5 12 4 4L19 6" />,
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5m-16 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    external: <path d="M14 4h6v6m0-6-9 9M19 14v5H5V5h5" />,
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6m0-10h.01" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 4C10 4 5 9 5 16c4 1 11-1 15-12Z" />
        <path d="M4 20c3-5 7-8 12-11" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    moon: <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" />,
    person: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c.8-5 3.5-7 8-7s7.2 2 8 7" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M19 12a7 7 0 1 0-2 5" />
      </>
    ),
    send: <path d="m22 2-7 20-4-9-9-4 20-7Z" />,
    shield: (
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Zm-3-10 2 2 4-5" />
    ),
    spark: (
      <path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2Zm7 13 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
    ),
    thermometer: (
      <>
        <path d="M14 14.8V5a4 4 0 0 0-8 0v9.8a6 6 0 1 0 8 0Z" />
        <path d="M10 7v10" />
      </>
    )
  };

  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="button-icon">
      <path
        d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function PatientIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="button-icon">
      <circle
        cx="10"
        cy="7"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4.5 16c.7-3 2.5-4.5 5.5-4.5s4.8 1.5 5.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function ClinicianIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="button-icon">
      <path
        d="M7 4.5h6M10 1.5v6M4 8h12v9H4z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="wordmark" aria-label="ReproAI home">
      <span className="wordmark-symbol" aria-hidden="true">
        <span />
        <span />
      </span>
      ReproAI
    </Link>
  );
}


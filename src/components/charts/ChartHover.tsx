"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

/**
 * Hover / tap / keyboard read-out for a chart whose points sit at known horizontal
 * positions. Place it inside a `position: relative` chart box; it covers the box,
 * snaps to the nearest point and shows a guide line plus a small label.
 * Values come from the chart's own data: nothing here is computed or estimated.
 */
export function ChartHover({
  count,
  xFraction,
  yFraction,
  label,
  ariaLabel
}: {
  count: number;
  /** Horizontal position of point i, 0 (left) to 1 (right). */
  xFraction: (i: number) => number;
  /** Optional vertical position of point i, 0 (top) to 1 (bottom), for a dot. */
  yFraction?: (i: number) => number;
  label: (i: number) => ReactNode;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  function nearest(clientX: number) {
    const box = ref.current?.getBoundingClientRect();
    if (!box || count === 0) return null;
    const f = (clientX - box.left) / box.width;
    let best = 0;
    for (let i = 1; i < count; i++) {
      if (Math.abs(xFraction(i) - f) < Math.abs(xFraction(best) - f)) best = i;
    }
    return best;
  }

  function onPointer(e: PointerEvent<HTMLDivElement>) {
    setActive(nearest(e.clientX));
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (count === 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      setActive((a) => Math.min(count - 1, Math.max(0, (a ?? (step > 0 ? -1 : count)) + step)));
    } else if (e.key === "Escape") {
      setActive(null);
    }
  }

  const left = active !== null ? xFraction(active) * 100 : 0;
  const top = active !== null && yFraction ? yFraction(active) * 100 : null;

  return (
    <div
      ref={ref}
      className="chart-hover"
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={1}
      aria-valuemax={count}
      aria-valuenow={active !== null ? active + 1 : undefined}
      aria-valuetext={active !== null ? String(textOf(label(active))) : undefined}
      onPointerMove={onPointer}
      onPointerDown={onPointer}
      onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
      onKeyDown={onKey}
      onBlur={() => setActive(null)}
    >
      {active !== null && (
        <>
          <span className="chart-hover-guide" style={{ left: `${left}%` }} aria-hidden />
          {top !== null && <span className="chart-hover-dot" style={{ left: `${left}%`, top: `${top}%` }} aria-hidden />}
          <span className={`chart-hover-tip ${left > 70 ? "end" : left < 30 ? "start" : ""}`} style={{ left: `${left}%` }}>
            {label(active)}
          </span>
        </>
      )}
    </div>
  );
}

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (typeof node === "object" && "props" in node) return textOf((node as { props: { children?: ReactNode } }).props.children);
  return "";
}

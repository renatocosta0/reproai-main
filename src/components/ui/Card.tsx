import { type CSSProperties, type ReactNode } from "react";

export function Card({
  title,
  className = "",
  style,
  children
}: {
  title?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section className={`card ${className}`} style={style}>
      {title && <h2 className="card-title">{title}</h2>}
      {children}
    </section>
  );
}

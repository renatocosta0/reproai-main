// Maps a real model probability to a risk label. Given no probability, renders
// an explicit "no prediction" state rather than inventing a level.
export function RiskBadge({ probability }: { probability?: number | null }) {
  if (typeof probability !== "number") {
    return <span className="text-xs text-gray-400">No prediction</span>;
  }
  const { label, cls } =
    probability >= 50
      ? { label: "Higher chance", cls: "bg-green-100 text-green-700" }
      : probability >= 25
        ? { label: "Moderate", cls: "bg-amber-100 text-amber-700" }
        : { label: "Lower chance", cls: "bg-red-100 text-red-700" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label} · {probability}%
    </span>
  );
}

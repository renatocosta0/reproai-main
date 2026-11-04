export function Card({
  title,
  children
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {title && <h2 className="mb-3 text-lg font-semibold text-gray-800">{title}</h2>}
      {children}
    </section>
  );
}

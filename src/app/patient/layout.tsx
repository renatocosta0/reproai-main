import { PatientNav } from "@/components/layout/PatientNav";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <PatientNav />
      <div className="mx-auto max-w-4xl p-8">{children}</div>
    </div>
  );
}

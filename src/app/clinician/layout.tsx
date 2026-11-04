import { ClinicianNav } from "@/components/layout/ClinicianNav";

export default function ClinicianLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <ClinicianNav />
      <div className="mx-auto max-w-5xl p-8">{children}</div>
    </div>
  );
}

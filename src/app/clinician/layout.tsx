import { ClinicianNav } from "@/components/layout/ClinicianNav";

export default function ClinicianLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="workspace">
      <ClinicianNav />
      {children}
    </div>
  );
}

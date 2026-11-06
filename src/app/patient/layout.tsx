import { PatientNav } from "@/components/layout/PatientNav";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="workspace">
      <PatientNav />
      {children}
    </div>
  );
}

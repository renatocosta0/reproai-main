import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LandingView } from "@/components/landing/LandingView";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  let userEmail: string | null = null;
  let userRole: string = "PATIENT";

  if (session?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, role: true }
    });
    userEmail = user?.email ?? null;
    userRole = user?.role ?? session.role;
  }

  return (
    <LandingView
      initialHasSession={Boolean(session && userEmail)}
      initialEmail={userEmail ?? "patient.a@reproai.dev"}
      initialRole={userRole}
    />
  );
}

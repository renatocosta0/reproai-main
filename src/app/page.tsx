import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/ui/LogoutButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  let userEmail: string | null = null;

  if (session?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true }
    });
    userEmail = user?.email ?? null;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-gray-50/50">
      <div className="text-center max-w-xl">
        <h1 className="text-4xl font-bold text-brand">ReproAI</h1>
        <p className="mt-3 text-gray-600 leading-relaxed">
          Personalized fertility success prediction and infertility management, treating
          infertility as a couple&apos;s journey.
        </p>
      </div>

      {session && userEmail ? (
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center space-y-4">
          <div className="space-y-1">
            <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-brand">
              Active Session
            </span>
            <p className="text-sm text-gray-700">
              Signed in as <strong className="font-semibold text-gray-900">{userEmail}</strong>
            </p>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Role: {session.role}
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Link
              href={session.role === "CLINICIAN" ? "/clinician/dashboard" : "/patient/dashboard"}
              className="w-full rounded-lg bg-brand px-6 py-3 text-center text-white font-medium hover:opacity-95 transition-opacity"
            >
              Continue to {session.role === "CLINICIAN" ? "Clinician" : "Patient"} Dashboard
            </Link>

            <LogoutButton
              className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-colors"
              redirectTo="/"
            >
              Log out / Switch account
            </LogoutButton>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/login"
              className="rounded-lg bg-brand px-6 py-3 text-white font-medium hover:opacity-95 shadow-sm transition-all"
            >
              Sign in as Patient
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-brand px-6 py-3 text-brand font-medium hover:bg-brand/5 transition-all"
            >
              Sign in as Clinician
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            New to ReproAI?{" "}
            <Link href="/register" className="text-brand font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homeForRole } from "@/lib/api-client";
import { LocaleProvider } from "@/components/i18n/LocaleContext";
import { Landing } from "@/components/landing/Landing";

export const dynamic = "force-dynamic";

// Entry point: signed-in users go to their workspace; everyone else sees the
// public landing page, which links to sign-in and (when enabled) the demo.
export default async function Home() {
  const session = await getSession();
  if (session) redirect(homeForRole(session.role));
  return (
    <LocaleProvider>
      <Landing demoEnabled={process.env.DEMO_LOGIN_ENABLED === "true"} />
    </LocaleProvider>
  );
}

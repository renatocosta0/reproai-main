import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homeForRole } from "@/lib/api-client";

export const dynamic = "force-dynamic";

// Entry point: send signed-in users to their workspace, everyone else to sign in.
export default async function Home() {
  const session = await getSession();
  redirect(session ? homeForRole(session.role) : "/login");
}

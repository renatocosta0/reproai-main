import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/i18n/LocaleContext";

// Sign-in pages follow the same English/Arabic choice as the portals.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

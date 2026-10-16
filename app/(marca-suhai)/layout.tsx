import type { Metadata } from "next";

import { PageAnalytics } from "@/components/analytics/PageAnalytics";
import { HOST_SUHAI } from "@/lib/suhai-host";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${HOST_SUHAI}`),
  robots: { index: false, follow: false },
};

export default function MarcaSuhaiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageAnalytics />
      <main id="main-content">{children}</main>
    </>
  );
}

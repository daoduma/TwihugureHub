// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: {
    default: "TwihugureHub",
    template: "%s | TwihugureHub",
  },
  description: "Agricultural Training Platform for Rwanda",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider session={session}>
          <I18nProvider language={session?.user?.preferredLanguage}>
            {children}
          </I18nProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

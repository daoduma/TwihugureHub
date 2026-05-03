// app/layout.tsx
// CHANGED: Added ToastProvider, ErrorBoundary, favicon, and global title
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "TwihugureHub",
    template: "%s — TwihugureHub",
  },
  description: "Multilingual agricultural training platform for Rwanda",
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon-192x192.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body className={inter.className} style={{ backgroundColor: "#F8F9FA", color: "#1B1B1B" }}>
        <SessionProvider>
          <I18nProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            {/* CHANGED: Global toast notifications */}
            <ToastProvider />
          </I18nProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

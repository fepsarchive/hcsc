import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Geist } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { DemoProvider } from "@/components/layout/demo-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hybrid Cloud Security Console",
  description: "Hibrit bulut veri güvenliği için aktif savunma tabanlı tez prototipi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", manrope.variable, plexMono.variable, "font-sans", geist.variable)}
    >
      <body className="h-svh min-h-full overflow-hidden bg-slate-950">
        <ThemeProvider>
          <DemoProvider>
            <AppShell>{children}</AppShell>
          </DemoProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

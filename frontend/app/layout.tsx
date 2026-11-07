import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectProvider } from "@/lib/project-context";

export const metadata: Metadata = {
  title: "NestFlix — Affordable housing funding, simplified",
  description:
    "Bridging the Gap Between Housing Dreams and Funding Reality. A prototype funding decision-support tool with synthetic demo data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <ProjectProvider>
          <AppShell>{children}</AppShell>
        </ProjectProvider>
      </body>
    </html>
  );
}

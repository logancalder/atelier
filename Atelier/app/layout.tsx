import { GooeyFilter } from "@/components/gooey";
import type { Metadata } from "next";
import { ToastProvider } from "@/components/toast";
import { WorkspaceFrame } from "@/components/workspace-frame";
import "./globals.css";
import "./workbench.css";

export const metadata: Metadata = {
  title: "Atelier",
  description: "A private desk for coding practice and tutoring work.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full"><GooeyFilter /><ToastProvider><WorkspaceFrame>{children}</WorkspaceFrame></ToastProvider></body>
    </html>
  );
}

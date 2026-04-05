import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "match-a — Volunteer Lifecycle Platform",
  description:
    "Strengthening BC's nonprofit workforce through smart matching, crisis mobilization, retention, and knowledge continuity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}

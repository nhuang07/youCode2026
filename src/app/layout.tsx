import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Match-a",
  description:
    "Strengthening BC's nonprofit workforce through smart matching, crisis mobilization, retention, and knowledge continuity.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
  },
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

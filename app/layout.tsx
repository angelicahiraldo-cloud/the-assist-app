import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Assist — Athlete Research Studio",
  description: "Find the right partnership. Start with the evidence.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

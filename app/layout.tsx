import React from "react";
import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";

import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QueryGen",
  description: "AI-powered MySQL query generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased ${dmSans.className}`}>
        {children}
      </body>
    </html>
  );
}

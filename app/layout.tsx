import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Great_Vibes, Poppins } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
});

const greatVibes = Great_Vibes({
  variable: "--font-script",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Baihaqie Ar Rafi",
  description: "Portfolio digital Baihaqie Ar Rafi — holographic interactive experience.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} ${greatVibes.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
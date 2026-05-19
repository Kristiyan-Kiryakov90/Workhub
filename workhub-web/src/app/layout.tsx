import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PublicFooter } from "./components/public-footer";
import { PublicHeader } from "./components/public-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WorkHub | Workforce Administration Platform",
  description:
    "WorkHub helps multi-organization teams manage departments, employees, leave, shifts, tasks, and permissions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-950">
        <PublicHeader />
        <main className="flex-1">{children}</main>
        <PublicFooter />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  UserButton,
  Show,
} from "@clerk/nextjs";
import Link from "next/link";
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
  title: "Pulse",
  description: "Self-serve product analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <header className="flex h-16 items-center justify-between border-b border-black/[.08] px-6 dark:border-white/[.145]">
            <Link href="/" className="font-semibold tracking-tight">
              Pulse
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium">
              {/* Clerk 7 replaced <SignedIn>/<SignedOut> with <Show when=...>. */}
              <Show when="signed-out">
                <SignInButton />
                <SignUpButton />
              </Show>
              <Show when="signed-in">
                <Link href="/dashboard">Dashboard</Link>
                <UserButton />
              </Show>
            </nav>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

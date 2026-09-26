import type { Metadata } from "next";
import Link from "next/link";
import { FileLock2 } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = { title: "NoteShare — Secure note sharing", description: "Share notes with secure, expiring links" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="sticky top-0 z-50 border-b bg-white/70 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-md shadow-indigo-500/25 transition-transform group-hover:scale-105">
                <FileLock2 className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold tracking-tight">Note<span className="text-gradient">Share</span></span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium">
              {session ? (
                <>
                  <Link href="/notes" className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">My Notes</Link>
                  <Link href="/notes/new" className="rounded-lg bg-gradient-brand px-4 py-2 text-white shadow-md shadow-indigo-500/25 transition-all hover:brightness-110 active:scale-95">+ New Note</Link>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">Login</Link>
                  <Link href="/register" className="rounded-lg bg-gradient-brand px-4 py-2 text-white shadow-md shadow-indigo-500/25 transition-all hover:brightness-110 active:scale-95">Get started</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
      </body>
    </html>
  );
}

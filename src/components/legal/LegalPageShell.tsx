import Link from "next/link";
import type { ReactNode } from "react";

interface LegalPageShellProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPageShell({ title, lastUpdated, children }: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-wide text-violet-400 hover:text-violet-300">
            ARI Press Automation
          </Link>
          <Link href="/" className="btn-secondary !py-1.5 !text-xs">
            Back to homepage
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="card p-6 sm:p-10">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-zinc-500">Last updated: {lastUpdated}</p>
          <div className="prose prose-invert mt-8 max-w-none space-y-8 text-zinc-300">{children}</div>
        </div>

        <div className="mt-8 flex flex-wrap gap-4 text-sm text-zinc-500">
          <Link href="/terms" className="hover:text-zinc-300">
            Terms of Service
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy" className="hover:text-zinc-300">
            Privacy Policy
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/login" className="hover:text-zinc-300">
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-300">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

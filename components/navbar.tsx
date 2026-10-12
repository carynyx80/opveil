"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { OpveilLogo } from "./logo";
import { useTheme } from "./theme-provider";

const LINKS = [
  { href: "/analyze", label: "Analyze" },
  { href: "/compare", label: "Compare" },
  { href: "/history", label: "History" },
  { href: "/docs", label: "Docs" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const path = usePathname();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ov-border)] bg-[color-mix(in_srgb,var(--ov-bg)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Opveil home">
          <OpveilLogo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                path.startsWith(l.href)
                  ? "bg-[var(--ov-accent-dim)] text-[var(--ov-accent-hover)]"
                  : "text-[var(--ov-muted)] hover:bg-[var(--ov-accent-dim)] hover:text-[var(--ov-text)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={toggle}
            className="ov-btn-ghost ml-2 inline-flex h-9 w-9 items-center justify-center"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link href="/analyze" className="ov-btn-bronze ml-2 px-4 py-2 text-sm">
            Analyze contract
          </Link>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggle}
            className="ov-btn-ghost inline-flex h-9 w-9 items-center justify-center"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="ov-btn-ghost inline-flex h-9 w-9 items-center justify-center"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-[var(--ov-border)] px-4 py-3 md:hidden" aria-label="Mobile">
          <div className="grid gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                  path.startsWith(l.href)
                    ? "bg-[var(--ov-accent-dim)] text-[var(--ov-accent-hover)]"
                    : "text-[var(--ov-muted)]"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link href="/analyze" onClick={() => setOpen(false)} className="ov-btn-bronze mt-2 px-4 py-2.5 text-center text-sm">
              Analyze contract
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

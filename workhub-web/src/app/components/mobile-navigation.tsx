"use client";

import Link from "next/link";
import { useState } from "react";

type NavigationItem = {
  href: string;
  label: string;
};

export function MobileNavigation({
  navigation,
}: {
  navigation: NavigationItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Toggle navigation menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-800 transition hover:bg-slate-100"
      >
        <span className="sr-only">Open menu</span>
        <span aria-hidden="true" className="flex flex-col gap-1">
          <span className="h-0.5 w-5 rounded bg-current" />
          <span className="h-0.5 w-5 rounded bg-current" />
          <span className="h-0.5 w-5 rounded bg-current" />
        </span>
      </button>

      {isOpen ? (
        <nav
          aria-label="Mobile public navigation"
          className="absolute left-4 right-4 top-16 rounded-md border border-slate-200 bg-white p-2 shadow-lg"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="block rounded-md px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

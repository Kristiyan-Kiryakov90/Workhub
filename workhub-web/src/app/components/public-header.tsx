import Link from "next/link";
import { MobileNavigation } from "./mobile-navigation";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Login" },
  { href: "/register-organization", label: "Register Organization" },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 text-lg font-semibold tracking-normal text-slate-950"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-700 text-sm font-bold text-white">
            WH
          </span>
          <span>WorkHub</span>
        </Link>

        <nav aria-label="Public navigation" className="hidden items-center gap-2 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <MobileNavigation navigation={navigation} />
      </div>
    </header>
  );
}

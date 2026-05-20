import Link from "next/link";
import { logoutAction } from "@/modules/auth/actions/auth-actions";
import { createCsrfToken } from "@/modules/auth/services/csrf-service";
import { getCurrentSessionPayload } from "@/modules/auth/services/session-service";
import { MobileNavigation, type HeaderUser } from "./mobile-navigation";

const publicNavigation = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Login" },
  { href: "/register-organization", label: "Register Organization" },
];

const appNavigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/leave", label: "Leaves" },
];

export async function PublicHeader() {
  const currentSession = await getCurrentSessionPayload();
  const currentUser = currentSession
    ? ({
        name: currentSession.name ?? currentSession.email,
        organizationName: currentSession.organizationName ?? "WorkHub",
      } satisfies HeaderUser)
    : null;
  const logoutCsrfToken = currentUser ? await createCsrfToken("logout") : null;
  const navigation = currentUser ? appNavigation : publicNavigation;

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

        <nav aria-label="Primary navigation" className="hidden items-center gap-2 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
          {currentUser ? (
            <div className="ml-2 flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="text-right">
                <p className="text-sm font-semibold leading-5 text-slate-950">
                  {currentUser.name}
                </p>
                <p className="text-xs leading-4 text-slate-500">
                  {currentUser.organizationName}
                </p>
              </div>
              <form action={logoutAction}>
                {logoutCsrfToken ? (
                  <input
                    type="hidden"
                    name="csrfToken"
                    value={logoutCsrfToken}
                  />
                ) : null}
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  Logout
                </button>
              </form>
            </div>
          ) : null}
        </nav>

        <MobileNavigation
          navigation={navigation}
          currentUser={currentUser}
          logoutCsrfToken={logoutCsrfToken}
        />
      </div>
    </header>
  );
}

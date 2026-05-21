"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { logoutAction } from "@/modules/auth/actions/auth-actions";
import { MobileNavigation, type HeaderUser } from "./mobile-navigation";

const publicNavigation = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Login" },
  { href: "/register-organization", label: "Register Organization" },
  { href: "/about", label: "About" },
];

const appNavigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/leave", label: "Leaves" },
  { href: "/shifts", label: "Shifts" },
];

type HeaderSession = {
  currentUser: HeaderUser | null;
  logoutCsrfToken: string | null;
  unreadNotificationCount: number;
  canViewReports: boolean;
};

const emptyHeaderSession: HeaderSession = {
  currentUser: null,
  logoutCsrfToken: null,
  unreadNotificationCount: 0,
  canViewReports: false,
};

export function HeaderSessionNavigation() {
  const [session, setSession] = useState<HeaderSession>(emptyHeaderSession);

  useEffect(() => {
    let isActive = true;

    async function loadHeaderSession() {
      try {
        const response = await fetch("/api/header-session", {
          cache: "no-store",
        });

        if (!response.ok || !isActive) {
          return;
        }

        setSession(await response.json());
      } catch {
        if (isActive) {
          setSession(emptyHeaderSession);
        }
      }
    }

    loadHeaderSession();

    return () => {
      isActive = false;
    };
  }, []);

  const navigation = session.currentUser
    ? session.canViewReports
      ? [...appNavigation, { href: "/reports", label: "Analytics" }]
      : appNavigation
    : publicNavigation;

  return (
    <>
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
        {session.currentUser ? (
          <div className="ml-2 flex items-center gap-3 border-l border-slate-200 pl-4">
            <Link
              href="/notifications"
              className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Notifications
              {session.unreadNotificationCount > 0
                ? ` (${session.unreadNotificationCount})`
                : ""}
            </Link>
            <div className="text-right">
              <p className="text-sm font-semibold leading-5 text-slate-950">
                {session.currentUser.name}
              </p>
              <p className="text-xs leading-4 text-slate-500">
                {session.currentUser.organizationName}
              </p>
            </div>
            <form action={logoutAction}>
              {session.logoutCsrfToken ? (
                <input
                  type="hidden"
                  name="csrfToken"
                  value={session.logoutCsrfToken}
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
        currentUser={session.currentUser}
        logoutCsrfToken={session.logoutCsrfToken}
        unreadNotificationCount={session.unreadNotificationCount}
      />
    </>
  );
}

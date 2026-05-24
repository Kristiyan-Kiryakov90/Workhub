import Link from "next/link";
import { getCurrentSessionPayload } from "@/modules/auth/services/session-service";
import { HeaderSessionNavigation } from "./header-session-navigation";

export async function PublicHeader() {
  const sessionPayload = await getCurrentSessionPayload();
  const session = sessionPayload
    ? {
        currentUser: {
          name: sessionPayload.name ?? sessionPayload.email,
          organizationName: sessionPayload.organizationName ?? "WorkHub",
        },
        logoutCsrfToken: null,
        unreadNotificationCount: 0,
        canViewReports: false,
        isMainAdmin: false,
      }
    : {
        currentUser: null,
        logoutCsrfToken: null,
        unreadNotificationCount: 0,
        canViewReports: false,
        isMainAdmin: false,
      };

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

        <HeaderSessionNavigation
          key={sessionPayload?.jti ?? "public"}
          initialSession={session}
        />
      </div>
    </header>
  );
}

import Link from "next/link";
import { createCsrfToken } from "@/modules/auth/services/csrf-service";
import { getCurrentUser } from "@/modules/auth/services/session-service";
import { userHasRole } from "@/modules/auth/services/authorization-service";
import { getUnreadNotificationCount } from "@/modules/notifications/services/notification-service";
import { userCanViewReports } from "@/modules/reports/services/report-service";
import { HeaderSessionNavigation } from "./header-session-navigation";

export async function PublicHeader() {
  const currentUser = await getCurrentUser();
  const session = currentUser
    ? {
        currentUser: {
          name: currentUser.name ?? currentUser.email,
          organizationName: currentUser.organizationName ?? "WorkHub",
        },
        logoutCsrfToken: await createCsrfToken("logout"),
        unreadNotificationCount: await getUnreadNotificationCount(currentUser),
        canViewReports: await userCanViewReports(currentUser),
        isMainAdmin: await userHasRole(currentUser, "Main Admin"),
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

        <HeaderSessionNavigation initialSession={session} />
      </div>
    </header>
  );
}

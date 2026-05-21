import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

import { createCsrfToken } from "@/modules/auth/services/csrf-service";
import { getCurrentUser } from "@/modules/auth/services/session-service";
import type { CurrentUser } from "@/modules/auth/types";
import { getUnreadNotificationCount } from "@/modules/notifications/services/notification-service";
import { userCanViewReports } from "@/modules/reports/services/report-service";

export async function GET() {
  const currentSession = await getCurrentUser();

  if (!currentSession) {
    return NextResponse.json({
      currentUser: null,
      logoutCsrfToken: null,
      unreadNotificationCount: 0,
      canViewReports: false,
    });
  }

  const [logoutCsrfToken, unreadNotificationCount, canViewReports] =
    await Promise.all([
      createCsrfToken("logout"),
      getCachedUnreadNotificationCount(currentSession),
      getCachedCanViewReports(currentSession),
    ]);

  return NextResponse.json({
    currentUser: {
      name: currentSession.name ?? currentSession.email,
      organizationName: currentSession.organizationName ?? "WorkHub",
    },
    logoutCsrfToken,
    unreadNotificationCount,
    canViewReports,
  });
}

async function getCachedCanViewReports(user: CurrentUser) {
  return unstable_cache(
    async () => userCanViewReports(user),
    ["header-reports-access", String(user.organizationId), String(user.id)],
    {
      revalidate: 30,
      tags: [`reports:${user.organizationId}:${user.id}`],
    },
  )();
}

async function getCachedUnreadNotificationCount(user: CurrentUser) {
  return unstable_cache(
    async () => getUnreadNotificationCount(user),
    ["header-unread-notifications", String(user.organizationId), String(user.id)],
    {
      revalidate: 30,
      tags: [`notifications:${user.organizationId}:${user.id}`],
    },
  )();
}

import Link from "next/link";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import type { CurrentUser } from "@/modules/auth/types";
import {
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
  openNotificationAction,
} from "@/modules/notifications/actions/notification-actions";
import {
  getNotificationListData,
  getNotificationTypeLabel,
  notificationGroups,
  type NotificationGroup,
  type NotificationListData,
  type NotificationListFilters,
} from "@/modules/notifications/services/notification-service";

export const metadata = {
  title: "Notifications | WorkHub",
};

type SearchParams = Record<string, string | string[] | undefined>;
type NotificationRow =
  NotificationListData["unreadNotifications"]["rows"][number];

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireNotificationsUser();
  const params = await searchParams;
  const filters = parseFilters(params);
  const data = await getCachedNotificationListData(user, filters);
  const currentPath = buildCurrentPath(filters);
  const hasFilters = Boolean(filters.type);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Notifications
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
              Notification center
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Browse personal updates for {user.organizationName}.
            </p>
          </div>

          <form action={markAllNotificationsAsReadAction}>
            <input type="hidden" name="returnPath" value={currentPath} />
            <button
              type="submit"
              disabled={data.unreadCount === 0}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Mark All as Read
            </button>
          </form>
        </div>
      </div>

      <NotificationFilters
        filters={filters}
        hasFilters={hasFilters}
      />

      <div className="mt-8 space-y-10">
        <NotificationSection
          title="Unread Notifications"
          description="Temporary updates waiting for your review. Reading one removes it."
          emptyText={
            hasFilters
              ? "No notifications match the selected filters."
              : "You have no notifications."
          }
          rows={data.unreadNotifications.rows}
          currentPath={currentPath}
          pagination={
            <Pagination
              page={data.unreadNotifications.page}
              totalPages={data.unreadNotifications.totalPages}
              hasPreviousPage={data.unreadNotifications.hasPreviousPage}
              hasNextPage={data.unreadNotifications.hasNextPage}
              pageParam="unreadPage"
              filters={filters}
            />
          }
        />
      </div>
    </section>
  );
}

async function getCachedNotificationListData(
  user: CurrentUser,
  filters: NotificationListFilters,
) {
  return unstable_cache(
    async () => getNotificationListData(user, filters),
    [
      "notification-list",
      String(user.organizationId),
      String(user.id),
      stableNotificationFiltersKey(filters),
    ],
    {
      revalidate: 30,
      tags: [`notifications:${user.organizationId}:${user.id}`],
    },
  )();
}

function NotificationFilters({
  filters,
  hasFilters,
}: {
  filters: NotificationListFilters;
  hasFilters: boolean;
}) {
  return (
    <form
      action="/notifications"
      className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Type
          </span>
          <select
            name="type"
            defaultValue={filters.type ?? ""}
            className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          >
            <option value="">All</option>
            {notificationGroups.map((group) => (
              <option key={group} value={group}>
                {formatGroupLabel(group)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800"
        >
          Apply Filters
        </button>
        {hasFilters ? (
          <Link
            href="/notifications"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
          >
            Reset
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function NotificationSection({
  title,
  description,
  emptyText,
  rows,
  currentPath,
  pagination,
}: {
  title: string;
  description: string;
  emptyText: string;
  rows: NotificationRow[];
  currentPath: string;
  pagination: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-normal text-slate-950">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <p className="text-sm font-medium text-slate-500">{rows.length} shown</p>
      </div>

      {rows.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-200">
            {rows.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                currentPath={currentPath}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex min-h-40 rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
          {emptyText}
        </div>
      )}

      {pagination}
    </section>
  );
}

function NotificationItem({
  notification,
  currentPath,
}: {
  notification: NotificationRow;
  currentPath: string;
}) {
  const cardClassName = [
    "grid gap-4 px-4 py-4 text-left transition lg:grid-cols-[1fr_auto] lg:items-center",
    notification.isRead
      ? "bg-white hover:bg-slate-50"
      : "border-l-4 border-l-cyan-600 bg-cyan-50/60 hover:bg-cyan-50",
  ].join(" ");
  const clickableCardClassName = `${cardClassName} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-600`;

  if (notification.actionUrl) {
    return (
      <form action={openNotificationAction}>
        <input type="hidden" name="notificationId" value={notification.id} />
        <input type="hidden" name="returnPath" value={currentPath} />
        <button type="submit" className={`w-full ${clickableCardClassName}`}>
          <NotificationContent notification={notification} />
        </button>
      </form>
    );
  }

  return (
    <div className={cardClassName}>
      <NotificationContent notification={notification} />

      <div className="flex flex-wrap gap-2 lg:justify-end">
        {!notification.isRead ? (
          <form action={markNotificationAsReadAction}>
            <input type="hidden" name="notificationId" value={notification.id} />
            <input type="hidden" name="returnPath" value={currentPath} />
            <button
              type="submit"
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Mark as Read
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function NotificationContent({
  notification,
}: {
  notification: NotificationRow;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-950">
          {notification.title}
        </h3>
        <Badge tone={notification.isRead ? "neutral" : "info"}>
          {notification.isRead ? "Read" : "Unread"}
        </Badge>
        <Badge tone="neutral">
          {getNotificationTypeLabel(notification.type)}
        </Badge>
      </div>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">
        {notification.message}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {formatDateTime(notification.createdAt)}
      </p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  pageParam,
  filters,
}: {
  page: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  pageParam: "unreadPage";
  filters: NotificationListFilters;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <PaginationLink
          disabled={!hasPreviousPage}
          href={buildPageHref(filters, pageParam, page - 1)}
        >
          Previous
        </PaginationLink>
        <PaginationLink
          disabled={!hasNextPage}
          href={buildPageHref(filters, pageParam, page + 1)}
        >
          Next
        </PaginationLink>
      </div>
    </div>
  );
}

function PaginationLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex min-h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-400">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
    >
      {children}
    </Link>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "info" | "neutral";
}) {
  const classes = {
    info: "border-cyan-200 bg-cyan-50 text-cyan-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

function parseFilters(params: SearchParams): NotificationListFilters {
  const type = firstParam(params.type);

  return {
    type: isNotificationGroup(type) ? type : undefined,
    unreadPage: positiveInteger(firstParam(params.unreadPage)) ?? 1,
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function isNotificationGroup(
  value: string | undefined,
): value is NotificationGroup {
  return notificationGroups.includes(value as NotificationGroup);
}

function stableNotificationFiltersKey(filters: NotificationListFilters) {
  return JSON.stringify({
    type: filters.type ?? null,
    unreadPage: filters.unreadPage ?? 1,
  });
}

function buildCurrentPath(filters: NotificationListFilters) {
  return buildPageHref(filters, "unreadPage", filters.unreadPage ?? 1);
}

function buildPageHref(
  filters: NotificationListFilters,
  pageParam: "unreadPage",
  page: number,
) {
  const params = new URLSearchParams();

  if (filters.type) params.set("type", filters.type);
  if (page > 1) params.set(pageParam, String(page));

  const query = params.toString();
  return query ? `/notifications?${query}` : "/notifications";
}

function formatGroupLabel(group: NotificationGroup) {
  const labels: Record<NotificationGroup, string> = {
    tasks: "Tasks",
    leave: "Leave",
    shifts: "Shifts",
    roles: "Roles",
    departments: "Departments",
  };

  return labels[group];
}

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value instanceof Date ? value : new Date(value));
}

async function requireNotificationsUser() {
  try {
    return await requireCurrentUser();
  } catch (error) {
    if (
      error instanceof AuthorizationError &&
      error.code === "unauthenticated"
    ) {
      redirect("/login");
    }

    throw error;
  }
}

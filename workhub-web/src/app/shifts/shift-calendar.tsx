import Link from "next/link";

import type { ShiftCalendarData } from "@/modules/shifts/services/shift-list-service";

export function ShiftCalendar({
  data,
  baseHref = "/shifts",
  shiftHrefPrefix = "/shifts",
}: {
  data: ShiftCalendarData;
  baseHref?: string;
  shiftHrefPrefix?: "/shifts" | "/manager/shifts";
}) {
  const days = monthGridDays(data.month);
  const leaveHrefPrefix = data.isMainAdmin
    ? "/admin/leave"
    : data.isDepartmentManager
      ? "/manager/leave"
      : "/leave";

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-normal text-slate-950">
            Calendar Overview
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {data.monthLabel} shifts and leave.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CalendarLink href={calendarHref(baseHref, data.previousMonth)}>
            Previous
          </CalendarLink>
          <CalendarLink href={calendarHref(baseHref, data.nextMonth)}>
            Next
          </CalendarLink>
          {data.canCreateShift ? (
            <Link
              href="/shifts/new"
              className="inline-flex min-h-9 items-center rounded-md bg-cyan-700 px-3 text-sm font-semibold text-white transition hover:bg-cyan-800"
            >
              Create Shift
            </Link>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-full md:min-w-[760px]">
          <div className="hidden grid-cols-7 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 md:grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="min-w-0 px-2 py-2 lg:px-3">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7">
            {days.map((day) => (
              <CalendarDay
                key={day.iso}
                day={day}
                shifts={data.shifts.filter((shift) =>
                  sameDay(shift.startTime, day.iso),
                )}
                leaves={data.leaves.filter((leave) =>
                  day.iso >= leave.startDate && day.iso <= leave.endDate,
                )}
                currentMonth={day.iso.startsWith(data.month)}
                shiftHrefPrefix={shiftHrefPrefix}
                leaveHrefPrefix={leaveHrefPrefix}
                canCreateShift={data.canCreateShift}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CalendarDay({
  day,
  shifts,
  leaves,
  currentMonth,
  shiftHrefPrefix,
  leaveHrefPrefix,
  canCreateShift,
}: {
  day: { iso: string; label: number };
  shifts: ShiftCalendarData["shifts"];
  leaves: ShiftCalendarData["leaves"];
  currentMonth: boolean;
  shiftHrefPrefix: "/shifts" | "/manager/shifts";
  leaveHrefPrefix: "/leave" | "/manager/leave" | "/admin/leave";
  canCreateShift: boolean;
}) {
  const visibleLeaves = leaves.slice(0, 2);
  const hiddenLeavesCount = Math.max(leaves.length - visibleLeaves.length, 0);
  const visibleShifts = shifts.slice(0, 3);
  const hiddenShiftsCount = Math.max(shifts.length - visibleShifts.length, 0);

  return (
    <div
      className={[
        "min-w-0 border-b border-slate-200 p-3 md:min-h-36 md:p-2 md:[&:not(:nth-child(7n))]:border-r lg:min-h-40 lg:p-3",
        currentMonth ? "bg-white" : "bg-slate-50 text-slate-400",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        {canCreateShift && currentMonth ? (
          <Link
            href={`/shifts/new?date=${day.iso}`}
            className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-slate-950 transition hover:bg-cyan-50 hover:text-cyan-700"
            title={`Create shift on ${day.iso}`}
          >
            {day.label}
          </Link>
        ) : (
          <span className="shrink-0 text-sm font-semibold text-slate-950">
            {day.label}
          </span>
        )}

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
          {leaves.length > 0 ? (
            <span
              className="max-w-full truncate rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700"
              title={`${leaves.length} leave request${leaves.length === 1 ? "" : "s"}`}
            >
              {leaves.length}
              <span className="ml-1 hidden lg:inline">leave</span>
            </span>
          ) : null}
          {canCreateShift && currentMonth ? (
            <Link
              href={`/shifts/new?date=${day.iso}`}
              className="rounded-md border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[11px] font-semibold text-cyan-700 transition hover:bg-cyan-100"
            >
              <span aria-hidden="true" className="lg:hidden">
                +
              </span>
              <span className="hidden lg:inline">Add</span>
              <span className="sr-only">Add shift on {day.iso}</span>
            </Link>
          ) : null}
        </div>
      </div>

      {leaves.length > 0 ? (
        <div className="mt-2 space-y-1">
          {visibleLeaves.map((leave) => (
            <Link
              key={leave.id}
              href={`${leaveHrefPrefix}/${leave.id}`}
              className="block min-w-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs leading-4 text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 md:px-1.5 lg:px-2"
            >
              <span className="block truncate font-semibold">
                {leave.employeeName}
              </span>
              <span className="block truncate md:hidden xl:block">
                {formatLabel(leave.type)} leave, {formatLabel(leave.status)}
              </span>
            </Link>
          ))}
          {hiddenLeavesCount > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50/70 px-2 py-1 text-xs font-semibold text-amber-700">
              +{hiddenLeavesCount} more leave
            </div>
          ) : null}
        </div>
      ) : null}

      {shifts.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {visibleShifts.map((shift) => (
            <Link
              key={shift.id}
              href={`${shiftHrefPrefix}/${shift.id}`}
              className={[
                "block min-w-0 rounded-md border px-2 py-1.5 text-xs leading-4 transition md:px-1.5 lg:px-2",
                shiftColorClasses[shift.color as ShiftColorKey] ??
                  shiftColorClasses.cyan,
              ].join(" ")}
            >
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate font-semibold">{shift.title}</span>
                <span
                  className="shrink-0 rounded border border-current/20 bg-white/60 px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                  title={`${shift.assignedEmployeeNames.length} assigned employee${
                    shift.assignedEmployeeNames.length === 1 ? "" : "s"
                  }`}
                >
                  {shift.assignedEmployeeNames.length}
                </span>
              </span>
              <span className="block truncate">
                {formatTime(shift.startTime)} {shift.departmentName}
              </span>
              <span className="mt-1 block truncate text-[11px] leading-4 opacity-85 md:hidden xl:block">
                {shift.assignedEmployeeNames.length > 0
                  ? shift.assignedEmployeeNames.join(", ")
                : "Unassigned"}
              </span>
            </Link>
          ))}
          {hiddenShiftsCount > 0 ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
              +{hiddenShiftsCount} more shifts
            </div>
          ) : null}
        </div>
      ) : null}

      {shifts.length === 0 && leaves.length === 0 ? (
        <div className="mt-3 text-xs text-slate-400">
          {canCreateShift && currentMonth ? "Click Add to schedule" : "No events"}
        </div>
      ) : null}
    </div>
  );
}

type ShiftColorKey = keyof typeof shiftColorClasses;

const shiftColorClasses = {
  cyan: "border-cyan-100 bg-cyan-50 text-cyan-900 hover:border-cyan-300",
  emerald:
    "border-emerald-100 bg-emerald-50 text-emerald-900 hover:border-emerald-300",
  lime: "border-lime-100 bg-lime-50 text-lime-900 hover:border-lime-300",
  amber: "border-amber-100 bg-amber-50 text-amber-900 hover:border-amber-300",
  orange:
    "border-orange-100 bg-orange-50 text-orange-900 hover:border-orange-300",
  rose: "border-rose-100 bg-rose-50 text-rose-900 hover:border-rose-300",
  pink: "border-pink-100 bg-pink-50 text-pink-900 hover:border-pink-300",
  violet:
    "border-violet-100 bg-violet-50 text-violet-900 hover:border-violet-300",
  indigo:
    "border-indigo-100 bg-indigo-50 text-indigo-900 hover:border-indigo-300",
  sky: "border-sky-100 bg-sky-50 text-sky-900 hover:border-sky-300",
  teal: "border-teal-100 bg-teal-50 text-teal-900 hover:border-teal-300",
  slate: "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400",
} as const;

function CalendarLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
    >
      {children}
    </Link>
  );
}

function calendarHref(baseHref: string, month: string) {
  const separator = baseHref.includes("?") ? "&" : "?";

  return `${baseHref}${separator}month=${month}`;
}

function monthGridDays(month: string) {
  const start = new Date(`${month}-01T00:00:00`);
  const first = new Date(start);
  first.setDate(1 - start.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);

    return {
      iso: toLocalIsoDate(date),
      label: date.getDate(),
    };
  });
}

function sameDay(value: Date | string, iso: string) {
  return toLocalIsoDate(value instanceof Date ? value : new Date(value)) === iso;
}

function toLocalIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value instanceof Date ? value : new Date(value));
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

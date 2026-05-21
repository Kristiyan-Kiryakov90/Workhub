import Link from "next/link";

export function ShiftDetailsCard({
  backHref,
  title,
  departmentName,
  startTime,
  endTime,
  location,
  status,
  notes,
  assignedEmployees,
  editHref,
}: {
  backHref: string;
  title: string;
  departmentName: string;
  startTime: Date | string;
  endTime: Date | string;
  location: string | null;
  status: string;
  notes: string | null;
  assignedEmployees: { id: number; name: string; email: string }[];
  editHref?: string;
}) {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={backHref}
        className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
      >
        Back to shifts
      </Link>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              {departmentName}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
              {title}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone(status)}>{formatLabel(status)}</Badge>
            {editHref ? (
              <Link
                href={editHref}
                className="inline-flex min-h-6 items-center rounded-md border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100"
              >
                Edit
              </Link>
            ) : null}
          </div>
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <Detail label="Date" value={formatDate(startTime)} />
          <Detail label="Time" value={`${formatTime(startTime)} - ${formatTime(endTime)}`} />
          <Detail label="Location" value={location || "Not set"} />
          <Detail label="Assigned" value={String(assignedEmployees.length)} />
        </dl>

        {notes ? (
          <div className="mt-8 border-t border-slate-200 pt-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              Notes
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
              {notes}
            </p>
          </div>
        ) : null}

        <div className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Assigned Employees
          </h2>
          {assignedEmployees.length > 0 ? (
            <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
              {assignedEmployees.map((employee) => (
                <li key={employee.id} className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-950">
                    {employee.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{employee.email}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              No employees are assigned to this shift.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-medium text-slate-950">{value}</dd>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "danger" | "neutral" | "success";
}) {
  const classes = {
    danger: "border-red-200 bg-red-50 text-red-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

function statusTone(status: string) {
  if (status === "completed") {
    return "success";
  }

  if (status === "cancelled") {
    return "danger";
  }

  return "neutral";
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(toDate(value));
}

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(toDate(value));
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

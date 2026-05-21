import Link from "next/link";

import {
  shiftColors,
  shiftStatuses,
  type ShiftDetails,
  type ShiftFormData,
} from "@/modules/shifts/services/shift-list-service";
import { ShiftAssignmentFields } from "./shift-assignment-fields";

export type ShiftFormDraft = {
  title?: string;
  departmentId?: string;
  status?: string;
  startDate?: string;
  startHour?: string;
  startMinute?: string;
  endDate?: string;
  endHour?: string;
  endMinute?: string;
  location?: string;
  color?: string;
  notes?: string;
  assignedUserIds?: number[];
};

export function ShiftForm({
  action,
  csrfToken,
  formData,
  shift,
  error,
  detailHrefPrefix = "/shifts",
  defaultDate = "",
  draft,
}: {
  action: (formData: FormData) => void | Promise<void>;
  csrfToken: string;
  formData: ShiftFormData;
  shift?: NonNullable<ShiftDetails>;
  error?: string;
  detailHrefPrefix?: "/shifts" | "/manager/shifts";
  defaultDate?: string;
  draft?: ShiftFormDraft;
}) {
  const assignedIds =
    draft?.assignedUserIds ??
    shift?.assignedEmployees.map((employee) => employee.id) ??
    [];
  const startParts = shift ? toDateTimeParts(shift.startTime) : null;
  const endParts = shift ? toDateTimeParts(shift.endTime) : null;

  return (
    <form action={action} className="mt-6 space-y-5">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <input type="hidden" name="detailHrefPrefix" value={detailHrefPrefix} />
      {shift ? <input type="hidden" name="shiftId" value={shift.id} /> : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {errorMessage(error)}
        </p>
      ) : null}

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Title
        </span>
        <input
          name="title"
          required
          maxLength={180}
          defaultValue={draft?.title ?? shift?.title ?? ""}
          className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          placeholder="Shift title"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <ShiftAssignmentFields
          departmentOptions={formData.departmentOptions}
          employeeOptions={formData.employeeOptions}
          defaultDepartmentId={
            draft?.departmentId ?? shift?.departmentId?.toString() ?? ""
          }
          defaultAssignedUserIds={assignedIds}
        />

        <SelectField
          label="Status"
          name="status"
          defaultValue={draft?.status ?? shift?.status ?? "scheduled"}
          required
        >
          {shiftStatuses.map((status) => (
            <option key={status} value={status}>
              {formatLabel(status)}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimeFields
          label="Start Time"
          dateName="startDate"
          hourName="startHour"
          minuteName="startMinute"
          defaultDate={draft?.startDate ?? startParts?.date ?? defaultDate}
          defaultHour={draft?.startHour ?? startParts?.hour ?? "09"}
          defaultMinute={draft?.startMinute ?? startParts?.minute ?? "00"}
        />

        <DateTimeFields
          label="End Time"
          dateName="endDate"
          hourName="endHour"
          minuteName="endMinute"
          defaultDate={draft?.endDate ?? endParts?.date ?? defaultDate}
          defaultHour={draft?.endHour ?? endParts?.hour ?? "17"}
          defaultMinute={draft?.endMinute ?? endParts?.minute ?? "00"}
        />
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Location
        </span>
        <input
          name="location"
          maxLength={255}
          defaultValue={draft?.location ?? shift?.location ?? ""}
          className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          placeholder="Optional location"
        />
      </label>

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Shift Color
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {shiftColors.map((color) => (
            <label
              key={color}
              className={[
                "inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition",
                colorSwatchClasses[color].option,
              ].join(" ")}
            >
              <input
                type="radio"
                name="color"
                value={color}
                defaultChecked={(draft?.color ?? shift?.color ?? "cyan") === color}
                className="h-4 w-4"
              />
              <span
                aria-hidden="true"
                className={[
                  "h-4 w-4 rounded-sm border",
                  colorSwatchClasses[color].swatch,
                ].join(" ")}
              />
              <span>{formatLabel(color)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Notes
        </span>
        <textarea
          name="notes"
          rows={4}
          defaultValue={draft?.notes ?? shift?.notes ?? ""}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          placeholder="Optional notes"
        />
      </label>

      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
        <button
          type="submit"
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800"
        >
          {shift ? "Save Shift" : "Create Shift"}
        </button>
        <Link
          href="/shifts"
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function DateTimeFields({
  label,
  dateName,
  hourName,
  minuteName,
  defaultDate,
  defaultHour,
  defaultMinute,
}: {
  label: string;
  dateName: string;
  hourName: string;
  minuteName: string;
  defaultDate: string;
  defaultHour: string;
  defaultMinute: string;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </legend>
      <div className="mt-2 grid grid-cols-[1fr_5.5rem_5.5rem] gap-2">
        <input
          name={dateName}
          type="date"
          required
          defaultValue={defaultDate}
          className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        />
        <select
          name={hourName}
          defaultValue={defaultHour}
          aria-label={`${label} hour`}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        >
          {hourOptions.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>
        <select
          name={minuteName}
          defaultValue={defaultMinute}
          aria-label={`${label} minute`}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        >
          {minuteOptions.map((minute) => (
            <option key={minute} value={minute}>
              {minute}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-1 text-xs text-slate-500">24-hour time, HH:mm</p>
    </fieldset>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  required = false,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
      >
        {children}
      </select>
    </label>
  );
}

const hourOptions = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0"),
);
const minuteOptions = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, "0"),
);

function toDateTimeParts(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  const valueString = local.toISOString();

  return {
    date: valueString.slice(0, 10),
    hour: valueString.slice(11, 13),
    minute: valueString.slice(14, 16),
  };
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function errorMessage(error: string) {
  const decoded = decodeURIComponent(error);

  if (decoded.includes("Cannot assign")) {
    return decoded;
  }

  const labels: Record<string, string> = {
    "session-expired": "Your session expired. Refresh the page and try again.",
    "invalid-title": "Enter a shift title up to 180 characters.",
    "invalid-department": "Choose a valid department.",
    "invalid-time": "Choose a valid start and end time.",
    "invalid-status": "Choose a valid shift status.",
    "invalid-location": "Keep the location under 255 characters.",
    "invalid-color": "Choose a valid shift color.",
    forbidden: "You do not have permission to manage this shift.",
  };

  return labels[decoded] ?? decoded;
}

const colorSwatchClasses: Record<
  (typeof shiftColors)[number],
  { option: string; swatch: string }
> = {
  cyan: {
    option: "border-cyan-200 bg-cyan-50 text-cyan-800",
    swatch: "border-cyan-300 bg-cyan-500",
  },
  emerald: {
    option: "border-emerald-200 bg-emerald-50 text-emerald-800",
    swatch: "border-emerald-300 bg-emerald-500",
  },
  lime: {
    option: "border-lime-200 bg-lime-50 text-lime-800",
    swatch: "border-lime-300 bg-lime-500",
  },
  amber: {
    option: "border-amber-200 bg-amber-50 text-amber-800",
    swatch: "border-amber-300 bg-amber-500",
  },
  orange: {
    option: "border-orange-200 bg-orange-50 text-orange-800",
    swatch: "border-orange-300 bg-orange-500",
  },
  rose: {
    option: "border-rose-200 bg-rose-50 text-rose-800",
    swatch: "border-rose-300 bg-rose-500",
  },
  pink: {
    option: "border-pink-200 bg-pink-50 text-pink-800",
    swatch: "border-pink-300 bg-pink-500",
  },
  violet: {
    option: "border-violet-200 bg-violet-50 text-violet-800",
    swatch: "border-violet-300 bg-violet-500",
  },
  indigo: {
    option: "border-indigo-200 bg-indigo-50 text-indigo-800",
    swatch: "border-indigo-300 bg-indigo-500",
  },
  sky: {
    option: "border-sky-200 bg-sky-50 text-sky-800",
    swatch: "border-sky-300 bg-sky-500",
  },
  teal: {
    option: "border-teal-200 bg-teal-50 text-teal-800",
    swatch: "border-teal-300 bg-teal-500",
  },
  slate: {
    option: "border-slate-300 bg-slate-50 text-slate-800",
    swatch: "border-slate-400 bg-slate-500",
  },
};

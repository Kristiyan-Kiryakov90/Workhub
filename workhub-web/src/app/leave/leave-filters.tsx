"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

type FilterOption = {
  value: string;
  label: string;
};

export function LeaveFilters({
  search,
  status,
  type,
  departmentId,
  employeeId,
  statusOptions,
  typeOptions,
  departmentOptions,
  employeeOptions,
  showDepartmentFilter,
  showEmployeeFilter,
}: {
  search: string;
  status: string;
  type: string;
  departmentId: string;
  employeeId: string;
  statusOptions: FilterOption[];
  typeOptions: FilterOption[];
  departmentOptions: FilterOption[];
  employeeOptions: FilterOption[];
  showDepartmentFilter: boolean;
  showEmployeeFilter: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(search);
  const [statusValue, setStatusValue] = useState(status);
  const [typeValue, setTypeValue] = useState(type);
  const [departmentValue, setDepartmentValue] = useState(departmentId);
  const [employeeValue, setEmployeeValue] = useState(employeeId);

  const baseParams = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );
  const hasFilters =
    Boolean(search) ||
    Boolean(status) ||
    Boolean(type) ||
    Boolean(departmentId) ||
    Boolean(employeeId);
  const hasPendingChanges =
    searchValue !== search ||
    statusValue !== status ||
    typeValue !== type ||
    departmentValue !== departmentId ||
    employeeValue !== employeeId;

  useEffect(() => {
    if (!hasPendingChanges) {
      return;
    }

    const delay = searchValue !== search ? 200 : 0;
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(baseParams.toString());
      setParam(params, "search", searchValue.trim());
      setParam(params, "status", statusValue);
      setParam(params, "type", typeValue);
      setParam(params, "departmentId", departmentValue);
      setParam(params, "employeeId", employeeValue);
      params.delete("myPage");
      params.delete("pendingPage");
      params.delete("reviewedPage");

      startTransition(() => {
        router.replace(params.toString() ? `${pathname}?${params}` : pathname);
      });
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [
    baseParams,
    departmentValue,
    employeeValue,
    hasPendingChanges,
    pathname,
    router,
    search,
    searchValue,
    startTransition,
    statusValue,
    typeValue,
  ]);

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {showEmployeeFilter ? (
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Search
            </span>
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Employee name or email"
              className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
        ) : null}

        <SelectFilter
          label="Status"
          value={statusValue}
          options={statusOptions}
          onChange={setStatusValue}
        />

        <SelectFilter
          label="Type"
          value={typeValue}
          options={typeOptions}
          onChange={setTypeValue}
        />

        {showDepartmentFilter ? (
          <SelectFilter
            label="Department"
            value={departmentValue}
            options={departmentOptions}
            onChange={setDepartmentValue}
          />
        ) : null}

        {showEmployeeFilter ? (
          <SelectFilter
            label="Employee"
            value={employeeValue}
            options={employeeOptions}
            onChange={setEmployeeValue}
          />
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {hasFilters ? (
          <Link
            href="/leave"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
          >
            Reset
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-400"
          >
            Reset
          </button>
        )}
        {isPending ? (
          <span className="text-sm font-medium text-slate-500">Filtering...</span>
        ) : null}
      </div>
    </div>
  );
}

function setParam(params: URLSearchParams, name: string, value: string) {
  if (value) {
    params.set(name, value);
  } else {
    params.delete(name);
  }
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

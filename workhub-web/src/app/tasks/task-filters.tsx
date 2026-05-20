"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

type FilterOption = {
  value: string;
  label: string;
};

export function TaskFilters({
  search,
  status,
  priority,
  departmentId,
  assignedToUserId,
  statusOptions,
  priorityOptions,
  departmentOptions,
  assigneeOptions,
  showDepartmentFilter,
  showAssigneeFilter,
}: {
  search: string;
  status: string;
  priority: string;
  departmentId: string;
  assignedToUserId: string;
  statusOptions: FilterOption[];
  priorityOptions: FilterOption[];
  departmentOptions: FilterOption[];
  assigneeOptions: FilterOption[];
  showDepartmentFilter: boolean;
  showAssigneeFilter: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(search);

  const baseParams = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );
  const hasFilters =
    Boolean(search) ||
    Boolean(status) ||
    Boolean(priority) ||
    Boolean(departmentId) ||
    Boolean(assignedToUserId);

  const updateFilter = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(baseParams.toString());

      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }

      params.delete("activePage");
      params.delete("archivePage");

      startTransition(() => {
        router.push(params.toString() ? `${pathname}?${params}` : pathname);
      });
    },
    [baseParams, pathname, router],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchValue !== search) {
        updateFilter("search", searchValue.trim());
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchValue, search, updateFilter]);

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Search
          </span>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search by title"
            className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />
        </label>

        <SelectFilter
          label="Status"
          value={status}
          options={statusOptions}
          onChange={(value) => updateFilter("status", value)}
        />

        <SelectFilter
          label="Priority"
          value={priority}
          options={priorityOptions}
          onChange={(value) => updateFilter("priority", value)}
        />

        {showDepartmentFilter ? (
          <SelectFilter
            label="Department"
            value={departmentId}
            options={departmentOptions}
            onChange={(value) => updateFilter("departmentId", value)}
          />
        ) : null}

        {showAssigneeFilter ? (
          <SelectFilter
            label="Assigned Employee"
            value={assignedToUserId}
            options={assigneeOptions}
            onChange={(value) => updateFilter("assignedToUserId", value)}
          />
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {hasFilters ? (
          <Link
            href="/tasks"
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

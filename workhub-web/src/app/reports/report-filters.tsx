"use client";

import Link from "next/link";
import { useRef } from "react";

import type { ReportFilters } from "@/modules/reports/services/report-service";

type Option = {
  value: string;
  label: string;
};

export function AnalyticsFilters({
  filters,
  departmentOptions,
  selectedDepartmentId,
  periodOptions,
}: {
  filters: ReportFilters;
  departmentOptions: { id: number; name: string }[];
  selectedDepartmentId: number | undefined;
  periodOptions: Option[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  function applyFilters() {
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SelectField
          label="Department"
          name="departmentId"
          defaultValue={selectedDepartmentId ? String(selectedDepartmentId) : ""}
          onChange={applyFilters}
        >
          <option value="">All accessible departments</option>
          {departmentOptions.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Date Range"
          name="period"
          defaultValue={filters.period}
          onChange={applyFilters}
        >
          {periodOptions.map((period) => (
            <option key={period.value} value={period.value}>
              {period.label}
            </option>
          ))}
        </SelectField>

        <div className="flex items-end">
          <Link
            href="/reports"
            className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
          >
            Reset
          </Link>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <InputField
          label="Custom Start"
          name="customStartDate"
          type="date"
          defaultValue={filters.customStartDate ?? ""}
          onChange={applyFilters}
        />
        <InputField
          label="Custom End"
          name="customEndDate"
          type="date"
          defaultValue={filters.customEndDate ?? ""}
          onChange={applyFilters}
        />
      </div>
    </form>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  onChange,
  children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  onChange: () => void;
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
        onChange={onChange}
        className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
      >
        {children}
      </select>
    </label>
  );
}

function InputField({
  label,
  name,
  type,
  defaultValue,
  onChange,
}: {
  label: string;
  name: string;
  type: string;
  defaultValue: string;
  onChange: () => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        onChange={onChange}
        className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
      />
    </label>
  );
}

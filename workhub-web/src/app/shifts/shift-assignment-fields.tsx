"use client";

import { useMemo, useState } from "react";

type DepartmentOption = {
  id: number;
  name: string;
};

type EmployeeOption = {
  id: number;
  name: string;
  departmentId: number;
};

export function ShiftAssignmentFields({
  departmentOptions,
  employeeOptions,
  defaultDepartmentId,
  defaultAssignedUserIds,
}: {
  departmentOptions: DepartmentOption[];
  employeeOptions: EmployeeOption[];
  defaultDepartmentId: string;
  defaultAssignedUserIds: number[];
}) {
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId);
  const [assignedUserIds, setAssignedUserIds] = useState(
    () => new Set(defaultAssignedUserIds),
  );

  const visibleEmployees = useMemo(() => {
    if (!departmentId) {
      return [];
    }

    const selectedDepartmentId = Number(departmentId);
    const employeesById = new Map<number, EmployeeOption>();

    for (const employee of employeeOptions) {
      if (employee.departmentId === selectedDepartmentId) {
        employeesById.set(employee.id, employee);
      }
    }

    return Array.from(employeesById.values()).sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  }, [departmentId, employeeOptions]);

  function updateDepartment(nextDepartmentId: string) {
    const selectedDepartmentId = Number(nextDepartmentId);
    const nextEmployeeIds = new Set(
      employeeOptions
        .filter((employee) => employee.departmentId === selectedDepartmentId)
        .map((employee) => employee.id),
    );

    setDepartmentId(nextDepartmentId);
    setAssignedUserIds((current) => {
      const next = new Set<number>();

      for (const userId of current) {
        if (nextEmployeeIds.has(userId)) {
          next.add(userId);
        }
      }

      return next;
    });
  }

  function toggleAssignedUser(userId: number, checked: boolean) {
    setAssignedUserIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
      }

      return next;
    });
  }

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Department
        </span>
        <select
          name="departmentId"
          value={departmentId}
          onChange={(event) => updateDepartment(event.target.value)}
          required
          className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="">Choose department</option>
          {departmentOptions.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Assigned Employees
        </legend>
        <div className="mt-2 grid max-h-72 gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
          {visibleEmployees.map((employee) => (
            <label
              key={employee.id}
              className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                name="assignedUserIds"
                value={employee.id}
                checked={assignedUserIds.has(employee.id)}
                onChange={(event) =>
                  toggleAssignedUser(employee.id, event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-cyan-700"
              />
              <span>{employee.name}</span>
            </label>
          ))}
          {!departmentId ? (
            <p className="text-sm text-slate-600">
              Choose a department to see employees.
            </p>
          ) : visibleEmployees.length === 0 ? (
            <p className="text-sm text-slate-600">
              No active employees are members of this department.
            </p>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Only active employees in the selected department can be assigned.
        </p>
      </fieldset>
    </div>
  );
}

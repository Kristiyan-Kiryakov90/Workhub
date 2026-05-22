import { notFound, redirect } from "next/navigation";

import { requireCurrentUser } from "@/modules/auth/services/authorization-service";
import { updateAdminUserAction } from "@/modules/profile/actions/profile-actions";
import {
  getAdminUserEditData,
  ProfileError,
} from "@/modules/profile/services/profile-service";

export const metadata = {
  title: "Edit User | WorkHub",
};

export default async function AdminUserEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await requireCurrentUser().catch(() => redirect("/login"));
  const { id } = await params;
  const userId = Number(id);

  if (!Number.isInteger(userId)) {
    notFound();
  }

  const data = await getAdminUserEditData(currentUser, userId).catch((error) => {
    if (error instanceof ProfileError && error.code === "not_found") {
      notFound();
    }
    redirect("/dashboard");
  });
  const selectedRoleId = data.roles[0]?.id;
  const selectedDepartmentIds = new Set(
    data.departments.map((department) => department.id),
  );

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
          Edit {data.user.name}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Update roles and department assignments inside {currentUser.organizationName}.
        </p>
      </div>

      <form action={updateAdminUserAction.bind(null, data.user.id)} className="mt-8 space-y-8">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Personal Information</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field name="name" label="Full name" defaultValue={data.user.name} />
            <Field name="phone" label="Phone" defaultValue={data.user.phone ?? ""} />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Role Assignment</h2>
          <div className="mt-4 max-w-md">
            <label className="block text-sm font-medium text-slate-800">
              Role
              <select
                name="roleId"
                defaultValue={selectedRoleId ?? ""}
                className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/20"
                required
              >
                <option value="" disabled>
                  Select role
                </option>
                {data.roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Department Memberships</h2>
          <p className="mt-1 text-sm text-slate-600">
            Select departments for this user. Manager access is determined by
            the selected role.
          </p>
          <div className="mt-4 space-y-3">
            {data.departmentOptions.map((department) => (
              <div key={department.id} className="rounded-md border border-slate-200 p-3">
                <Checkbox
                  name="departmentIds"
                  value={department.id}
                  label={department.name}
                  defaultChecked={selectedDepartmentIds.has(department.id)}
                />
              </div>
            ))}
          </div>
        </section>

        <button type="submit" className="inline-flex h-11 items-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800">
          Save User
        </button>
      </form>
    </section>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      {label}
      <input name={name} defaultValue={defaultValue} className="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/20" />
    </label>
  );
}

function Checkbox({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: number;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-700"
      />
      {label}
    </label>
  );
}

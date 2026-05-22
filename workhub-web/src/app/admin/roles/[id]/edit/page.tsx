import { notFound, redirect } from "next/navigation";

import { requireCurrentUser } from "@/modules/auth/services/authorization-service";
import { updateRoleAction } from "@/modules/profile/actions/profile-actions";
import {
  getRoleAdminData,
  ProfileError,
} from "@/modules/profile/services/profile-service";

export const metadata = {
  title: "Edit Role | WorkHub",
};

export default async function EditRolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCurrentUser().catch(() => redirect("/login"));
  const { id } = await params;
  const roleId = Number(id);

  if (!Number.isInteger(roleId)) {
    notFound();
  }

  const data = await getRoleAdminData(user, roleId).catch((error) => {
    if (error instanceof ProfileError && error.code === "not_found") {
      notFound();
    }
    redirect("/dashboard");
  });
  const selectedPermissionIds = new Set(data.permissions.map((permission) => permission.id));

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">Edit {data.role.name}</h1>
      </div>
      <form action={updateRoleAction.bind(null, data.role.id)} className="mt-8 space-y-8">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="name" label="Role name" defaultValue={data.role.name} />
            <Field name="description" label="Description" defaultValue={data.role.description ?? ""} />
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Permissions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.allPermissions.map((permission) => (
              <label key={permission.id} className="flex items-start gap-3 rounded-md border border-slate-200 p-3 text-sm font-medium text-slate-800">
                <input type="checkbox" name="permissionIds" value={permission.id} defaultChecked={selectedPermissionIds.has(permission.id)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-700" />
                {permission.key}
              </label>
            ))}
          </div>
        </section>
        <button type="submit" className="inline-flex h-11 items-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800">
          Save Role
        </button>
      </form>
    </section>
  );
}

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      {label}
      <input name={name} defaultValue={defaultValue} className="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/20" />
    </label>
  );
}

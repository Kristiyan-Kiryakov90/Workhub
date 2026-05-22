import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/modules/auth/services/authorization-service";
import { createRoleAction } from "@/modules/profile/actions/profile-actions";
import { getRoleCreateData } from "@/modules/profile/services/profile-service";

export const metadata = {
  title: "Create Role | WorkHub",
};

export default async function NewRolePage() {
  const user = await requireCurrentUser().catch(() => redirect("/login"));
  const permissions = await getRoleCreateData(user).catch(() => redirect("/dashboard"));

  return (
    <RoleFormShell title="Create Role" action={createRoleAction}>
      <PermissionGrid permissions={permissions} selectedPermissionIds={new Set()} />
    </RoleFormShell>
  );
}

function RoleFormShell({
  title,
  action,
  children,
}: {
  title: string;
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Admin</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">{title}</h1>
      </div>
      <form action={action} className="mt-8 space-y-8">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="name" label="Role name" />
            <Field name="description" label="Description" />
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Permissions</h2>
          {children}
        </section>
        <button type="submit" className="inline-flex h-11 items-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800">
          Save Role
        </button>
      </form>
    </section>
  );
}

function Field({ name, label }: { name: string; label: string }) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      {label}
      <input name={name} className="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/20" />
    </label>
  );
}

function PermissionGrid({
  permissions,
  selectedPermissionIds,
}: {
  permissions: { id: number; key: string }[];
  selectedPermissionIds: Set<number>;
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {permissions.map((permission) => (
        <label key={permission.id} className="flex items-start gap-3 rounded-md border border-slate-200 p-3 text-sm font-medium text-slate-800">
          <input type="checkbox" name="permissionIds" value={permission.id} defaultChecked={selectedPermissionIds.has(permission.id)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-700" />
          {permission.key}
        </label>
      ))}
    </div>
  );
}

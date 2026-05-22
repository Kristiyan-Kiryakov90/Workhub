import Link from "next/link";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/modules/auth/services/authorization-service";
import { getRolesAdminData } from "@/modules/profile/services/profile-service";

export const metadata = {
  title: "Roles | WorkHub",
};

export default async function AdminRolesPage() {
  const user = await requireCurrentUser().catch(() => redirect("/login"));
  const roles = await getRolesAdminData(user).catch(() => redirect("/dashboard"));

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
            Roles
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Configure permission assignment through roles.
          </p>
        </div>
        <Link href="/admin/roles/new" className="inline-flex h-11 items-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800">
          Create Role
        </Link>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {roles.map((role) => (
          <Link key={role.id} href={`/admin/roles/${role.id}`} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-300 hover:shadow-md">
            <h2 className="text-lg font-semibold text-slate-950">{role.name}</h2>
            <p className="mt-2 text-sm text-slate-600">{role.description ?? "No description."}</p>
            <p className="mt-4 text-sm font-medium text-slate-700">
              {role.permissions.length} permissions
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

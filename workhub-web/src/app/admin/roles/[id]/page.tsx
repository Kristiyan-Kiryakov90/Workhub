import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireCurrentUser } from "@/modules/auth/services/authorization-service";
import {
  getRoleAdminData,
  ProfileError,
} from "@/modules/profile/services/profile-service";

export const metadata = {
  title: "Role Details | WorkHub",
};

export default async function RoleDetailsPage({
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

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Admin</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">{data.role.name}</h1>
          <p className="mt-2 text-sm text-slate-600">{data.role.description ?? "No description."}</p>
        </div>
        <Link href={`/admin/roles/${data.role.id}/edit`} className="inline-flex h-11 items-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800">
          Edit Role
        </Link>
      </div>
      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Permissions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.permissions.length > 0 ? (
            data.permissions.map((permission) => (
              <span key={permission.id} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                {permission.key}
              </span>
            ))
          ) : (
            <p className="text-sm text-slate-600">No permissions assigned.</p>
          )}
        </div>
      </section>
    </section>
  );
}

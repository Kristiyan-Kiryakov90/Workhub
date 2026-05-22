import Link from "next/link";
import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/modules/auth/services/authorization-service";
import { getAdminUsers } from "@/modules/profile/services/profile-service";
import { deleteAdminUserAction } from "@/modules/profile/actions/profile-actions";

export const metadata = {
  title: "Users | WorkHub",
};

export default async function AdminUsersPage() {
  const currentUser = await requireCurrentUser().catch(() => redirect("/login"));
  const users = await getAdminUsers(currentUser).catch(() => redirect("/dashboard"));

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
            Users
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage user profiles in {currentUser.organizationName}.
          </p>
        </div>
        <Link
          href="/admin/invitations"
          className="inline-flex h-11 items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800"
        >
          Invitations
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Departments</th>
                <th className="px-4 py-3">Permissions</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-950">{user.name}</p>
                    <p className="text-slate-600">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{user.phone ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {user.roles.map((role) => role.name).join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {user.departments
                      .map((department) =>
                        department.isManager
                          ? `${department.name} manager`
                          : department.name,
                      )
                      .join(", ") || "-"}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-700">
                    {user.permissions.join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link className="font-semibold text-cyan-700 hover:text-cyan-800" href={`/admin/users/${user.id}/edit`}>
                        Edit
                      </Link>
                      <form action={deleteAdminUserAction.bind(null, user.id)}>
                        <button className="cursor-pointer font-semibold text-red-700 hover:text-red-800" type="submit">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

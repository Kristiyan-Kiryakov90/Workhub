import { redirect } from "next/navigation";

import { requireCurrentUser } from "@/modules/auth/services/authorization-service";
import {
  cancelInvitationAction,
} from "@/modules/profile/actions/profile-actions";
import {
  getInvitationsAdminData,
  ProfileError,
} from "@/modules/profile/services/profile-service";
import { InvitationForm } from "./invitation-form";

export const metadata = {
  title: "Invitations | WorkHub",
};

export default async function InvitationsPage() {
  const user = await requireCurrentUser().catch(() => redirect("/login"));
  const data = await getInvitationsAdminData(user).catch((error) => {
    if (error instanceof ProfileError && error.code === "forbidden") {
      redirect("/dashboard");
    }

    throw error;
  });
  const departmentNames = new Map(
    data.departmentOptions.map((department) => [department.id, department.name]),
  );

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
          Invitations
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Generate single-use invite links scoped to {user.organizationName}.
        </p>
      </div>

      <div className="mt-8 space-y-8">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Create Invite Link</h2>
          <div className="mt-4">
            <InvitationForm
              roleOptions={data.roleOptions}
              departmentOptions={data.departmentOptions}
            />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-950">Pending Invitations</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Departments</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td className="px-4 py-3 font-medium text-slate-950">{invitation.email}</td>
                      <td className="px-4 py-3 text-slate-700">{invitation.roleName}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {invitation.departmentAssignments
                          .map((assignment) => {
                            const name = departmentNames.get(assignment.departmentId) ?? "Unknown";
                            return assignment.isManager ? `${name} manager` : name;
                          })
                          .join(", ") || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatLabel(invitation.status)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(invitation.expiresAt)}</td>
                      <td className="px-4 py-3">
                        {invitation.status === "pending" ? (
                          <form action={cancelInvitationAction.bind(null, invitation.id)}>
                            <button type="submit" className="cursor-pointer font-semibold text-red-700 hover:text-red-800">
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
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

function formatLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

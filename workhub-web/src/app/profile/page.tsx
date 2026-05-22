import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";
import { getOwnProfileData } from "@/modules/profile/services/profile-service";
import {
  ChangePasswordForm,
  DeleteProfileForm,
  PersonalInformationForm,
} from "./profile-forms";

export const metadata = {
  title: "Profile | WorkHub",
};

export default async function ProfilePage() {
  const user = await requireProfileUser();
  const data = await getOwnProfileData(user);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Profile
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
          My Profile
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          View your organization access and update allowed personal fields.
        </p>
      </div>

      <div className="mt-8 space-y-8">
        <ProfileSection title="Personal Information">
          <div className="grid gap-4 border-b border-slate-100 pb-5 sm:grid-cols-2">
            <ReadOnlyField label="Email" value={data.profile.email} />
            <ReadOnlyField
              label="Created"
              value={formatDateTime(data.profile.createdAt)}
            />
          </div>
          <div className="mt-5">
            <PersonalInformationForm
              name={data.profile.name}
              phone={data.profile.phone}
            />
          </div>
        </ProfileSection>

        <ProfileSection title="Organization Information">
          {data.departments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="py-3 pr-4">Organization</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="py-3 pl-4">Member Since</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.departments.map((department) => (
                    <tr key={department.id}>
                      <td className="py-4 pr-4 font-medium text-slate-950">
                        {data.profile.organizationName}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {department.name}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {data.roles.map((role) => role.name).join(", ") || "Unassigned"}
                      </td>
                      <td className="py-4 pl-4 text-slate-700">
                        {formatDateTime(department.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <ReadOnlyField label="Organization" value={data.profile.organizationName} />
              <ReadOnlyField label="Department" value="Unassigned" />
              <ReadOnlyField
                label="Role"
                value={data.roles.map((role) => role.name).join(", ") || "Unassigned"}
              />
            </div>
          )}
        </ProfileSection>

        <ProfileSection title="Account Security">
          <ChangePasswordForm />
        </ProfileSection>

        <section className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-normal text-red-700">
            Delete My Profile
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            This removes your account, clears your session, and redirects you to the home page.
          </p>
          <div className="mt-5">
            <DeleteProfileForm canDelete={data.canSelfDelete} />
          </div>
        </section>
      </div>
    </section>
  );
}

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold tracking-normal text-slate-950">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-950">{value}</p>
    </div>
  );
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

async function requireProfileUser() {
  try {
    return await requireCurrentUser();
  } catch (error) {
    if (
      error instanceof AuthorizationError &&
      error.code === "unauthenticated"
    ) {
      redirect("/login");
    }

    throw error;
  }
}

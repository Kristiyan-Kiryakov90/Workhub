import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireCurrentUser } from "@/modules/auth/services/authorization-service";
import {
  getAdminUser,
  ProfileError,
} from "@/modules/profile/services/profile-service";
import { deleteAdminUserAction } from "@/modules/profile/actions/profile-actions";

export const metadata = {
  title: "User Details | WorkHub",
};

export default async function AdminUserDetailsPage({
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

  const data = await getAdminUser(currentUser, userId).catch((error) => {
    if (error instanceof ProfileError && error.code === "not_found") {
      notFound();
    }
    redirect("/dashboard");
  });

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
            {data.user.name}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{data.user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link className="inline-flex h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/admin/users">
            Back
          </Link>
          <Link className="inline-flex h-11 items-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800" href={`/admin/users/${data.user.id}/edit`}>
            Edit
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <DetailCard title="User Information">
          <Detail label="Full name" value={data.user.name} />
          <Detail label="Email" value={data.user.email} />
          <Detail label="Phone" value={data.user.phone ?? "-"} />
          <Detail label="Account status" value={data.user.isActive ? "Active" : "Inactive"} />
          <Detail label="Created" value={formatDate(data.user.createdAt)} />
        </DetailCard>
        <DetailCard title="Organization">
          <Detail label="Organization" value={data.user.organizationName} />
          <Detail label="Assigned roles" value={data.roles.map((role) => role.name).join(", ") || "-"} />
          <Detail label="Permissions" value={data.permissions.join(", ") || "-"} />
        </DetailCard>
        <DetailCard title="Assigned Departments">
          {data.departments.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-700">
              {data.departments.map((department) => (
                <li key={department.id}>
                  <span className="font-semibold text-slate-950">{department.name}</span>
                  {department.isManager ? " - manager" : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600">No department assignments.</p>
          )}
        </DetailCard>
        <DetailCard title="Danger Zone">
          <form action={deleteAdminUserAction.bind(null, data.user.id)}>
            <button type="submit" className="inline-flex h-11 cursor-pointer items-center rounded-md bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800">
              Delete User
            </button>
          </form>
        </DetailCard>
      </div>
    </section>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-950">{value}</p>
    </div>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(value);
}

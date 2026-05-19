import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireCurrentUser,
} from "@/modules/auth/services/authorization-service";

export const metadata = {
  title: "Dashboard | WorkHub",
};

export default async function DashboardPage() {
  const user = await requireDashboardUser();

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
          Welcome back, {user.name}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{user.organizationName}</p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["Tasks", "Review and update assigned work."],
          ["Leave", "Track requests and approvals."],
          ["Shifts", "See department coverage and schedules."],
        ].map(([title, description]) => (
          <div
            key={title}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

async function requireDashboardUser() {
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

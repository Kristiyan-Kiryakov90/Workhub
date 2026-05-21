import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About WorkHub | Workforce Operations Platform",
  description:
    "Learn how WorkHub helps organizations manage departments, employees, shifts, leave, tasks, reports, and admin operations.",
};

const operatingPrinciples = [
  "Centralize daily workforce workflows without flattening department ownership.",
  "Give managers the context they need to approve, assign, and schedule work.",
  "Keep employee workflows clear, traceable, and easy to use on any device.",
];

const platformAreas = [
  {
    title: "Administration",
    description:
      "Main admins can manage organization settings, departments, roles, permissions, and reporting from one controlled workspace.",
  },
  {
    title: "Department operations",
    description:
      "Department managers can review leave, organize shifts, assign employees, and keep project work moving with scoped access.",
  },
  {
    title: "Employee workflows",
    description:
      "Employees can view schedules, request leave, update tasks, comment on work, and receive notifications when action is needed.",
  },
];

const metrics = [
  { value: "3", label: "role groups" },
  { value: "8", label: "core modules" },
  { value: "1", label: "operations hub" },
];

export default function AboutPage() {
  return (
    <div className="bg-[#f6f7fb]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700">
              About WorkHub
            </p>
            <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
              Workforce operations built for structured teams
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              WorkHub is an enterprise administration platform for organizations
              that need reliable control over departments, employees, leave,
              shifts, tasks, permissions, notifications, and reports.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-xl shadow-slate-300/50">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-sm font-medium text-slate-300">
                  Operations snapshot
                </p>
                <h2 className="mt-1 text-2xl font-semibold">WorkHub</h2>
              </div>
              <span className="rounded-md bg-cyan-500/15 px-3 py-1 text-sm font-semibold text-cyan-200">
                Public overview
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-lg bg-white p-4 text-slate-950">
                  <p className="text-3xl font-semibold">{metric.value}</p>
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">
                Designed for role-aware work
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Admins, department managers, and employees each get workflows
                that match their responsibilities and access boundaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {platformAreas.map((area) => (
            <article
              key={area.title}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-slate-950">
                {area.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                {area.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-700">
              How we think
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-950">
              Practical controls for real operations
            </h2>
          </div>
          <div className="space-y-4">
            {operatingPrinciples.map((principle, index) => (
              <div
                key={principle}
                className="flex gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-700 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <p className="text-base leading-7 text-slate-700">{principle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

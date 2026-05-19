import { FeatureCarousel } from "./components/feature-carousel";
import { TypingCapabilityText } from "./components/typing-capability-text";

const features = [
  {
    title: "Department management",
    description:
      "Build department structures, assign managers, and keep every team aligned.",
    icon: "departments",
  },
  {
    title: "Leave approvals",
    description:
      "Route sick leave and vacation requests with clear status and audit trails.",
    icon: "leave",
  },
  {
    title: "Shift scheduling",
    description:
      "Plan department coverage, assign employees, and track schedule changes.",
    icon: "shifts",
  },
  {
    title: "Task assignment",
    description:
      "Prioritize work, assign owners, and monitor progress across departments.",
    icon: "tasks",
  },
  {
    title: "Roles and permissions",
    description:
      "Protect admin workflows with scoped permissions and role-based access.",
    icon: "permissions",
  },
];

const workflowItems = [
  "Employee leave requested",
  "Manager review",
  "Shift coverage checked",
  "Approval logged",
];

const dashboardRows = [
  { label: "Leave approvals", value: "12 pending", color: "bg-orange-500" },
  { label: "Shift coverage", value: "94% staffed", color: "bg-emerald-500" },
  { label: "Open tasks", value: "38 active", color: "bg-cyan-600" },
];

export default function Home() {
  return (
    <div className="overflow-hidden bg-[#f6f7fb]">
      <section className="relative border-b border-slate-200 bg-white">
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#f6f7fb]" />
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 pb-12 pt-14 text-center sm:px-6 sm:pb-16 sm:pt-20 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700">
            Welcome to WorkHub
          </p>
          <h1 className="mt-5 max-w-5xl text-balance break-words text-4xl font-semibold leading-tight tracking-normal text-slate-950 min-[420px]:text-5xl sm:text-6xl lg:text-7xl">
            All-in-one Workforce Administration Platform
          </h1>
          <p className="mt-7 max-w-4xl text-balance text-xl font-medium leading-8 text-slate-800 sm:text-3xl sm:leading-10">
            <TypingCapabilityText />
          </p>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Simplify workforce operations while giving admins, managers, and
            employees a clean workspace for the workflows that keep work moving.
          </p>

          <div className="relative mt-12 w-full max-w-5xl">
            <div className="relative mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-4 text-left shadow-2xl shadow-slate-300/60 sm:p-6">
              <div className="flex items-center gap-2 border-b border-white/10 pb-4">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-300" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-sm font-medium text-slate-300">
                  WorkHub operations board
                </span>
              </div>
              <div className="grid gap-4 pt-5 lg:grid-cols-[0.75fr_1.25fr]">
                <div className="space-y-3">
                  {dashboardRows.map((row) => (
                    <div
                      key={row.label}
                      className="rounded-lg bg-white p-4 text-slate-950"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`h-3 w-3 rounded-full ${row.color}`} />
                        <p className="text-sm font-semibold">{row.label}</p>
                      </div>
                      <p className="mt-3 text-2xl font-semibold">
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-white p-4 text-slate-950">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Workflow</p>
                      <h2 className="mt-1 text-xl font-semibold">
                        Leave request approval
                      </h2>
                    </div>
                    <span className="rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                      Live
                    </span>
                  </div>
                  <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="home-moving-marker" aria-hidden="true" />
                    <div className="grid gap-3 md:grid-cols-4">
                      {workflowItems.map((item, index) => (
                        <div
                          key={item}
                          className="relative z-10 min-h-28 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-700 text-sm font-bold text-white">
                            {index + 1}
                          </span>
                          <p className="mt-4 text-sm font-semibold leading-5 text-slate-800">
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold text-slate-950 sm:text-4xl">
            Key platform capabilities
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Each module is designed for daily admin work: structured, scannable,
            and ready for organization-level controls.
          </p>
        </div>

        <FeatureCarousel features={features} />
      </section>
    </div>
  );
}

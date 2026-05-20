export default function Loading() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-slate-200" />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="min-h-40 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 flex gap-2">
              <div className="h-6 w-20 animate-pulse rounded bg-slate-100" />
              <div className="h-6 w-24 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="mt-12 h-4 w-32 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </section>
  );
}

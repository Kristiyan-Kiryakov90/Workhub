export default function LeaveDetailsLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-5 w-28 rounded bg-slate-200" />
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-36 rounded bg-slate-200" />
        <div className="mt-3 h-8 w-64 rounded bg-slate-200" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="mt-2 h-5 w-full rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

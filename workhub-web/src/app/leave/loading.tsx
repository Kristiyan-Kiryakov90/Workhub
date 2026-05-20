export default function LeaveLoading() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <div className="h-4 w-20 rounded bg-slate-200" />
        <div className="mt-3 h-9 w-64 rounded bg-slate-200" />
        <div className="mt-2 h-4 w-full max-w-xl rounded bg-slate-200" />
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="mt-2 h-10 rounded-md bg-slate-100" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-10">
        {Array.from({ length: 2 }).map((_, sectionIndex) => (
          <section key={sectionIndex}>
            <div className="h-6 w-64 rounded bg-slate-200" />
            <div className="mt-2 h-4 w-96 max-w-full rounded bg-slate-200" />
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              {Array.from({ length: 3 }).map((__, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 lg:grid-cols-[1.2fr_1fr_1fr_0.9fr_1fr_1fr]"
                >
                  {Array.from({ length: 6 }).map((___, cellIndex) => (
                    <div key={cellIndex} className="h-5 rounded bg-slate-100" />
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>© 2026 WorkHub. Workforce operations for growing organizations.</p>
        <div className="flex gap-4">
          <span>Security-first admin tools</span>
          <span className="hidden sm:inline">Role-aware workflows</span>
        </div>
      </div>
    </footer>
  );
}

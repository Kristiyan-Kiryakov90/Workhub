"use client";

import { useFormStatus } from "react-dom";

export function ChecklistToggleButton({
  isCompleted,
}: {
  isCompleted: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={isCompleted ? "Mark checklist item incomplete" : "Mark checklist item complete"}
      className={[
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold transition",
        "focus:outline-none focus:ring-2 focus:ring-cyan-100",
        pending ? "cursor-not-allowed opacity-60" : "hover:border-cyan-500",
        isCompleted
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-slate-300 bg-white text-transparent",
      ].join(" ")}
    >
      x
    </button>
  );
}

export function ChecklistDeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Removing..." : "Remove"}
    </button>
  );
}

export function AddChecklistButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
    >
      {pending ? "Adding..." : "Add Item"}
    </button>
  );
}

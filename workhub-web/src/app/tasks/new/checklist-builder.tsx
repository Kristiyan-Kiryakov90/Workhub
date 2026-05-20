"use client";

import { useState } from "react";

type ChecklistDraft = {
  id: string;
  title: string;
  isCompleted: boolean;
};

export function ChecklistBuilder() {
  const [items, setItems] = useState<ChecklistDraft[]>([]);
  const [title, setTitle] = useState("");

  function addItem() {
    const trimmed = title.trim();

    if (!trimmed) {
      return;
    }

    setItems((current) => [
      ...current,
      { id: crypto.randomUUID(), title: trimmed.slice(0, 255), isCompleted: false },
    ]);
    setTitle("");
  }

  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Checklist
      </span>

      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50">
        {items.length > 0 ? (
          <ul className="divide-y divide-slate-200">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-3 py-2">
                <input
                  type="hidden"
                  name="checklistItem"
                  value={`${item.isCompleted ? "[x]" : "[ ]"} ${item.title}`}
                />
                <button
                  type="button"
                  aria-label={
                    item.isCompleted
                      ? "Mark checklist item incomplete"
                      : "Mark checklist item complete"
                  }
                  onClick={() =>
                    setItems((current) =>
                      current.map((candidate) =>
                        candidate.id === item.id
                          ? { ...candidate, isCompleted: !candidate.isCompleted }
                          : candidate,
                      ),
                    )
                  }
                  className={[
                    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold transition",
                    item.isCompleted
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-300 bg-white text-transparent",
                  ].join(" ")}
                >
                  x
                </button>
                <span
                  className={[
                    "min-w-0 flex-1 text-sm",
                    item.isCompleted ? "line-through text-slate-500" : "text-slate-700",
                  ].join(" ")}
                >
                  {item.title}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setItems((current) =>
                      current.filter((candidate) => candidate.id !== item.id),
                    )
                  }
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-4 text-sm text-slate-600">No checklist items.</p>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          maxLength={255}
          placeholder="Add checklist item"
          className="h-10 flex-1 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        />
        <button
          type="button"
          onClick={addItem}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add Item
        </button>
      </div>
    </div>
  );
}

"use client";

import { type FormEvent, useRef, useState, useTransition } from "react";

import {
  addChecklistItemInlineAction,
  deleteChecklistItemInlineAction,
  toggleChecklistItemInlineAction,
} from "@/modules/tasks/actions/task-actions";

type ChecklistItem = {
  id: number;
  title: string;
  isCompleted: boolean;
  position: number;
};

export function TaskChecklist({
  taskId,
  initialItems,
  canManageTask,
  toggleCsrfToken,
  addCsrfToken,
  deleteCsrfToken,
}: {
  taskId: number;
  initialItems: ChecklistItem[];
  canManageTask: boolean;
  toggleCsrfToken: string;
  addCsrfToken: string | null;
  deleteCsrfToken: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inFlightOperations = useRef(new Set<string>());
  const temporaryId = useRef(-1);

  function toggleItem(itemId: number, isCompleted: boolean) {
    const operationKey = `toggle:${itemId}`;

    if (inFlightOperations.current.has(operationKey)) {
      return;
    }

    const previousItems = items;
    const nextValue = !isCompleted;

    inFlightOperations.current.add(operationKey);
    setError(null);
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, isCompleted: nextValue } : item,
      ),
    );

    startTransition(async () => {
      const result = await toggleChecklistItemInlineAction({
        taskId,
        itemId,
        isCompleted: nextValue,
        csrfToken: toggleCsrfToken,
      });

      if (!result.ok) {
        setItems(previousItems);
        setError(checklistErrorMessage(result.error));
      }

      inFlightOperations.current.delete(operationKey);
    });
  }

  function deleteItem(itemId: number) {
    if (!canManageTask || !deleteCsrfToken) {
      return;
    }

    const operationKey = `delete:${itemId}`;

    if (inFlightOperations.current.has(operationKey)) {
      return;
    }

    const previousItems = items;
    inFlightOperations.current.add(operationKey);
    setError(null);
    setItems((current) => current.filter((item) => item.id !== itemId));

    startTransition(async () => {
      const result = await deleteChecklistItemInlineAction({
        taskId,
        itemId,
        csrfToken: deleteCsrfToken,
      });

      if (!result.ok) {
        setItems(previousItems);
        setError(checklistErrorMessage(result.error));
      }

      inFlightOperations.current.delete(operationKey);
    });
  }

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageTask || !addCsrfToken) {
      return;
    }

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    const operationKey = `add:${trimmedTitle.toLowerCase()}`;

    if (inFlightOperations.current.has(operationKey)) {
      return;
    }

    const temporaryItem: ChecklistItem = {
      id: temporaryId.current--,
      title: trimmedTitle,
      isCompleted: false,
      position: items.length,
    };
    const previousItems = items;

    inFlightOperations.current.add(operationKey);
    setError(null);
    setTitle("");
    setItems((current) => [...current, temporaryItem]);

    startTransition(async () => {
      const result = await addChecklistItemInlineAction({
        taskId,
        title: trimmedTitle,
        csrfToken: addCsrfToken,
      });

      if (result.ok && result.item) {
        setItems((current) =>
          current.map((item) =>
            item.id === temporaryItem.id ? result.item : item,
          ),
        );
      } else {
        setItems(previousItems);
        setTitle(trimmedTitle);
        setError(checklistErrorMessage(result.error));
      }

      inFlightOperations.current.delete(operationKey);
    });
  }

  return (
    <>
      {items.length > 0 ? (
        <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-slate-50">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700"
            >
              <button
                type="button"
                aria-label={
                  item.isCompleted
                    ? "Mark checklist item incomplete"
                    : "Mark checklist item complete"
                }
                onClick={() => toggleItem(item.id, item.isCompleted)}
                className={[
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold transition",
                  "focus:outline-none focus:ring-2 focus:ring-cyan-100",
                  "hover:border-cyan-500",
                  item.isCompleted
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-300 bg-white text-transparent",
                ].join(" ")}
              >
                x
              </button>

              <span
                className={[
                  "min-w-0 flex-1",
                  item.isCompleted ? "line-through text-slate-500" : "",
                ].join(" ")}
              >
                {item.title}
              </span>

              {canManageTask ? (
                <button
                  type="button"
                  onClick={() => deleteItem(item.id)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-600">No checklist items.</p>
      )}

      {canManageTask ? (
        <form onSubmit={addItem} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">New checklist item</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={255}
              required
              placeholder="Add checklist item"
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <button
            type="submit"
            disabled={isPending || !title.trim()}
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            {isPending ? "Saving..." : "Add Item"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </>
  );
}

function checklistErrorMessage(error: string | undefined) {
  if (error === "session-expired") {
    return "Your session expired. Refresh the page and try again.";
  }

  if (error === "invalid-checklist") {
    return "The checklist item is invalid.";
  }

  return "The checklist could not be updated.";
}

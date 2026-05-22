"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function InviteLookupForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = extractToken(value);

    if (!token) {
      setError("Enter a valid invitation link or token.");
      return;
    }

    router.push(`/invite/${encodeURIComponent(token)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <label className="block text-sm font-medium text-slate-800">
        Invitation link or token
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError("");
          }}
          placeholder="https://example.com/invite/..."
          className="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/20"
        />
      </label>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800 sm:w-auto"
      >
        Continue
      </button>
    </form>
  );
}

function extractToken(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const inviteIndex = parts.indexOf("invite");

    return inviteIndex >= 0 ? parts[inviteIndex + 1] ?? "" : "";
  } catch {
    return trimmed.replace(/^\/?invite\//, "");
  }
}

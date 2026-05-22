"use client";

import { useActionState } from "react";

import {
  acceptInvitationAction,
  type ProfileActionState,
} from "@/modules/profile/actions/profile-actions";

const initialState: ProfileActionState = {};

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    acceptInvitationAction.bind(null, token),
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 grid gap-5 sm:grid-cols-2">
      <Field name="name" label="Full name" />
      <Field name="phone" label="Phone" />
      <Field name="password" label="Password" type="password" autoComplete="new-password" />
      <Field name="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" />
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={isPending} className="inline-flex h-11 w-full items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800 disabled:bg-slate-400 sm:w-auto">
          {isPending ? "Creating..." : "Create Account"}
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  autoComplete,
}: {
  name: string;
  label: string;
  type?: "text" | "password";
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      {label}
      <input name={name} type={type} autoComplete={autoComplete} className="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/20" />
    </label>
  );
}

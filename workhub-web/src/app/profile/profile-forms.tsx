"use client";

import { useActionState } from "react";

import {
  changeOwnPasswordAction,
  deleteOwnProfileAction,
  updateOwnProfileAction,
  type ProfileActionState,
} from "@/modules/profile/actions/profile-actions";

const initialState: ProfileActionState = {};

export function PersonalInformationForm({
  name,
  phone,
}: {
  name: string;
  phone: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    updateOwnProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Field name="name" label="Full name" defaultValue={name} />
      <Field name="phone" label="Phone" defaultValue={phone ?? ""} />
      <ActionMessage state={state} />
      <SubmitButton label="Save Profile" pendingLabel="Saving..." pending={isPending} />
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changeOwnPasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-3">
      <Field
        name="currentPassword"
        label="Current password"
        type="password"
        autoComplete="current-password"
      />
      <Field
        name="newPassword"
        label="New password"
        type="password"
        autoComplete="new-password"
      />
      <Field
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
      />
      <ActionMessage state={state} />
      <SubmitButton
        label="Change Password"
        pendingLabel="Changing..."
        pending={isPending}
      />
    </form>
  );
}

export function DeleteProfileForm({ canDelete }: { canDelete: boolean }) {
  const [state, formAction, isPending] = useActionState(
    deleteOwnProfileAction,
    initialState,
  );

  if (!canDelete) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
        You cannot delete your profile because you are the only Main Admin of this organization.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-[1fr_auto]">
      <Field
        name="confirmation"
        label="Type DELETE to confirm"
        autoComplete="off"
      />
      <div className="flex items-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-md bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
        >
          {isPending ? "Deleting..." : "Delete My Profile"}
        </button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue = "",
  type = "text",
  autoComplete,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: "text" | "password";
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/20"
      />
    </label>
  );
}

function SubmitButton({
  label,
  pendingLabel,
  pending,
}: {
  label: string;
  pendingLabel: string;
  pending: boolean;
}) {
  return (
    <div className="sm:col-span-full">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
      >
        {pending ? pendingLabel : label}
      </button>
    </div>
  );
}

function ActionMessage({ state }: { state: ProfileActionState }) {
  if (!state.error && !state.success) {
    return null;
  }

  return (
    <p
      className={`rounded-md px-3 py-2 text-sm sm:col-span-full ${
        state.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {state.error ?? state.success}
    </p>
  );
}

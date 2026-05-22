"use client";

import { useActionState } from "react";
import Link from "next/link";

import {
  createInvitationAction,
  type ProfileActionState,
} from "@/modules/profile/actions/profile-actions";

const initialState: ProfileActionState = {};

export function InvitationForm({
  roleOptions,
  departmentOptions,
}: {
  roleOptions: { id: number; name: string }[];
  departmentOptions: { id: number; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    createInvitationAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="email" label="Email" type="email" />
        <label className="block text-sm font-medium text-slate-800">
          Role
          <select name="roleId" className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/20">
            {roleOptions.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <Field name="expiresAt" label="Expiration date" type="date" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-950">Departments</h3>
        <p className="mt-1 text-sm text-slate-600">
          Select departments for the invited user. Manager access is determined
          by the selected role.
        </p>
        <div className="mt-3 space-y-3">
          {departmentOptions.map((department) => (
            <div
              key={department.id}
              className="rounded-md border border-slate-200 p-3"
            >
              <Checkbox
                name="departmentIds"
                value={department.id}
                label={department.name}
              />
            </div>
          ))}
        </div>
      </div>

      {state.error || state.success ? (
        <div className={`rounded-md p-3 text-sm ${state.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          <p>{state.error ?? state.success}</p>
          {state.inviteLink ? (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input readOnly value={state.inviteLink} className="block h-10 min-w-0 flex-1 rounded-md border border-emerald-200 bg-white px-3 text-sm text-slate-950" />
              <Link
                href={state.inviteLink}
                className="inline-flex h-10 items-center justify-center rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Open
              </Link>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(state.inviteLink ?? "")}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Copy
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <button type="submit" disabled={isPending} className="inline-flex h-11 cursor-pointer items-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400">
        {isPending ? "Creating..." : "Create Invite Link"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
}: {
  name: string;
  label: string;
  type?: "text" | "email" | "date";
}) {
  return (
    <label className="block text-sm font-medium text-slate-800">
      {label}
      <input name={name} type={type} className="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/20" />
    </label>
  );
}

function Checkbox({
  name,
  value,
  label,
}: {
  name: string;
  value: number;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
      <input type="checkbox" name={name} value={value} className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-700" />
      {label}
    </label>
  );
}

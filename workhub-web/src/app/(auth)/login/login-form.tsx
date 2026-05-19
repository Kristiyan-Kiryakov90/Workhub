"use client";

import Link from "next/link";
import { FormEvent, useActionState, useMemo, useState } from "react";

import {
  loginAction,
  type LoginActionState,
} from "@/modules/auth/actions/auth-actions";

type LoginFields = {
  email: string;
  password: string;
};

const initialActionState: LoginActionState = {};

export function LoginForm({ csrfToken }: { csrfToken: string }) {
  const [actionState, formAction, isPending] = useActionState(
    loginAction,
    initialActionState,
  );
  const [fields, setFields] = useState<LoginFields>({
    email: "",
    password: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => {
    const nextErrors: Partial<LoginFields> = {};

    if (!fields.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(fields.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!fields.password) {
      nextErrors.password = "Password is required.";
    }

    return nextErrors;
  }, [fields]);

  const hasErrors = Object.keys(errors).length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setSubmitted(true);

    if (hasErrors) {
      event.preventDefault();
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Login</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Access your WorkHub organization workspace.
          </p>
        </div>

        <form
          action={formAction}
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
          noValidate
        >
          <input type="hidden" name="csrfToken" value={csrfToken} />

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-800"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={fields.email}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              aria-describedby="email-error"
              className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/20"
            />
            {submitted && errors.email ? (
              <p id="email-error" className="mt-2 text-sm text-red-700">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-800"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={fields.password}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              aria-describedby="password-error"
              className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/20"
            />
            {submitted && errors.password ? (
              <p id="password-error" className="mt-2 text-sm text-red-700">
                {errors.password}
              </p>
            ) : null}
          </div>

          {actionState.error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionState.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending || (submitted && hasErrors)}
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2"
          >
            {isPending ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Need to create an organization?{" "}
          <Link
            href="/register-organization"
            className="font-semibold text-cyan-700 hover:text-cyan-800"
          >
            Register Organization
          </Link>
        </p>
      </div>
    </section>
  );
}

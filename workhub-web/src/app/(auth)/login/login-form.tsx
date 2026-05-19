"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type LoginFields = {
  email: string;
  password: string;
};

export function LoginForm() {
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
    event.preventDefault();
    setSubmitted(true);

    if (hasErrors) {
      return;
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

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
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

          {submitted && !hasErrors ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Login validation passed. Authentication will connect here when
              the auth server action is implemented.
            </p>
          ) : null}

          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2"
          >
            Login
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

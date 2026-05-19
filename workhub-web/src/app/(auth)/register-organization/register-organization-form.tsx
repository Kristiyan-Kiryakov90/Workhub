"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type RegisterFields = {
  organizationName: string;
  adminFullName: string;
  adminEmail: string;
  password: string;
  confirmPassword: string;
};

const initialFields: RegisterFields = {
  organizationName: "",
  adminFullName: "",
  adminEmail: "",
  password: "",
  confirmPassword: "",
};

export function RegisterOrganizationForm() {
  const [fields, setFields] = useState<RegisterFields>(initialFields);
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => {
    const nextErrors: Partial<RegisterFields> = {};

    if (!fields.organizationName.trim()) {
      nextErrors.organizationName = "Organization name is required.";
    }

    if (!fields.adminFullName.trim()) {
      nextErrors.adminFullName = "Admin full name is required.";
    }

    if (!fields.adminEmail.trim()) {
      nextErrors.adminEmail = "Admin email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(fields.adminEmail)) {
      nextErrors.adminEmail = "Enter a valid admin email address.";
    }

    if (!fields.password) {
      nextErrors.password = "Password is required.";
    } else if (
      fields.password.length < 8 ||
      !/[A-Z]/.test(fields.password) ||
      !/[a-z]/.test(fields.password) ||
      !/\d/.test(fields.password)
    ) {
      nextErrors.password =
        "Use at least 8 characters with uppercase, lowercase, and a number.";
    }

    if (!fields.confirmPassword) {
      nextErrors.confirmPassword = "Confirm your password.";
    } else if (fields.confirmPassword !== fields.password) {
      nextErrors.confirmPassword = "Passwords must match.";
    }

    return nextErrors;
  }, [fields]);

  const hasErrors = Object.keys(errors).length > 0;

  function updateField<Key extends keyof RegisterFields>(
    key: Key,
    value: RegisterFields[Key],
  ) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (hasErrors) {
      return;
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Register Organization
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create a new organization and its first Main Admin account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 grid gap-5 sm:grid-cols-2"
          noValidate
        >
          <Field
            id="organizationName"
            label="Organization name"
            value={fields.organizationName}
            error={submitted ? errors.organizationName : undefined}
            onChange={(value) => updateField("organizationName", value)}
            className="sm:col-span-2"
          />
          <Field
            id="adminFullName"
            label="Admin full name"
            value={fields.adminFullName}
            error={submitted ? errors.adminFullName : undefined}
            onChange={(value) => updateField("adminFullName", value)}
          />
          <Field
            id="adminEmail"
            label="Admin email"
            type="email"
            autoComplete="email"
            value={fields.adminEmail}
            error={submitted ? errors.adminEmail : undefined}
            onChange={(value) => updateField("adminEmail", value)}
          />
          <Field
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            value={fields.password}
            error={submitted ? errors.password : undefined}
            onChange={(value) => updateField("password", value)}
          />
          <Field
            id="confirmPassword"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={fields.confirmPassword}
            error={submitted ? errors.confirmPassword : undefined}
            onChange={(value) => updateField("confirmPassword", value)}
          />

          {submitted && !hasErrors ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:col-span-2">
              Registration validation passed. Organization creation will
              connect here when the registration server action is implemented.
            </p>
          ) : null}

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white transition hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2 sm:w-auto"
            >
              Register Organization
            </button>
          </div>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Already have an organization?{" "}
          <Link
            href="/login"
            className="font-semibold text-cyan-700 hover:text-cyan-800"
          >
            Login
          </Link>
        </p>
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  type = "text",
  autoComplete,
  className = "",
}: {
  id: keyof RegisterFields;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  className?: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={error ? errorId : undefined}
        className="mt-2 block h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/20"
      />
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

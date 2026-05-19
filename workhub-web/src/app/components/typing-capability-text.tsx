"use client";

import { useEffect, useState } from "react";

const capabilities = [
  "departments",
  "employees",
  "shifts",
  "tasks",
  "permissions",
];

export function TypingCapabilityText() {
  const [capabilityIndex, setCapabilityIndex] = useState(0);
  const [letterCount, setLetterCount] = useState(capabilities[0].length);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentCapability = capabilities[capabilityIndex];
    const isComplete = letterCount === currentCapability.length;
    const isEmpty = letterCount === 0;
    const delay = isComplete && !isDeleting ? 1200 : isDeleting ? 45 : 85;

    const timeout = window.setTimeout(() => {
      if (isComplete && !isDeleting) {
        setIsDeleting(true);
        return;
      }

      if (isEmpty && isDeleting) {
        setCapabilityIndex((current) => (current + 1) % capabilities.length);
        setIsDeleting(false);
        return;
      }

      setLetterCount((current) => current + (isDeleting ? -1 : 1));
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [capabilityIndex, isDeleting, letterCount]);

  const activeCapability = capabilities[capabilityIndex].slice(0, letterCount);

  return (
    <>
      WorkHub allows you to manage{" "}
      <span
        className="relative inline-flex min-w-[7ch] justify-start text-orange-600 sm:min-w-[8.4ch]"
        aria-live="polite"
      >
        {activeCapability}
        <span className="home-cursor" aria-hidden="true" />
      </span>{" "}
      in one simple hub.
    </>
  );
}

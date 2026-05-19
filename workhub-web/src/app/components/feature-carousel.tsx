"use client";

import { useEffect, useMemo, useState } from "react";

type Feature = {
  title: string;
  description: string;
  icon: string;
};

export function FeatureCarousel({ features }: { features: Feature[] }) {
  const pageSize = 3;
  const pageCount = Math.ceil(features.length / pageSize);
  const [activePage, setActivePage] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActivePage((current) => (current + 1) % pageCount);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [pageCount]);

  const visibleFeatures = useMemo(
    () => features.slice(activePage * pageSize, activePage * pageSize + pageSize),
    [activePage, features],
  );

  return (
    <>
      <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {visibleFeatures.map((feature) => (
          <article
            key={feature.title}
            className="group min-h-80 rounded-2xl border border-white bg-white p-8 shadow-2xl shadow-slate-200/80 transition duration-300 hover:-translate-y-1 hover:shadow-slate-300/80"
          >
            <FeatureIllustration type={feature.icon} />
            <h3 className="mt-8 text-2xl font-semibold text-slate-950">
              {feature.title}
            </h3>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              {feature.description}
            </p>
            <p className="mt-6 inline-flex items-center gap-3 text-base font-semibold text-orange-600">
              Learn More
              <span
                aria-hidden="true"
                className="transition group-hover:translate-x-1"
              >
                →
              </span>
            </p>
          </article>
        ))}
      </div>

      <div className="mt-12 flex justify-center gap-4">
        {Array.from({ length: pageCount }, (_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Show capability page ${index + 1}`}
            onClick={() => setActivePage(index)}
            className={`h-3 w-3 rounded-full transition ${
              index === activePage
                ? "bg-white ring-2 ring-orange-600"
                : "bg-slate-900 hover:bg-orange-600"
            }`}
          />
        ))}
      </div>
    </>
  );
}

function FeatureIllustration({ type }: { type: string }) {
  return (
    <div className="h-28 w-32 text-slate-700">
      <svg
        viewBox="0 0 140 120"
        role="img"
        aria-label=""
        className="h-full w-full"
        fill="none"
      >
        <path
          d="M23 23h78v58H23z"
          className={type === "departments" ? "fill-slate-100" : "fill-white"}
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          d="M33 36h24M33 50h44M33 64h30"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <path
          d="M92 31l22 10-5 28-24 9-14-21z"
          className={type === "leave" ? "fill-orange-50" : "fill-slate-100"}
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        <path
          d="M84 35c20-22 44 4 22 24M85 84c15 12 40 6 43-13"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <circle
          cx="96"
          cy="54"
          r="16"
          className={type === "shifts" ? "fill-cyan-50" : "fill-white"}
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          d="M96 44v11l8 5M45 91h45M54 101h27"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <path
          d="M47 74l12 9 22-30"
          className={type === "tasks" ? "stroke-orange-600" : ""}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="5"
        />
        <path
          d="M111 83h13v14h-13zM94 83h13v14H94z"
          className={type === "permissions" ? "fill-cyan-100" : "fill-white"}
          stroke="currentColor"
          strokeWidth="4"
        />
      </svg>
    </div>
  );
}

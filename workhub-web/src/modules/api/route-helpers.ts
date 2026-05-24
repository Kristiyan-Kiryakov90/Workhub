import { NextResponse } from "next/server";

import {
  MobileApiError,
  requireBearerAuth,
  type MobileAuthContext,
} from "./mobile-auth-service";

export type Paging = {
  page: number;
  pageSize: number;
  offset: number;
};

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function parsePaging(searchParams: URLSearchParams): Paging {
  const page = clampInteger(searchParams.get("page"), 1, 1, 10_000);
  const pageSize = clampInteger(searchParams.get("pageSize"), 20, 1, 100);

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function paged<T>(items: T[], paging: Paging, totalCount: number) {
  return {
    items,
    page: paging.page,
    pageSize: paging.pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / paging.pageSize)),
  };
}

export async function withAuth(
  request: Request,
  handler: (context: MobileAuthContext) => Promise<Response>,
  options?: { includeRoles?: boolean },
) {
  try {
    return await handler(await requireBearerAuth(request, options));
  } catch (error) {
    return handleApiError(error);
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof MobileApiError) {
    return json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return json({ error: "Something went wrong." }, { status: 500 });
}

export function notFound(message = "Resource not found.") {
  throw new MobileApiError(404, message);
}

export function forbidden(message = "You do not have access to this resource.") {
  throw new MobileApiError(403, message);
}

export function badRequest(message = "Invalid request.") {
  throw new MobileApiError(400, message);
}

export function parseId(value: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1) {
    badRequest("Invalid resource id.");
  }

  return id;
}

export function parseOptionalId(value: string | null) {
  if (!value) {
    return undefined;
  }

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function clampInteger(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

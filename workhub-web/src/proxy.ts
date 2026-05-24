import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { sessionCookieName } from "./modules/auth/constants";
import { verifySessionToken } from "./modules/auth/services/jwt-service";

const publicRoutes = new Set([
  "/",
  "/about",
  "/api/auth/login",
  "/api/docs",
  "/api/header-session",
  "/login",
  "/register-organization",
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      return withCorsHeaders(new NextResponse(null, { status: 204 }), request);
    }

    return withCorsHeaders(NextResponse.next(), request);
  }

  if (
    publicRoutes.has(pathname) ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(sessionCookieName)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};

function withCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin && isAllowedApiOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("Access-Control-Allow-Credentials", "false");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Accept",
  );
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
}

function isAllowedApiOrigin(origin: string) {
  try {
    const url = new URL(origin);

    return (
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      ["3000", "8081", "8082", "19006"].includes(url.port)
    );
  } catch {
    return false;
  }
}

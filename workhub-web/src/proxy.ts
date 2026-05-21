import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { sessionCookieName } from "./modules/auth/constants";
import { verifySessionToken } from "./modules/auth/services/jwt-service";

const publicRoutes = new Set([
  "/",
  "/about",
  "/api/header-session",
  "/login",
  "/register-organization",
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicRoutes.has(pathname) ||
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

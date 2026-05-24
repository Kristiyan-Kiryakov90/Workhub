import {
  corsJson,
  corsNoContent,
  handleApiError,
  withCorsHeaders,
} from "@/modules/api/route-helpers";
import { loginForMobile, MobileApiError } from "@/modules/api/mobile-auth-service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = String(body?.email ?? "");
    const password = String(body?.password ?? "");

    if (!email.trim() || !password) {
      throw new MobileApiError(400, "Email and password are required.");
    }

    const result = await loginForMobile(email, password);

    if (!result) {
      throw new MobileApiError(401, "Invalid email or password.");
    }

    return corsJson(result, request);
  } catch (error) {
    return withCorsHeaders(handleApiError(error), request);
  }
}

export function OPTIONS(request: Request) {
  return corsNoContent(request);
}

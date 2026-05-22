import { json, parseOptionalId, parsePaging, withAuth } from "@/modules/api/route-helpers";
import {
  createMobileLeave,
  listMobileLeave,
} from "@/modules/api/mobile-api-service";

export async function GET(request: Request) {
  return withAuth(request, async ({ user }) => {
    const { searchParams } = new URL(request.url);

    return json(await listMobileLeave(user, parsePaging(searchParams)));
  });
}

export async function POST(request: Request) {
  return withAuth(request, async ({ user }) => {
    const body = await request.json().catch(() => null);

    return json(
      await createMobileLeave(user, {
        leaveType: String(body?.leaveType ?? body?.type ?? ""),
        startDate: String(body?.startDate ?? ""),
        endDate: String(body?.endDate ?? ""),
        reason: typeof body?.reason === "string" ? body.reason : null,
        departmentId: parseOptionalId(
          body?.departmentId === undefined ? null : String(body.departmentId),
        ),
      }),
      { status: 201 },
    );
  });
}

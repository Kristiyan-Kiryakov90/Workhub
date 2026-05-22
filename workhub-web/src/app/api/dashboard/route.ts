import {
  json,
  parseOptionalId,
  withAuth,
} from "@/modules/api/route-helpers";
import { getMobileDashboard } from "@/modules/api/mobile-api-service";

export async function GET(request: Request) {
  return withAuth(request, async ({ user }) => {
    const { searchParams } = new URL(request.url);

    return json(
      await getMobileDashboard(user, {
        startDate: searchParams.get("startDate"),
        endDate: searchParams.get("endDate"),
        departmentId: parseOptionalId(searchParams.get("departmentId")),
      }),
    );
  });
}

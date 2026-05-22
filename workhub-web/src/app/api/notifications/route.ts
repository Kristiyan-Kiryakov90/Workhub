import { json, parsePaging, withAuth } from "@/modules/api/route-helpers";
import { listMobileNotifications } from "@/modules/api/mobile-api-service";

export async function GET(request: Request) {
  return withAuth(request, async ({ user }) => {
    const { searchParams } = new URL(request.url);

    return json(await listMobileNotifications(user, parsePaging(searchParams)));
  });
}

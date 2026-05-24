import { json, withAuth } from "@/modules/api/route-helpers";
import { getMobileUnreadNotificationCount } from "@/modules/api/mobile-api-service";

export async function GET(request: Request) {
  return withAuth(request, async ({ user }) => {
    return json(await getMobileUnreadNotificationCount(user));
  });
}

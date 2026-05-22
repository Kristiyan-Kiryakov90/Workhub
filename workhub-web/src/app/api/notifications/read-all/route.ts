import { json, withAuth } from "@/modules/api/route-helpers";
import { readAllMobileNotifications } from "@/modules/api/mobile-api-service";

export async function POST(request: Request) {
  return withAuth(request, async ({ user }) => {
    return json(await readAllMobileNotifications(user));
  });
}

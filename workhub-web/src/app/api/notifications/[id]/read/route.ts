import { json, parseId, withAuth } from "@/modules/api/route-helpers";
import { readMobileNotification } from "@/modules/api/mobile-api-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(request, async ({ user }) => {
    const { id } = await params;

    return json(await readMobileNotification(user, parseId(id)));
  });
}

import { json, parseId, withAuth } from "@/modules/api/route-helpers";
import { getMobileTask } from "@/modules/api/mobile-api-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(request, async ({ user }) => {
    const { id } = await params;

    return json(await getMobileTask(user, parseId(id)));
  });
}

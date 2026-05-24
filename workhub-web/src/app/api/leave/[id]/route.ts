import { json, parseId, withAuth } from "@/modules/api/route-helpers";
import { getMobileLeave } from "@/modules/api/mobile-api-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(request, async ({ user }) => {
    const { id } = await params;

    return json(await getMobileLeave(user, parseId(id)));
  });
}

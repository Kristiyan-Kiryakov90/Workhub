import { json, parseId, withAuth } from "@/modules/api/route-helpers";
import { deleteMobileTaskChecklistItem } from "@/modules/api/mobile-api-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  return withAuth(request, async ({ user }) => {
    const { id, itemId } = await params;

    return json(
      await deleteMobileTaskChecklistItem(user, parseId(id), parseId(itemId)),
    );
  });
}

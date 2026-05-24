import { json, parseId, withAuth } from "@/modules/api/route-helpers";
import { toggleMobileTaskChecklistItem } from "@/modules/api/mobile-api-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  return withAuth(request, async ({ user }) => {
    const [{ id, itemId }, body] = await Promise.all([
      params,
      request.json().catch(() => null),
    ]);

    return json(
      await toggleMobileTaskChecklistItem(
        user,
        parseId(id),
        parseId(itemId),
        Boolean(body?.isCompleted),
      ),
    );
  });
}

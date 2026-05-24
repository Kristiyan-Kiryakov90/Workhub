import { json, parseId, withAuth } from "@/modules/api/route-helpers";
import { addMobileTaskChecklistItem } from "@/modules/api/mobile-api-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(request, async ({ user }) => {
    const [{ id }, body] = await Promise.all([
      params,
      request.json().catch(() => null),
    ]);

    return json(
      await addMobileTaskChecklistItem(
        user,
        parseId(id),
        typeof body?.title === "string" ? body.title : "",
      ),
      { status: 201 },
    );
  });
}

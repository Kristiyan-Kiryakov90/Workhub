import { json, parseId, withAuth } from "@/modules/api/route-helpers";
import { updateMobileTaskNotes } from "@/modules/api/mobile-api-service";

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
      await updateMobileTaskNotes(
        user,
        parseId(id),
        typeof body?.notes === "string" && body.notes.trim()
          ? body.notes.trim()
          : null,
      ),
    );
  });
}

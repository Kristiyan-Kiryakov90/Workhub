import { json, withAuth } from "@/modules/api/route-helpers";

export async function GET(request: Request) {
  return withAuth(
    request,
    async ({ user, roles }) => {
      return json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
        },
        organization: {
          id: user.organizationId,
          name: user.organizationName,
          slug: user.organizationSlug,
        },
        roles,
      });
    },
    { includeRoles: true },
  );
}

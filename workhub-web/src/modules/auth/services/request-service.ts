import { headers } from "next/headers";

export type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

export async function getRequestMetadata(): Promise<RequestMetadata> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const userAgent = headerStore.get("user-agent") ?? undefined;

  return {
    ipAddress: forwardedFor?.split(",")[0]?.trim() || realIp || undefined,
    userAgent,
  };
}

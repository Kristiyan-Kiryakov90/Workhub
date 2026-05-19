export type CurrentUser = {
  id: number;
  organizationId: number;
  email: string;
  name: string;
  organizationName: string;
  organizationSlug: string;
};

export type SessionPayload = {
  jti: string;
  sub: string;
  organizationId: number;
  email: string;
  exp: number;
};

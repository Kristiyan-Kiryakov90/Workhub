import { createCsrfToken } from "@/modules/auth/services/csrf-service";
import { RegisterOrganizationForm } from "./register-organization-form";

export const metadata = {
  title: "Register Organization | WorkHub",
};

export const dynamic = "force-dynamic";

export default async function RegisterOrganizationPage() {
  const csrfToken = await createCsrfToken("register-organization");

  return <RegisterOrganizationForm csrfToken={csrfToken} />;
}

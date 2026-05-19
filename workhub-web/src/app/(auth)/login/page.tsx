import { createCsrfToken } from "@/modules/auth/services/csrf-service";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Login | WorkHub",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const csrfToken = await createCsrfToken("login");

  return <LoginForm csrfToken={csrfToken} />;
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  if (cookies().get("superwave_token")?.value) {
    redirect("/chat");
  }

  return <LoginForm />;
}

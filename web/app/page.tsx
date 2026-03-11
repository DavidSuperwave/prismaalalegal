import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function Home() {
  const token = cookies().get("superwave_token")?.value;
  redirect(token ? "/chat" : "/login");
}

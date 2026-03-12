import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAuthCookieName, getConfiguredUser, signAuthToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const configuredUser = getConfiguredUser();

  if (email !== configuredUser.email || password !== configuredUser.password) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const user = {
    email: configuredUser.email,
    name: configuredUser.name,
  };
  const token = signAuthToken(user);

  cookies().set(getAuthCookieName(), token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ token, user });
}

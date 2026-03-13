import jwt from "jsonwebtoken";

const AUTH_COOKIE_NAME = "superwave_token";

export interface AuthUser {
  email: string;
  name: string;
}

export interface AuthTokenPayload extends AuthUser {
  sub: string;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error("FATAL: JWT_SECRET is not set");
  }
  if (secret === "development-secret-change-me") {
    throw new Error("FATAL: JWT_SECRET uses blocked default value");
  }
  return secret;
}

export function getAuthCookieName() {
  return AUTH_COOKIE_NAME;
}

export function getConfiguredUser() {
  const email = process.env.AUTH_EMAIL;
  const password = process.env.AUTH_PASSWORD;
  const name =
    process.env.AUTH_NAME ||
    process.env.NEXT_PUBLIC_CLIENT_NAME ||
    "PrismaProject Admin";

  if (!email || !email.trim()) {
    throw new Error("FATAL: AUTH_EMAIL is not set");
  }
  if (!password || !password.trim()) {
    throw new Error("FATAL: AUTH_PASSWORD is not set");
  }
  if (email === "admin@example.com") {
    throw new Error("FATAL: AUTH_EMAIL uses blocked default value");
  }
  if (password === "password") {
    throw new Error("FATAL: AUTH_PASSWORD uses blocked default value");
  }

  return { email, password, name };
}

export function signAuthToken(user: AuthUser) {
  return jwt.sign(
    {
      sub: user.email,
      email: user.email,
      name: user.name,
    },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
}

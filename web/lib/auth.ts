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
  return process.env.JWT_SECRET || "development-secret-change-me";
}

export function getAuthCookieName() {
  return AUTH_COOKIE_NAME;
}

export function getConfiguredUser() {
  const email = process.env.AUTH_EMAIL || process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.AUTH_PASSWORD || process.env.ADMIN_PASSWORD || "password";
  const name =
    process.env.AUTH_NAME ||
    process.env.NEXT_PUBLIC_CLIENT_NAME ||
    "ALA Legal Admin";

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

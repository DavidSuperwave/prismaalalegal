import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/chat", "/crm", "/inbox", "/dashboard"];
const AUTH_COOKIE_NAME = "superwave_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedPath = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*", "/crm/:path*", "/inbox/:path*", "/dashboard/:path*"],
};

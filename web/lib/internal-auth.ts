import { NextResponse } from "next/server";

/**
 * Verify internal service token for Docker-internal agent calls
 * Returns true if the request has a valid internal service token
 */
export function verifyInternalServiceToken(request: Request): boolean {
  const serviceToken = request.headers.get("x-service-token");
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;
  
  if (!expectedToken) {
    console.warn("[Auth] INTERNAL_SERVICE_TOKEN not set in environment");
    return false;
  }
  
  if (!serviceToken) {
    return false;
  }
  
  return serviceToken === expectedToken;
}

/**
 * Check if request is from internal service (agents) or has valid session
 * Combines internal token check with cookie-based auth
 */
export function isAuthorized(request: Request): boolean {
  // First check internal service token
  if (verifyInternalServiceToken(request)) {
    return true;
  }
  
  // Then check for session cookie
  const cookie = request.headers.get("cookie") || "";
  const hasSession = cookie.includes("prisma_session=") || cookie.includes("superwave_token=");
  
  return hasSession;
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTE = "/auth";
const SHARE_ROUTE = "/share";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSessionCookie = Boolean(request.cookies.get("connect.sid")?.value);
  const isAuthRoute =
    pathname === AUTH_ROUTE || pathname.startsWith(`${AUTH_ROUTE}/`);
  const isShareRoute =
    pathname === SHARE_ROUTE || pathname.startsWith(`${SHARE_ROUTE}/`);
  const canAccessWithoutSession = isAuthRoute || isShareRoute;

  if (!hasSessionCookie && !canAccessWithoutSession) {
    return NextResponse.redirect(new URL(AUTH_ROUTE, request.url));
  }

  return NextResponse.next();
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/auth", "/share"];

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSessionCookie = Boolean(request.cookies.get("connect.sid")?.value);
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  if (!hasSessionCookie && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (hasSessionCookie && pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

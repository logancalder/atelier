import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const configured = Boolean(process.env.FIREBASE_PROJECT_ID);
  if (!configured) return NextResponse.next();
  const hasSession = Boolean(request.cookies.get("atelier_session")?.value);
  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/coding/:path*", "/studio/:path*", "/students/:path*", "/sessions/:path*", "/money/:path*", "/profile/:path*", "/extension-connect/:path*"] };

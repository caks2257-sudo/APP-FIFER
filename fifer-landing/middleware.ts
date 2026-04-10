import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminLogin = pathname.startsWith("/admin/login");

  if (isAdminRoute) {
    const auth = req.cookies.get("fifer_auth")?.value;
    if (auth !== "1") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    const adminSecretConfigured = Boolean(
      process.env.FIFER_ADMIN_SECRET && process.env.FIFER_ADMIN_SECRET.trim()
    );

    /** Con `FIFER_ADMIN_SECRET`, exige cookie HttpOnly `fifer_admin` (vía `/admin/login`). */
    if (adminSecretConfigured && !isAdminLogin) {
      const admin = req.cookies.get("fifer_admin")?.value;
      if (admin !== "1") {
        const url = req.nextUrl.clone();
        url.pathname = "/admin/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/finanzas")) {
    const auth = req.cookies.get("fifer_auth")?.value;
    if (auth === "1") {
      return NextResponse.next();
    }

    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/finanzas/:path*", "/admin/:path*"],
};

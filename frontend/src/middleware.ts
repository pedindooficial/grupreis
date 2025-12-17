import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = ["/login", "/api/health", "/operations", "/api/operations", "/location-capture"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Libera assets e rotas públicas
  const isStaticAsset =
    pathname.match(/\.(png|jpe?g|gif|webp|ico|svg|txt|xml)$/i) !== null;

  // Verifica se é uma rota pública
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  if (
    isPublicPath ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico" ||
    isStaticAsset
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET
  });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next|static|favicon.ico).*)"]
};


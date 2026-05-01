import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const email = req.cookies.get("vr_email")?.value;
  const role = req.cookies.get("vr_role")?.value;
  if (req.nextUrl.pathname.startsWith('/founder') && (!email || role !== 'founder')) return NextResponse.redirect(new URL('/login', req.url));
  if (req.nextUrl.pathname.startsWith('/investor') && (!email || role !== 'investor')) return NextResponse.redirect(new URL('/login', req.url));
  if (req.nextUrl.pathname.startsWith('/deal-rooms') && !email) return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/founder/:path*", "/investor/:path*", "/deal-rooms/:path*"] };

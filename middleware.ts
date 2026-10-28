import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Izinkan /claim dan semua asset Next.js
  if (pathname.startsWith('/claim')) {
    return NextResponse.next()
  }

  // Redirect semua route lain ke /claim
  return NextResponse.redirect(new URL('/claim', request.url))
}

export const config = {
  matcher: [
    /*
     * Match semua path KECUALI:
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico
     * - file dengan ekstensi (png, jpg, svg, dll)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE_NAME = 'aakash_session'

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/desktop')) {
    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value
    if (!sessionToken) {
      const loginUrl = new URL('/login', req.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/desktop/:path*'],
}

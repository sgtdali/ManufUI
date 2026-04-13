import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  if (
    request.nextUrl.pathname === '/arıza' ||
    request.nextUrl.pathname === '/ar%C4%B1za'
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/ariza'

    const rewrite = NextResponse.rewrite(url)
    response.cookies.getAll().forEach((cookie) => {
      rewrite.cookies.set(cookie)
    })
    return rewrite
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

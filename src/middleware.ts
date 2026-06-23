import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  const { pathname } = request.nextUrl

  // Allow static files, api routes, and the login page
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname === '/login' ||
    /\.(?:svg|png|jpg|jpeg|gif|webp)$/.test(pathname)
  ) {
    return response
  }

  // Check password authentication
  const authCookie = request.cookies.get('password_auth')?.value
  const isAuthenticated = authCookie === 'rmk_hf901'

  // If not authenticated and not visiting dashboardy, redirect to login page
  if (!isAuthenticated && pathname !== '/dashboardy') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  if (
    pathname === '/arıza' ||
    pathname === '/ar%C4%B1za'
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

import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Fast local check: does a Supabase auth cookie exist?
  // This avoids the expensive getUser() API round-trip on every navigation.
  const hasAuthCookie = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-')
  );

  const protectedPaths = ['/dashboard', '/category', '/tracked', '/history', '/settings'];
  const isProtectedPath = protectedPaths.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );

  const authPaths = ['/login', '/signup', '/forgot-password'];
  const isAuthPath = authPaths.includes(path);

  // Redirect unauthenticated users away from protected pages
  if (isProtectedPath && !hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', path);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages (and root)
  if ((isAuthPath || path === '/') && hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

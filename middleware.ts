import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  detectLocaleFromHeaders,
  detectLocaleFromCookie,
  pathnameHasLocale,
} from './lib/i18n/detection';

export const LOCALE_COOKIE = 'NEXT_LOCALE';

// Define protected routes that require authentication
// Exclude sign-in and unauthorized page to prevent redirect loops
const isProtectedRoute = createRouteMatcher([
  '/dashboard((?!/sign-in|/unauthorized).*)',
]);

// Check if path is sign-up route (to redirect to sign-in)
const isSignUpRoute = (pathname: string) => {
  return pathname.startsWith('/dashboard/sign-up');
};

// Define public routes that don't need locale handling
const isPublicAsset = (pathname: string) => {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/dashboard')
  );
};

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Redirect sign-up to sign-in (self-registration disabled)
  if (isSignUpRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard/sign-in';
    return NextResponse.redirect(url);
  }

  // Protect admin routes - require authentication
  if (isProtectedRoute(request)) {
    await auth.protect();
    return NextResponse.next();
  }

  // Skip locale handling for static files, API routes, and admin routes
  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  // Check if pathname already has a locale
  if (pathnameHasLocale(pathname)) {
    return NextResponse.next();
  }

  // Determine locale: cookie > headers > default
  const cookieValue = request.cookies.get(LOCALE_COOKIE)?.value;
  const acceptLanguage = request.headers.get('accept-language');

  const cookieLocale = detectLocaleFromCookie(cookieValue);
  const locale = cookieLocale || detectLocaleFromHeaders(acceptLanguage);

  // Redirect to locale-prefixed URL
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;

  return NextResponse.redirect(url);
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const url = request.nextUrl.clone();

  // Αν ΔΕΝ είναι συνδεδεμένος και πάει σε Admin ή Kitchen -> τον στέλνουμε στο /login
  if (!session && (url.pathname.startsWith('/admin') || url.pathname.startsWith('/kitchen'))) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Αν ΕΙΝΑΙ ήδη συνδεδεμένος και πάει στο /login -> τον στέλνουμε κατευθείαν στο /admin
  if (session && url.pathname.startsWith('/login')) {
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/kitchen/:path*', '/login'],
};
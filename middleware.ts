import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  const isProtected = pathname.includes('/admin') || pathname.includes('/kitchen');

  // 1. ΑΝ πάει να μπει σε Admin/Kitchen ΚΑΙ δεν είναι συνδεδεμένος -> Τον πετάμε στο Login
    if (!session && isProtected) {
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
    }

    // 2. ΑΝ είναι ήδη συνδεδεμένος και πάει να μπει στο /login -> Τον στέλνουμε στο Admin
    if (session && pathname === '/login') {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/';
    url.pathname = redirectTo;
    return NextResponse.redirect(url);
    }

    // 3. Για οποιαδήποτε άλλη σελίδα (π.χ. /menu, /checkout), τον αφήνουμε να περάσει ελεύθερα!
    return response;
    }

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
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

  // Ελέγχουμε αν το URL περιέχει μέσα το /admin ή το /kitchen
  const isProtected = pathname.includes('/admin') || pathname.includes('/kitchen');

  // Αν πάει σε Admin/Kitchen ΚΑΙ δεν είναι συνδεδεμένος -> Πάει Login
  if (!session && isProtected) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}

// Ο φρουρός πλέον σκανάρει όλο το site εκτός από τις εικόνες και τα εσωτερικά αρχεία
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
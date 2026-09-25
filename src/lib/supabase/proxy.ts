import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

export async function updateSession(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  let pendingCookies: { name: string; value: string; options: CookieOptions }[] = [];
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies = cookiesToSet;
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const path = request.nextUrl.pathname;
  const isApi = path.startsWith("/api/");
  const isPublic = path.startsWith("/auth") || path === "/offline.html" || path.startsWith("/icons/");

  function redirectWithSession(url: URL) {
    const redirect = NextResponse.redirect(url);
    pendingCookies.forEach(({ name, value, options }) => redirect.cookies.set(name, value, options));
    return redirect;
  }

  if (!user && !isPublic && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", path);
    return redirectWithSession(url);
  }
  if (user && path === "/auth/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    url.search = "";
    return redirectWithSession(url);
  }
  return response;
}

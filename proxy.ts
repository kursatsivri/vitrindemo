import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Oturum çerezlerini yeniler. Asıl yetki kontrolü sayfalarda/server action'larda.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();

  // Girişsiz ziyaretçi: "/" adresinde tanıtım sayfasını görür, açık olmayan her sayfa tanıtıma döner.
  const { pathname } = request.nextUrl;
  if (!data?.claims && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/hosgeldin";
    url.search = "";
    const res = pathname === "/" ? NextResponse.rewrite(url) : NextResponse.redirect(new URL("/", request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  }

  return response;
}

// Girişsiz açık: tanıtım, giriş/kayıt akışı, yasal metinler ve paylaşılan parça linkleri (Instagram, önizleme kartları).
const PUBLIC = ["/hosgeldin", "/giris", "/kayit", "/sifremi-unuttum", "/sifre-yenile", "/auth/", "/yasal/", "/p/", "/siralama/hikaye", "/manifest.webmanifest", "/icon", "/apple-icon", "/_next/"];
const isPublic = (path: string) => PUBLIC.some((p) => path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`));

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

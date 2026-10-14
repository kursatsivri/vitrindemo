import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { cookies } from "next/headers";
import { connection } from "next/server";

// Her istek için yeni istemci oluştur; istekler arasında paylaşma.
export async function createClient() {
  // Supabase oturum kontrolünde Date.now() kullanıyor; Cache Components ön render'da
  // buna izin vermiyor. Supabase çağrıları her zaman istek anında çalışsın.
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component'ten çağrıldıysa yazılamaz; oturumu proxy.ts yeniler.
          }
        },
      },
    },
  );
}

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// KVKK: kullanıcının tüm verisi tek JSON dosyası olarak iner (export_my_data sadece kendi verisini döndürür).
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/giris", request.url));

  const { data, error } = await supabase.rpc("export_my_data");
  if (error) return new NextResponse("Veriler hazırlanamadı. Lütfen tekrar dene.", { status: 500 });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="vitrin-verilerim.json"',
      "Cache-Control": "no-store",
    },
  });
}

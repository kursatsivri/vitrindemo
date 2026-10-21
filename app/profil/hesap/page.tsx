import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { Suspense } from "react";
import { ActionForm } from "@/app/components/action-form";
import { sectionTitle } from "@/app/components/artist-line";
import { Field, FormSkeleton } from "@/app/components/field";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount } from "./actions";

export const metadata: Metadata = { title: "Hesap ayarları | Vitrin" };

async function Account() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");
  const { data: me } = await supabase.from("profiles").select("username").eq("id", user.id).single();

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>Verilerimi indir</h2>
        <p className="text-sm leading-relaxed text-text-muted">
          Profilin, parçaların, beğeni, kaydetme, yorum, oy, dinleme ve bildirimlerin dahil hesabına ait tüm kayıtlar tek bir JSON dosyası
          olarak iner (KVKK m.11). Ses ve görsel dosyaların zaten profilinde ve parça sayfalarında.
        </p>
        {/* Route handler dosyayı ek olarak döndürür; tam sayfa isteği olmalı */}
        <a href="/profil/hesap/veri" download className="btn-secondary w-fit">
          <Download aria-hidden className="size-4" strokeWidth={1.75} />
          Verilerimi indir
        </a>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>Hesabımı sil</h2>
        <p className="text-sm leading-relaxed text-text-muted">
          Hesabın, parçaların ve dosyaların, beğeni, yorum, oy ve tüm diğer kayıtların <strong className="text-text">kalıcı olarak</strong> silinir.
          Bu işlem geri alınamaz. Önce verilerini indirmek isteyebilirsin.
        </p>
        <ActionForm action={deleteAccount} submitLabel="Hesabımı kalıcı olarak sil">
          <Field
            label={`Onaylamak için kullanıcı adını yaz (@${me?.username ?? ""})`}
            name="confirm"
            required
            autoComplete="off"
          />
        </ActionForm>
      </section>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-7 md:py-14">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em]">Hesap ayarları</h1>
        <p className="text-sm text-text-muted">
          Profil bilgilerini <Link href="/profil/duzenle" className="link">profili düzenle</Link> sayfasından değiştirebilirsin.
        </p>
      </div>
      <Suspense fallback={<FormSkeleton fields={2} />}>
        <Account />
      </Suspense>
    </main>
  );
}

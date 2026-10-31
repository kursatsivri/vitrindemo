import Link from "next/link";
import { Briefcase, Compass, MapPin, Swords, Trophy, Upload } from "lucide-react";
import { Suspense } from "react";
import { Avatar } from "@/app/components/avatar";
import { Cover } from "@/app/components/cover";
import { genreLabel } from "@/app/components/track-row";
import { createClient } from "@/lib/supabase/server";

// Girişsiz ziyaretçinin ana sayfası (proxy "/" isteğini buraya yönlendirir): site ne, kimler var, nasıl üye olunur.
export const metadata = { title: "Vitrin — yeni seslerin vitrini" };

const STEPS = [
  { title: "Yükle", text: "Parçanı, kapağını ve en iyi anını ekle. Dakikalar içinde vitrindesin." },
  { title: "Dinlensin", text: "Dinleyiciler keşfet modunda kaydırarak seni bulur, beğenir, oy verir." },
  { title: "Keşfedil", text: "Yapımcılar, plak şirketleri ve menajerler sıralamadan seni görür, ilgi gönderir." },
];

const FEATURES = [
  { icon: Compass, title: "Keşfet modu", text: "Kaydır, dinle, beğen. Zevkine göre öğrenen bir akış." },
  { icon: Trophy, title: "Haftalık sıralama", text: "Sırayı sadece dinleyici oyları belirler. Parayla yükselmek yok." },
  { icon: Swords, title: "Challenge", text: "Her hafta bir beat, herkes kendi versiyonunu yapar, kazanan vitrine çıkar." },
  { icon: Briefcase, title: "Fırsatlar", text: "Onaylı keşifçilerin açtığı ilanlara başvur, eşleş, iletişime geç." },
  { icon: MapPin, title: "Şehrindeki yetenekler", text: "Türkiye haritasında yanı başındaki sanatçıları bul." },
  { icon: Upload, title: "Sanatçı paneli", text: "Dinlenme, oy, takipçi ve seni kaç keşifçinin gördüğü tek ekranda." },
];

const PLANS = [
  { name: "Dinleyici", price: "Ücretsiz", items: ["Sınırsız dinle ve keşfet", "Oy ver, yorum yap, takip et", "Erken keşifçi rozetleri topla"] },
  { name: "Sanatçı", price: "Ücretsiz", items: ["Parça yükle, profilini vitrine çevir", "Sıralamaya ve challenge’a gir", "Keşifçilerden ilgi al"], highlight: true },
  { name: "Keşifçi", price: "Başvuru ile", items: ["Yapımcı, plak şirketi, menajer", "Favori ve özel not tut", "İlan aç, sanatçıyla eşleş"] },
  { name: "Premium", price: "Yakında", items: ["Mesajlaşma", "Profilini hangi keşifçinin gördüğü", "Detaylı istatistik grafikleri"] },
];

// Sabit ama düzensiz görünen yükseklik/gecikme (Math.random sunucu-istemci uyuşmazlığı yapar)
const EQ_BARS = Array.from({ length: 48 }, (_, i) => ({ delay: `${-((i * 137) % 1100)}ms`, height: `${30 + ((i * 53) % 70)}%` }));

const eyebrow = "text-xs font-medium tracking-[0.1em] text-accent uppercase";
const heading = "font-display text-3xl font-extrabold tracking-[-0.035em] md:text-5xl";

// Yeni parçaların kapakları sonsuz kayan bant halinde + bu parçaların sanatçıları.
async function Showcase() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tracks")
    .select("id, title, genre, cover_path, profiles!artist_id(username, display_name, avatar_path, city)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(24);
  const tracks = data ?? [];
  if (tracks.length === 0) return null;

  const artists = [...new Map(tracks.flatMap((t) => (t.profiles ? [[t.profiles.username, t.profiles] as const] : []))).values()].slice(0, 8);
  // Bant ekranı doldursun diye kısa liste çoğaltılır; ikinci kopya -50% kaydırmada dikişi gizler.
  const band = Array.from({ length: Math.ceil(12 / tracks.length) }, () => tracks).flat();

  return (
    <>
      <section aria-labelledby="isler" className="flex flex-col gap-8">
        <div className="reveal mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-4 md:px-10">
          <p className={eyebrow}>İşlerimiz</p>
          <h2 id="isler" className={heading}>Vitrinde şimdi çalanlar</h2>
        </div>
        <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
          <ul className="animate-marquee flex w-max gap-4 hover:[animation-play-state:paused] md:gap-6">
            {[...band, ...band].map((t, i) => (
              <li key={i} aria-hidden={i >= band.length || undefined} className="w-40 shrink-0 md:w-56">
                <Cover path={t.cover_path} title={t.title} className="w-full transition duration-300 hover:scale-[1.03]" />
                <p className="mt-2 truncate text-sm font-medium">{t.title}</p>
                <p className="truncate text-xs text-text-muted">
                  {t.profiles?.display_name || t.profiles?.username} · {genreLabel(t.genre)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {artists.length > 0 && (
        <section aria-labelledby="sanatcilar" className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 md:px-10">
          <div className="reveal flex flex-col gap-2">
            <p className={eyebrow}>Sanatçılarımız</p>
            <h2 id="sanatcilar" className={heading}>Yeni yüzler, yeni sesler</h2>
          </div>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {artists.map((a) => (
              <li key={a.username} className="reveal card flex flex-col items-center gap-3 px-4 py-6 text-center">
                <Avatar path={a.avatar_path} name={a.display_name || a.username} size={88} />
                <div className="w-full min-w-0">
                  <p className="truncate font-medium">{a.display_name || a.username}</p>
                  <p className="truncate text-xs text-text-muted">{a.city || `@${a.username}`}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function Page() {
  return (
    <main className="flex flex-1 flex-col gap-24 overflow-x-clip pb-24 md:gap-36 md:pb-36">
      {/* Hero: ekolayzır çubukları + nefes alan turuncu ışık; başlık sırayla belirir */}
      <section className="relative isolate flex min-h-[calc(100svh-56px)] items-center md:min-h-[calc(100svh-72px)]">
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <div className="animate-glow absolute top-1/2 left-1/2 size-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-[120px]" />
          <div className="absolute inset-x-0 bottom-0 flex h-[45%] items-end gap-[3px] px-2 opacity-25 [mask-image:linear-gradient(to_top,black,transparent)] md:gap-1.5">
            {EQ_BARS.map((b, i) => (
              <span key={i} className="animate-eq flex-1 rounded-t-full bg-accent" style={{ height: b.height, animationDelay: b.delay }} />
            ))}
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-7 px-4 md:px-10">
          <p className="animate-rise rounded-full border border-border bg-surface/70 px-4 py-1.5 text-xs font-medium text-text-muted backdrop-blur">
            Bağımsız rap ve beat keşif platformu
          </p>
          <h1 className="animate-rise font-display text-[clamp(52px,11vw,148px)] leading-[0.88] font-extrabold tracking-[-0.055em] [animation-delay:120ms]">
            Yeni seslerin
            <br />
            <span className="text-accent">vitrini.</span>
          </h1>
          <p className="animate-rise max-w-xl text-lg text-text-muted [animation-delay:240ms] md:text-xl">
            Parçanı yükle, dinleyiciler oylasın, yapımcılar ve plak şirketleri seni bulsun. Takipçi sayısı değil, ses konuşur.
          </p>
          <div className="animate-rise flex flex-wrap gap-3 [animation-delay:360ms]">
            <Link href="/kayit" className="btn-primary h-14 px-8 text-base">
              Hemen katıl
            </Link>
            <Link href="/giris" className="btn-secondary h-14 px-8 text-base">
              Giriş yap
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="nasil" className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 md:px-10">
        <div className="reveal flex flex-col gap-2">
          <p className={eyebrow}>Nasıl çalışır</p>
          <h2 id="nasil" className={heading}>Üç adımda keşfedil</h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-3 md:gap-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="reveal card flex flex-col gap-3 p-6 md:p-8">
              <span className="font-display text-6xl font-extrabold tracking-[-0.05em] text-accent/80">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="font-display text-2xl font-bold tracking-[-0.03em]">{s.title}</h3>
              <p className="text-text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <Suspense>
        <Showcase />
      </Suspense>

      <section aria-labelledby="ozellikler" className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 md:px-10">
        <div className="reveal flex flex-col gap-2">
          <p className={eyebrow}>İçeride seni neler bekliyor</p>
          <h2 id="ozellikler" className={heading}>Dinle, oyla, keşfet</h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="reveal card group flex flex-col gap-3 p-6 transition duration-300 hover:-translate-y-1 hover:border-accent/45">
              <span className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent transition duration-300 group-hover:scale-110">
                <f.icon aria-hidden className="size-5" strokeWidth={1.75} />
              </span>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="hikaye" className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 md:grid-cols-[1fr_1.2fr] md:gap-16 md:px-10">
        <div className="reveal flex flex-col gap-2">
          <p className={eyebrow}>Hikâyemiz</p>
          <h2 id="hikaye" className={heading}>Yetenek, takipçi sayısından önce gelir</h2>
        </div>
        <div className="reveal flex flex-col gap-5 text-lg text-text-muted">
          <p>Türkiye’de her gün yüzlerce rapçi ve beatmaker yeni bir parça çıkarıyor. Çoğu, algoritmaların ve reklam bütçelerinin arasında kayboluyor.</p>
          <p>Vitrin’i bunun için kurduk: bağımsız sanatçının tek ihtiyacı iyi bir parça olsun. Sırayı dinleyiciler belirler, keşifçiler oradan bakar.</p>
          <p className="text-text">
            İlkemiz değişmez: <strong className="text-accent">parayla sıralamada yükselmek yok.</strong> Ücretli hesapların oyu daha değerli sayılmaz.
          </p>
        </div>
      </section>

      <section aria-labelledby="uyelik" className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 md:px-10">
        <div className="reveal flex flex-col gap-2">
          <p className={eyebrow}>Üyelik</p>
          <h2 id="uyelik" className={heading}>Herkes ücretsiz başlar</h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <li key={p.name} className={`reveal card flex flex-col gap-5 p-6 ${p.highlight ? "border-accent/45 shadow-[0_30px_80px_-40px] shadow-accent/50" : ""}`}>
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-2xl font-bold tracking-[-0.03em]">{p.name}</h3>
                <p className={p.highlight ? "text-sm font-medium text-accent" : "text-sm text-text-muted"}>{p.price}</p>
              </div>
              <ul className="flex flex-col gap-2 text-sm text-text-muted">
                {p.items.map((it) => (
                  <li key={it} className="flex gap-2">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                    {it}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="reveal mx-auto flex w-full max-w-[1200px] flex-col items-center gap-6 px-4 text-center md:px-10">
        <h2 className="font-display text-4xl font-extrabold tracking-[-0.045em] md:text-7xl">Sıradaki ses senin olabilir.</h2>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/kayit" className="btn-primary h-14 px-8 text-base">
            Ücretsiz kayıt ol
          </Link>
          <Link href="/giris" className="btn-secondary h-14 px-8 text-base">
            Giriş yap
          </Link>
        </div>
      </section>
    </main>
  );
}

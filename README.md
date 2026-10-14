# Vitrin

Bağımsız rap ve beat keşif platformu. Ürün tanımı ve fazlar: [SPEC.md](SPEC.md).

Next.js (App Router) · Tailwind · Supabase (Postgres, Auth, Storage) · Vercel

## Ortamlar

| | Geliştirme (`vitrin-dev`) | Canlı (`vitrin`) |
|---|---|---|
| Kullanan | localhost + Vercel önizlemeleri | vitrindemo-three.vercel.app |
| Anahtarlar | `.env.local` | sadece Vercel (Production) |

`.env.local` git'e girmez; gerekli değişken adları `.env.example`'da. Canlı anahtarlar hiçbir dosyada tutulmaz.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | localhost:3000 (geliştirme DB'si) |
| `npm run check` | lint + tip kontrolü + build — her commit'ten önce |
| `npm run test:db` | Güvenlik testini bağlı (link'li) Supabase projesinde çalıştırır; iz bırakmaz |
| `npx supabase db push --linked` | Yeni migration'ları bağlı projeye uygular |
| `npx supabase gen types typescript --linked --schema public > lib/database.types.ts` | DB tiplerini günceller |

## İş akışı

1. Her iş ayrı dalda: `git switch -c faz-2`.
2. Veritabanı değişikliği `supabase/migrations/` altında yeni bir dosya olarak yazılır, **önce geliştirme DB'sine** uygulanır (`npx supabase db push --linked`), `npm run test:db` ile denenir. Migration'lar geriye uyumlu yazılır (eski kod yeni şemayla çalışabilmeli).
3. `git push -u origin <dal>` → GitHub'da PR aç. CI (`app` + `db` işleri) ve Vercel önizlemesi otomatik çalışır.
4. Önizlemede dene. CI yeşilse, **birleştirmeden hemen önce** migration'ları canlıya uygula:
   ```
   npx supabase link --project-ref smhmlndvjguxgapductd   # canlı
   npx supabase db push --linked
   npx supabase link --project-ref <dev-ref>              # geri geliştirmeye
   ```
5. PR'ı **Merge** et → Vercel canlıya yayınlar. `main`'e doğrudan push kapalı.

## CI (`.github/workflows/ci.yml`)

- **app:** lint, tip kontrolü, build, `npm audit --omit=dev` (siteye giden bağımlılıklar).
- **db:** GitHub sunucusunda boş bir Supabase açıp tüm migration'ları sıfırdan uygular, `supabase/tests/` altındaki güvenlik testini çalıştırır.

`npm audit` (dev dahil) ESLint'in alt bağımlılığı `braces` için uyarı verir: sadece geliştirmede çalışır, siteye gitmez. `npm audit fix --force` eslint-config-next'i eski sürüme düşürüp kurulumu bozar; yapma.

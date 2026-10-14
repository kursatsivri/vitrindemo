# Vitrin

Bağımsız rap ve beat keşif platformu. Ürün tanımı ve fazlar: [SPEC.md](SPEC.md).

Next.js (App Router) · Tailwind · Supabase (Postgres, Auth, Storage) · Vercel

## Ortam

Bu repo ve Supabase projesi (`vitrin`, ref `smhmlndvjguxgapductd`) **demo/geliştirme** ortamıdır: localhost, Vercel önizlemeleri ve vitrindemo-three.vercel.app aynı veritabanını kullanır, içindeki hesaplar test amaçlıdır.

Gerçek kullanıcıya açılırken (SPEC Faz 5) **boş, yeni bir canlı Supabase projesi** açılır ve `supabase/migrations/` oraya sıfırdan uygulanır — CI'daki `db` işi bunun her zaman çalıştığını kanıtlar. Demo verisi canlıya taşınmaz.

Anahtarlar `.env.local`'de (git'e girmez; değişken adları `.env.example`'da) ve Vercel'de.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | localhost:3000 |
| `npm run check` | lint + tip kontrolü + build — her commit'ten önce |
| `npm run test:db` | Güvenlik testini bağlı (link'li) Supabase projesinde çalıştırır; iz bırakmaz |
| `npx supabase db push --linked` | Yeni migration'ları bağlı projeye uygular |
| `npx supabase gen types typescript --linked --schema public > lib/database.types.ts` | DB tiplerini günceller |

## İş akışı

1. Her iş ayrı dalda: `git switch -c faz-2`.
2. Veritabanı değişikliği `supabase/migrations/` altında yeni bir dosya olarak yazılır; önce CI'da (boş DB) ve `npm run test:db` ile denenir, sonra `npx supabase db push --linked` ile uygulanır. Migration'lar geriye uyumlu yazılır (eski kod yeni şemayla çalışabilmeli).
3. `git push -u origin <dal>` → GitHub'da PR aç. CI (`app` + `db` işleri) ve Vercel önizlemesi otomatik çalışır.
4. Önizlemede dene; CI yeşilse PR'ı **Merge** et → Vercel vitrindemo-three.vercel.app'e yayınlar. `main`'e doğrudan push kapalı.

## CI (`.github/workflows/ci.yml`)

- **app:** lint, tip kontrolü, build, `npm audit --omit=dev` (siteye giden bağımlılıklar).
- **db:** GitHub sunucusunda boş bir Supabase açıp tüm migration'ları sıfırdan uygular, `supabase/tests/` altındaki güvenlik testini çalıştırır.

`npm audit` (dev dahil) ESLint'in alt bağımlılığı `braces` için uyarı verir: sadece geliştirmede çalışır, siteye gitmez. `npm audit fix --force` eslint-config-next'i eski sürüme düşürüp kurulumu bozar; yapma.

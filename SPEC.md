# SPEC — Bağımsız Müzisyen Keşif Platformu (çalışma adı: Vitrin)

> Bu dosya projenin tek doğruluk kaynağıdır. Claude Code: her fazı ayrı ayrı `/plan` ile planla, onay almadan bir sonraki faza geçme. Bu dosyada olmayan bir özelliği kendiliğinden ekleme; gerekli görürsen planında "öneri" olarak belirt.

## 1. Ürün özeti
- **Problem:** Bağımsız rapçilerin ve beat maker'ların keşfedilmesi zor.
- **Çözüm:** Sanatçılar parça yükler; sanatçılar ve dinleyiciler parçalara oy verir; haftalık ve aylık sıralama oluşur. Onaylı plak şirketi hesapları bu sıralamadan yetenek keşfeder.
- **Kapsam (v1):** Sadece iki tür: **Rap** ve **Beat**. Arayüz dili sadece **Türkçe** (kod, değişken ve tablo adları İngilizce).
- **Platform:** Web, mobil uyumlu (önce mobil tasarım).
- **Hedef:** Demo değil, gerçek kullanıcıyla çalışacak ürün. Sahte/demo veri canlı ortamda olmayacak.

## 2. Kullanıcı rolleri
| Rol | Ne yapar |
|---|---|
| **Dinleyici** | Kayıt olur, parça dinler, oy verir |
| **Sanatçı** | Dinleyicinin her şeyi + profil oluşturur, parça yükler |
| **Plak şirketi** | Başvuru yapar, **admin onayından sonra** aktif olur; sıralamayı ve parçaları izler, sanatçıları favoriye ekler, sanatçının profilindeki iletişim bilgisini görür |
| **Admin** | Plak şirketi başvurularını onaylar/reddeder, şikayetleri inceler, parça/hesap kaldırır |

Kayıtta kullanıcı Dinleyici veya Sanatçı seçer. Plak şirketi ayrı bir başvuru akışıyla gelir.

## 3. Özellikler (v1)

### 3.1 Hesap ve profil
- E-posta + şifre ile kayıt/giriş (e-posta doğrulaması zorunlu). Şifre sıfırlama.
- Sanatçı profili: kullanıcı adı (benzersiz), görünen ad, profil fotoğrafı, kısa biyografi, tür (Rap / Beat / ikisi), sosyal medya linkleri (Instagram, YouTube, Spotify, SoundCloud), iletişim e-postası (opsiyonel, sadece onaylı plak şirketlerine görünür).
- Herkese açık profil sayfası: `/[kullaniciadi]` — sanatçının parçaları, toplam oy, sıralama geçmişi.

### 3.2 Parça yükleme
- Sadece sanatçılar yükler. Alanlar: başlık, tür (Rap/Beat), ses dosyası, kapak görseli (opsiyonel; yoksa varsayılan kapak), açıklama (opsiyonel).
- Ses: MP3, en fazla 15 MB. Kapak: JPG/PNG/WebP, en fazla 3 MB, kare kırpılır.
- Yüklemeden önce zorunlu onay kutusu: "Bu parçanın tüm haklarına sahibim / izinsiz sample veya başkasının beat'ini içermiyor."
- Sanatçı kendi parçasını düzenleyebilir ve silebilir.
- Spam önlemi: bir sanatçı haftada en fazla 3 parça yükleyebilir.

### 3.3 Dinleme
- Ana sayfa: "Bu haftanın zirvesi" (ilk 10) + "Yeni yüklenenler" akışı, Rap/Beat filtresi.
- Site genelinde sayfa değişince durmayan alt oynatıcı (oynat/duraklat, ilerleme çubuğu, ses).
- Dinleme kaydı: kullanıcı bir parçayı **en az 30 saniye** dinlediğinde sunucuya dinleme kaydı gönderilir.

### 3.4 Oylama kuralları (en kritik kısım)
- Sadece **beğeni (yukarı oy)** var; eksi oy yok (rakibi sabote etmeyi engeller).
- Giriş yapmış Dinleyici ve Sanatçılar oy verebilir. Plak şirketi ve admin oy veremez.
- Kendi parçana oy veremezsin.
- Aynı hesap, aynı parçaya **haftada en fazla 1 oy** verir (veritabanında benzersizlik kısıtı ile garanti edilir, sadece arayüzde değil).
- Oy verebilmek için o parçayı en az 30 saniye dinlemiş olmak gerekir (dinleme kaydı sunucuda kontrol edilir).
- **Yeni hesap kuralı:** hesap 7 günden yeniyse oyu kaydedilir ama sıralamada sayılmaz (ağırlık 0). 7 gün dolunca o tarihten sonraki oylar sayılır.
- Tüm kurallar sunucu tarafında (veritabanı kısıtları / RLS / server action) uygulanmalı; istemci tarafı kontroller sadece kullanıcı deneyimi içindir.

### 3.5 Sıralama
- **Haftalık:** Pazartesi 00:00 – Pazar 23:59 (Europe/Istanbul). **Aylık:** takvim ayı.
- Her biri **Rap** ve **Beat** için ayrı listelenir.
- Skor = o dönemde parçaya verilen geçerli oy sayısı. Eşitlikte önce oyu daha erken toplayan parça üstte.
- Dönem bitince liste dondurulur ve arşivlenir ("Geçmiş haftalar" sayfası). Sanatçı profilinde "En iyi derece: Rap #3, 2. hafta Kasım" gibi rozet bilgisi gösterilir.
- Canlı (devam eden) dönem sıralaması anlık değil, en geç 15 dakikada bir güncellenmesi yeterli.

### 3.6 Plak şirketi
- Başvuru formu: şirket adı, web sitesi/Instagram, yetkili kişi, iletişim e-postası, kısa açıklama.
- Admin onaylayana kadar hesap "beklemede"; plak şirketi özelliklerine erişemez.
- Onaylı şirket: profilde "Onaylı Plak Şirketi" rozeti; sanatçıları favoriye ekleyebilir (favori listesi sadece kendine görünür); sanatçının iletişim e-postasını görebilir.
- v1'de uygulama içi mesajlaşma YOK.

### 3.7 Şikayet ve moderasyon
- Her parçada ve profilde "Şikayet et" butonu: sebep (telif ihlali, uygunsuz içerik, sahte hesap, diğer) + açıklama.
- Admin paneli (`/admin`, sadece admin rolü): bekleyen plak şirketi başvuruları, şikayetler, parça/hesap gizleme-kaldırma.

### 3.8 Yasal sayfalar
- Kullanım şartları, KVKK aydınlatma metni, çerez bilgilendirmesi, telif ihlali bildirimi (kaldırma talebi) sayfası. Metinler taslak olarak hazırlanır, yayından önce gözden geçirilecek.

## 4. Teknoloji (öneri — planda gerekçeyle onaylanacak)
- **Frontend + backend:** Next.js (App Router, TypeScript), Tailwind CSS.
- **Veritabanı + giriş:** Supabase (Postgres, Auth, Row Level Security).
- **Dosya depolama:** Supabase Storage (ses + kapak). Alternatif: Cloudinary — planda karşılaştır.
- **Yayın:** Vercel. Kod: GitHub (kullanıcının kendi hesabındaki repo).
- **Zamanlanmış işler:** dönem sonu sıralama arşivleme için Supabase cron (pg_cron) veya Vercel Cron.

## 5. Veri modeli (taslak)
- `profiles` — id (auth.users), role (listener | artist | label | admin), username, display_name, avatar_url, bio, genres, socials (jsonb), contact_email, label_status (pending | approved | rejected | null), created_at
- `label_applications` — id, user_id, company_name, website, contact_person, contact_email, description, status, reviewed_by, reviewed_at
- `tracks` — id, artist_id, title, genre (rap | beat), audio_path, cover_path, description, duration_sec, status (active | hidden | removed), created_at
- `plays` — id, track_id, user_id (nullable), listened_sec, created_at
- `votes` — id, voter_id, track_id, week_start (date), counts (bool, 7 gün kuralı), created_at — **UNIQUE(voter_id, track_id, week_start)**
- `ranking_snapshots` — id, period_type (week | month), period_start, genre, track_id, rank, score
- `label_favorites` — label_id, artist_id, created_at
- `reports` — id, reporter_id, target_type (track | profile), target_id, reason, details, status, created_at

## 6. Tasarım
- Koyu tema varsayılan, modern ve sade; müzik kapakları ön planda.
- Önce mobil. Alt oynatıcı her ekranda erişilebilir.
- Sıralama sayfası sitenin "vitrini": büyük, okunaklı, paylaşılabilir (ileride Instagram'a ekran görüntüsü alınacak).

## 7. v1'de OLMAYACAKLAR (bilerek ertelendi)
- Ödeme / ücretli üyelik (sanatçı ve plak şirketi paketleri — Faz 6)
- Uygulama içi mesajlaşma, yorumlar
- Detaylı istatistik paneli
- Mobil uygulama (iOS/Android)
- Rap ve Beat dışındaki türler, İngilizce arayüz
- **Parayla sıralamada yükselme — hiçbir fazda olmayacak.**

## 8. Fazlar
Her faz bitince: çalıştır, test et, GitHub'a commit at, Vercel önizlemesinde kontrol et.

| Faz | İçerik | Bitti sayılır, eğer… |
|---|---|---|
| 0 | Proje kurulumu: Next.js, Tailwind, Supabase bağlantısı, Vercel, ortam değişkenleri | Boş site Vercel'de açılıyor |
| 1 | Kayıt/giriş, rol seçimi, profil düzenleme, herkese açık profil sayfası | Sanatçı ve dinleyici hesabı açılıp profil görüntülenebiliyor |
| 2 | Parça yükleme, ana sayfa akışı, alt oynatıcı, dinleme kaydı | Yüklenen parça akışta görünüyor ve çalınıyor |
| 3 | Oylama kuralları + haftalık/aylık sıralama + arşiv | Bölüm 3.4'teki tüm kurallar sunucu tarafında test edildi |
| 4 | Plak şirketi başvurusu, admin onay paneli, favoriler | Onaylanmamış şirket özelliklere erişemiyor |
| 5 | Şikayet sistemi, moderasyon, yasal sayfalar, son düzenlemeler, canlıya çıkış | Gerçek kullanıcıya açılabilir |
| 6 (sonra) | Ödeme ve üyelik paketleri | Şirket/vergi kaydı ve ödeme altyapısı kararı verildikten sonra |

## 9. Açık konular
- Sitenin kesin adı ve alan adı (çalışma adı: Vitrin).
- Ücretli paketlerin içeriği (sanatçı ve plak şirketi için) — Faz 6'dan önce belirlenecek.
- Ödeme altyapısı (Türkiye için iyzico / PayTR vb.) — şirket/vergi kaydı gerektirir.

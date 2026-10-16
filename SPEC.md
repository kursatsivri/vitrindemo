# SPEC — Yetenek Keşif Platformu (çalışma adı: Vitrin)

> Bu dosya projenin tek doğruluk kaynağıdır. Claude Code: her fazı ayrı ayrı planla, onay almadan bir sonraki faza geçme. Bu dosyada olmayan bir özelliği kendiliğinden ekleme; gerekli görürsen planında "öneri" olarak belirt.
>
> **Sürüm 2 — 16 Ekim 2026.** Ürün "müzik dinleme sitesi"nden **iki taraflı keşfedilme platformuna** çevrildi. Güncel durum ve faz listesi: [FAZLAR.md](FAZLAR.md).

## 1. Ürün özeti
- **Problem:** Bağımsız müzisyenlerin keşfedilmesi zor; yetenek arayan yapımcı ve şirketlerin de onları bulması zor.
- **Çözüm:** Spotify gibi bir dinleme sitesi değil, **Tinder mantığında bir keşfedilme platformu**. İki taraf var:
  - **Yetenekler** (rapçi, şarkıcı, beatmaker…) parça yükler, görünür olur, oy ve takipçi toplar, sıralamalarda yükselir.
  - **Keşifçiler** (yapımcı, plak şirketi, menajer) yeni yetenekleri keşfet modunda ve sıralamalarda bulur, ilgi gönderir, eşleşir.
  - **Dinleyiciler** keşfeder, beğenir, oy verir, yorum yapar, takip eder; sıralamayı onların oyları belirler.
- **Dil:** Arayüz sadece **Türkçe** (kod, değişken ve tablo adları İngilizce).
- **Platform:** Web, mobil uyumlu (önce mobil tasarım); telefona uygulama gibi eklenebilir (PWA).
- **Hedef:** Demo değil, gerçek kullanıcıyla çalışacak ürün. Sahte/demo veri canlı ortamda olmayacak.
- **Değişmez ilke:** **Parayla sıralamada yükselme hiçbir fazda olmayacak.** Ücretli hesapların oyu daha değerli sayılmaz, ücretli parçalar öne çıkarılmaz.

## 2. Kullanıcı rolleri
| Rol | Ne yapar |
|---|---|
| **Dinleyici** | Keşfeder, dinler, beğenir, kaydeder, oy verir, yorum yapar, takip eder |
| **Sanatçı** | Dinleyicinin her şeyi + parça yükler, profilini vitrine çevirir, istatistiklerini görür, ilgi alır |
| **Keşifçi** | Yapımcı / plak şirketi / menajer. Başvuru yapar, **admin onayından sonra** aktif olur. Favori + not tutar, ilgi gönderir, eşleşince iletişim bilgisine ulaşır. Oy vermez. |
| **Admin** | Keşifçi başvurularını onaylar, şikayetleri inceler, içerik/hesap kaldırır, "Editörün seçimi"ni belirler. Oy vermez. |

Kayıtta kullanıcı Dinleyici veya Sanatçı seçer. Keşifçi ayrı bir başvuru akışıyla gelir.

**Üyelik:** Herkes ücretsiz başlar. **Premium** (Faz 9) ek araçlar verir — en önemlisi **mesajlaşma**. Premium hiçbir zaman sıralamayı etkilemez.

## 3. Türler ve etiketler
- **Ana türler** (sıralamalar bunlara göre ayrı tutulur; parça tek ana tür seçer):
  Rap / Hip-Hop · Beat / Prodüksiyon (enstrümantal) · Pop · Arabesk / Fantezi · R&B / Soul · Rock / Alternatif · Elektronik / Dans · Akustik / Indie · Türkü / Halk
- **Alt tür etiketleri** (en fazla 3; öneri ve filtre için):
  trap, drill, boom bap, melodik rap, arabesk rap, old school, underground, lo-fi, afro, deep house, slow…
- **Ruh hali etiketleri** (en fazla 2): sert, duygusal, chill, enerjik, karanlık, aşk, parti
- Etiket listesi sabit (serbest yazı yok); admin genişletebilir.

## 4. Özellikler

### 4.1 Hesap ve profil
- E-posta + şifre ile kayıt/giriş (e-posta doğrulaması zorunlu), şifre sıfırlama. Kayıtta bot koruması (captcha).
- Profil: kullanıcı adı (benzersiz), görünen ad, fotoğraf, kısa biyografi, **şehir**, türler, sosyal linkler (Instagram, YouTube, Spotify, SoundCloud), iletişim e-postası (opsiyonel; sadece eşleşilen keşifçiye görünür).
- Sanatçıya özel: **öne çıkan parça** (profilin başına sabitlenir), **"Keşfedilmeye açığım"** anahtarı, en iyi derece rozetleri.
- Herkese açık profil: `/[kullaniciadi]` — parçalar, takipçi/takip, toplam oy, sıralama geçmişi.
- Hesap silme ve "verilerimi indir" (KVKK).

### 4.2 Parça yükleme
- Sadece sanatçılar yükler. Alanlar: başlık, ana tür, alt tür etiketleri, ruh hali, ses dosyası, kapak (opsiyonel; yoksa varsayılan), açıklama (opsiyonel), **"en iyi an"** (keşfet modunda çalacak başlangıç saniyesi), **feat** (sitedeki başka sanatçıları etiketleme).
- Beat'ler için opsiyonel **"Rapçi/vokal arıyorum"** etiketi.
- **Dış linkler** (opsiyonel): parçanın Spotify, YouTube, Apple Music, SoundCloud adresleri (sadece https ve bilinen alan adları).
- Yüklemede ses dalgası (waveform) çıkarılır ve saklanır (zaman damgalı yorumlar için).
- Ses: MP3, en fazla 15 MB. Kapak: JPG/PNG/WebP, en fazla 3 MB, kare gösterilir.
- Zorunlu onay: "Bu parçanın tüm haklarına sahibim / izinsiz sample veya başkasının beat'ini içermiyor."
- Sanatçı kendi parçasını düzenler ve siler. Ses dosyası sonradan değiştirilemez.
- Spam önlemi: haftada en fazla 3 parça (pazartesi 00:00, Türkiye saati).

### 4.3 Dinleme ve oynatıcı
- Site genelinde sayfa değişince durmayan alt oynatıcı: oynat/duraklat, ilerleme, ses, **önceki/sonraki**, bitince sıradakine geçme.
- Telefon kilit ekranında kontrol (Media Session).
- **Dinleme kaydı:** giriş yapmış kullanıcı bir parçayı **en az 30 saniye gerçekten dinlediğinde** (sunucu kendi saatiyle doğrular) sayılır; kişi + parça + gün başına 1 kayıt. Girişsiz dinleme sayılmaz.

### 4.4 Parça sayfası ve paylaşım
- Her parçanın kendi sayfası (`/p/[id]` gibi kısa adres): oynatıcı, beğeni/oy/kaydet, yorumlar, feat'ler, benzer parçalar.
- Paylaşınca (WhatsApp, X…) kapaklı önizleme kartı.
- **Instagram hikâyesi görseli:** parça ve sıralama derecesi için hazır görsel indirme.

### 4.5 Etkileşim
- **Beğeni (kalp):** anlık; keşfet modunda sağa kaydırmak = beğeni. Dinleme şartı yok, geri alınabilir. **Sıralamayı etkilemez**; beğeni sayısını, öneri sistemini ve sanatçı istatistiğini besler.
- **Oy:** sıralamayı belirleyen tek şey (kurallar 4.6).
- **Kaydet:** kişisel "Kaydedilenler" kitaplığı; sadece sahibi görür.
- **Takip:** kullanıcılar birbirini takip eder; takip edilenlerin yeni parçaları ayrı akışta.
- **Yorum:** herkese açık, giriş şart, en fazla 500 karakter. Sanatçı kendi parçasındaki yorumu silebilir ve yorumları kapatabilir. Küfür filtresi, hız sınırı (spam), şikayet.
- **Zaman damgalı yorum:** yorum opsiyonel olarak parçanın bir saniyesine bağlanır ("1:24'teki geçiş efsane"); ses dalgası üzerinde işaret olarak görünür, tıklayınca o saniyeye gider.
- **Yapılandırılmış geri bildirim:** dinleyici parçaya kriter kriter 1–5 puan verir.
  - Vokalli parçalar: vokal, flow/ritim, söz, prodüksiyon. Beat'ler: melodi, davul/ritim, mix, özgünlük.
  - Puan vermek için parçayı en az 30 sn dinlemiş olmak gerekir (trol önlemi); kişi başı parça başına 1 puanlama, değiştirilebilir.
  - Ortalamalar en az 5 puanlamadan sonra gösterilir. **Sıralamayı etkilemez**; sanatçının gelişimi içindir.

### 4.6 Oylama kuralları (en kritik kısım)
- Sadece **yukarı oy**; eksi oy yok (rakibi sabote etmeyi engeller).
- Giriş yapmış Dinleyici ve Sanatçılar oy verir. Keşifçi ve admin oy veremez.
- Kendi parçana (ve feat olarak etiketlendiğin parçaya) oy veremezsin.
- Aynı hesap aynı parçaya **haftada en fazla 1 oy** (veritabanında benzersizlik kısıtı ile).
- Oy için o parçayı **en az 30 saniye dinlemiş** olmak gerekir (dinleme kaydı sunucuda kontrol edilir).
- **Yeni hesap kuralı:** hesap 7 günden yeniyse oyu kaydedilir ama sıralamada sayılmaz (ağırlık 0).
- Sahte oy önlemleri: kayıtta captcha, hız sınırları, şüpheli kümelerin (aynı cihaz/IP'den çok hesap) admin incelemesine düşmesi.
- Tüm kurallar sunucu tarafında (veritabanı kısıtları / RLS / fonksiyonlar); istemci kontrolleri sadece kullanıcı deneyimi içindir.

### 4.7 Sıralamalar
- **Haftalık:** pazartesi 00:00 – pazar 23:59 (Europe/Istanbul). **Aylık:** takvim ayı, **top 10**.
- Her **ana tür** için ayrı liste.
- Skor = dönemdeki geçerli oy sayısı; eşitlikte oyu daha erken toplayan üstte.
- **Yükselenler:** bu hafta oyu en hızlı artan yeni yetenekler (yeni hesaplara şans).
- **Şehir sıralaması:** "İzmir'in en iyileri" gibi.
- **Editörün seçimi / Haftanın keşfi:** admin'in elle seçtiği vitrin (sıralamadan ayrı, açıkça "editör" diye etiketli).
- Dönem bitince liste dondurulur ve arşivlenir ("Geçmiş haftalar"). Profilde "En iyi derece: Rap #3, Kasım 2. hafta" rozeti.
- Canlı dönem sıralaması en geç 15 dakikada bir güncellenir.
- Sıralama sayfası sitenin vitrini: büyük, okunaklı, paylaşılabilir.

### 4.7.1 Erken keşifçi puanı ("Ben demiştim")
- Dinleyici bir parçaya, parça henüz **az oy almışken** (eşik: o ana kadar 50 geçerli oydan az) oy verirse bu "erken oy" olarak işaretlenir.
- Parça sonradan haftalık veya aylık **ilk 10'a girerse**, erken oy verenler puan kazanır (ne kadar erken, o kadar çok puan; kesin formül planda).
- Sadece **oylar** sayılır, beğeniler sayılmaz (oy 30 sn dinleme ve haftada 1 kuralına bağlı; beğeni bedava olduğu için puan kasılır).
- Kendi/feat parçana verilen oy ve 7 günden yeni hesapların oyları puan kazandırmaz.
- **"En iyi kulaklar"** dinleyici sıralaması (aylık + tüm zamanlar), profilde "Erken keşifçi" rozetleri ve kulak puanı.

### 4.8 Keşfet modu (Tinder kısmı)
- Tam ekran kart: kapak, sanatçı, tür/etiketler; parça **"en iyi an"dan** çalmaya başlar.
- **Sağa = beğen**, **sola = geç**, **kaydet** butonu, karta dokununca parça sayfası / tam dinleme.
- 30 sn dolunca karttan **oy** da verilebilir (4.6 kuralları aynen).
- Filtreler: ana tür, etiket, ruh hali, şehir.
- Daha önce geçilen/beğenilen parçalar tekrar gösterilmez.
- Keşifçiler için aynı mod + "Favorilere ekle" ve "İlgi gönder" hızlı butonları.

### 4.9 Öneri sistemi
- İlk girişte tercih seçimi: sevdiğin türler, etiketler, şehir.
- v1 kural tabanlı: tercih edilen tür/etiket eşleşmesi, beğenilenlere benzerlik ("bunu beğenenler şunu da beğendi"), takip edilenler, yükselenler, dinlenmemiş olanlar; yeni yeteneklere de garanti pay.
- Öneriler keşfet modunu ve ana sayfadaki "Sana özel" bölümünü besler.

### 4.10 Arama
- Sanatçı ve parça arama (isim, kullanıcı adı, başlık), tür/etiket/şehir filtreleri.
- Keşifçilere gelişmiş filtreler: oy sayısı, yükselme hızı, "keşfedilmeye açık" olanlar.
- **Yakınındaki yetenekler:** il bazında Türkiye haritası (81 il) ve şehir listesi; ile tıklayınca o şehrin sanatçıları ve şehir sıralaması. Konum hassas değil, sadece profildeki şehir kullanılır (gizlilik).

### 4.11 Keşifçi tarafı
- Başvuru formu: tür (yapımcı / plak şirketi / menajer), ad/şirket, web sitesi/Instagram, yetkili kişi, iletişim e-postası, kısa açıklama.
- Admin onaylayana kadar "beklemede"; keşifçi özellikleri kapalı.
- Onaylı keşifçi: **"Onaylı Keşifçi"** rozeti, **favoriler + özel notlar** (sadece kendine görünür).
- **İlgi gönder → eşleşme:** keşifçi sanatçıya ilgi gönderir; sanatçı kabul ederse iki tarafa iletişim bilgisi açılır. Reddedilen ilgi tekrar gönderilemez (taciz önlemi).
- **Yetenek alarmı:** kriterlere (tür, şehir, yükselme) uyan biri çıkınca bildirim.
- Keşifçinin sanatçı profilini görüntülemesi kaydedilir (4.12).

### 4.11.1 Fırsat panosu (ilanlar)
- Onaylı keşifçiler ilan açar: başlık, ne aradığı (rapçi, vokal, beatmaker, sahne sanatçısı…), tür/etiket, şehir (opsiyonel), son başvuru tarihi, açıklama.
- Sanatçılar ilana **kendi parçalarından biriyle** ve kısa bir notla başvurur (ilan başına 1 başvuru).
- Keşifçi başvuruları dinler, kısa listeye alır, reddeder ya da **eşleşme** başlatır (4.11'deki ilgi→eşleşme akışı).
- İlanlar herkese açık listelenir; filtre: tür, şehir, ne arandığı. Süresi dolan ilan kapanır.
- Ücretsizdir (fırsata erişim parayla satılmaz); spam için keşifçi başına aynı anda en fazla 5 açık ilan.

### 4.12 Sanatçı istatistikleri
- Ücretsiz: dinlenme, beğeni, kaydetme, oy, takipçi; **"Profilini bu hafta X keşifçi görüntüledi"** sayısı.
- Premium (Faz 9): hangi keşifçilerin görüntülediği, zaman içinde grafikler.

### 4.13 Bildirimler
- Site içi bildirim merkezi: yeni takipçi, beğeni, yorum, oy kilometre taşları, "Parçan ilk 10'a girdi", "Bir keşifçi ilgi gönderdi / eşleştiniz", takip ettiğin sanatçının yeni parçası.
- E-posta bildirimleri: sadece önemli olanlar (eşleşme, ilgi), kullanıcı kapatabilir.

### 4.14 Mesajlaşma (Premium)
- **Ücretsiz hesaplar mesaj başlatamaz.** Premium hesap başlatır.
- Karşı taraf ücretsizse: gelen mesaj "mesaj isteği" olarak düşer; kabul ederse o konuşmada cevap verebilir. *(Açık konu: bkz. §10.)*
- Engelleme, şikayet, hız sınırı. v1'de sadece yazı (dosya/ses gönderme yok).
- Admin sadece şikayet edilen konuşmaları görebilir.

### 4.15 Güvenlik ve moderasyon
- Her parçada, yorumda, profilde ve mesajda **"Şikayet et"**: telif ihlali, uygunsuz içerik, sahte hesap, taciz, diğer.
- Kullanıcı engelleme (engellenen kişi seni göremez, yorum/mesaj/ilgi gönderemez).
- Admin paneli (`/admin`): keşifçi başvuruları, şikayetler, şüpheli oy kümeleri, içerik/hesap gizleme-kaldırma, editörün seçimi.

### 4.16 Yasal
- Kullanım şartları, KVKK aydınlatma metni, çerez bilgilendirmesi, telif ihlali bildirimi (kaldırma talebi) sayfası. Taslak hazırlanır, yayından önce hukukçu gözden geçirir.
- Hesap silme ve veri indirme (4.1).

### 4.17 Haftalık challenge
- Her hafta bir **challenge beat'i** seçilir: beatmaker'lar beat'lerini "challenge'a aday" olarak işaretler (bu, rapçilerin beat'i challenge için kullanmasına **izin** vermek demektir); admin aralarından seçer.
- Rapçiler/vokalistler beat'i indirir, üzerine yazar ve challenge'a parça olarak yükler. Beatmaker otomatik olarak feat/prodüksiyon olarak etiketlenir.
- Challenge başına sanatçı başı 1 katılım; haftalık 3 yükleme sınırına **sayılmaz**.
- Takvim (taslak): katılım pazartesi–cuma, oylama pazar 23:59'a kadar. Oylar normal oy kurallarıyla (§4.6).
- Kazanan ve beatmaker'ı ana sayfada öne çıkar, profillerine "Challenge kazananı" rozeti; geçmiş challenge'lar arşivlenir.
- Kesin takvim, ödül ve çoklu tür (ör. pop challenge'ı) planda netleşir.

## 5. Teknoloji
- **Frontend + backend:** Next.js (App Router, TypeScript), Tailwind CSS.
- **Veritabanı + giriş + dosya:** Supabase (Postgres, Auth, Row Level Security, Storage; mesaj/bildirim için Realtime).
- **Yayın:** Vercel. Kod: GitHub.
- **Zamanlanmış işler:** dönem sonu arşivleme, yükselenler, öneriler için pg_cron.
- **Bot koruması:** Cloudflare Turnstile (ücretsiz captcha).
- **Hata takibi:** Sentry (ücretsiz katman). **Yedekleme:** canlıda Supabase Pro (günlük yedek).
- **Ödeme (Faz 9):** iyzico / PayTR — şirket/vergi kaydı gerektirir.

## 6. Veri modeli (taslak)
Mevcut: `profiles`, `artist_contacts`, `tracks`, `plays`. Eklenecek (isimler planda kesinleşir):
- `genres`, `tags` (sabit listeler) · `track_tags`
- `track_features` (feat / prodüksiyon) — track_id, artist_id, role
- `likes` — user_id, track_id, created_at — UNIQUE(user_id, track_id)
- `saves` — user_id, track_id
- `follows` — follower_id, followee_id
- `comments` — id, track_id, author_id, body, status, created_at
- `votes` — voter_id, track_id, week_start, counts (7 gün kuralı) — **UNIQUE(voter_id, track_id, week_start)**
- `ranking_snapshots` — period_type (week | month), period_start, genre, scope (genel | şehir), track_id, rank, score
- `swipes` — user_id, track_id, action (like | skip), created_at (tekrar göstermemek ve öneri için)
- `user_preferences` — tercih edilen türler/etiketler/şehir
- `scout_applications` — başvuru ve onay durumu
- `scout_favorites`, `scout_notes`, `scout_alerts`
- `interests` — scout_id, artist_id, status (pending | accepted | declined)
- `profile_views` — viewer_id (keşifçi), profile_id, day
- `track_links` (dış linkler) · `tracks.waveform` (ses dalgası)
- `comments.at_sec` (zaman damgası) · `ratings` — user_id, track_id, kriter puanları — UNIQUE(user_id, track_id)
- `votes.is_early` + `ear_points` (erken keşifçi puanları)
- `opportunities` (ilanlar) · `opportunity_applications`
- `challenges` · `challenge_entries`
- `notifications`
- `conversations`, `messages`, `blocks`
- `reports` — reporter_id, target_type, target_id, reason, details, status
- `subscriptions` (Faz 9)

## 7. Tasarım
- Koyu tema, premium/sade, **turuncu** vurgu; şimdilik yazı logo ("vitrin.").
- Önce mobil; keşfet modu telefonda kaydırma hareketiyle çalışır. Alt oynatıcı her ekranda.
- Sıralama sayfası ve paylaşım görselleri sitenin vitrini: büyük, okunaklı, Instagram'a hazır.
- Kullanıcının göndereceği tasarım gelince tüm ekranlar ona göre giydirilir.

## 8. Bilerek olmayacaklar
- **Parayla sıralamada yükselme — hiçbir fazda.**
- Ücretsiz hesaplarda mesaj başlatma.
- Native mobil uygulama (iOS/Android) — v1'de PWA yeterli.
- İngilizce arayüz.
- Video yükleme, canlı yayın.

## 9. Fazlar
Her faz bitince: çalıştır, test et, GitHub'a gönder, Vercel önizlemesinde kontrol et, PR ile canlıya al. Ayrıntılı içerik ve durum: [FAZLAR.md](FAZLAR.md).

| Faz | İçerik | Bitti sayılır, eğer… |
|---|---|---|
| 0 ✅ | Kurulum | Boş site Vercel'de açılıyor |
| 1 ✅ | Hesap ve profil | Sanatçı ve dinleyici hesabı açılıp profil görüntülenebiliyor |
| 2 ✅ | Parça yükleme, akış, oynatıcı, dinleme kaydı | Yüklenen parça akışta görünüyor ve çalınıyor |
| 3 | Türler/etiketler, dış linkler, parça sayfası + paylaşım, beğeni, kaydet, takip, yorum (zaman damgalı), yapılandırılmış geri bildirim, oynatıcı sırası | Etkileşimler sunucuda kurallarıyla test edildi |
| 4 | Oylama + sıralamalar + arşiv + erken keşifçi puanı + bot/sahte oy koruması | §4.6 ve §4.7.1 kurallarının hepsi sunucuda test edildi |
| 5 | Keşfet modu + öneri sistemi + arama + yakınındaki yetenekler | Yeni kullanıcı tercih seçip kaydırarak keşfedebiliyor |
| 6 | Keşifçi tarafı: başvuru, favori/not, ilgi→eşleşme, alarm, istatistikler, fırsat panosu | Onaysız keşifçi hiçbir özelliğe erişemiyor; ilan→başvuru→eşleşme uçtan uca çalışıyor |
| 7 | Bildirimler + şikayet/engelleme + admin paneli + haftalık challenge | Şikayet edilen içerik kaldırılabiliyor; bir challenge haftası baştan sona işliyor |
| 8 | Canlıya çıkış: yasal, KVKK, alan adı, canlı Supabase, e-posta, hata takibi, yedek, PWA, son tasarım | Gerçek kullanıcıya açılabilir |
| 9 | Premium üyelik + mesajlaşma + ödeme | Şirket/vergi kaydı ve ödeme altyapısı hazır olduktan sonra |

## 10. Açık konular
- **Mesajlaşmada ücretsiz taraf:** Premium bir keşifçi ücretsiz bir sanatçıya yazınca sanatçı cevap verebilsin mi? (Öneri: evet, "mesaj isteği" kabul edilince. Yoksa keşifçiler ücretsiz yeteneklere ulaşamaz.)
- **Premium paket içerikleri** (sanatçı ve keşifçi için ayrı) ve fiyatlar.
- **Erken açılış:** Faz 8'i beklemeden, Faz 5 sonrası davetli kullanıcılarla kapalı beta yapılsın mı?
- Sitenin kesin adı ve alan adı (çalışma adı: Vitrin).
- Ödeme altyapısı (şirket/vergi kaydı gerektirir).
- Tür ve etiket listesinin son hali.
- GitHub hesabındaki fatura kilidi (CI'ı engelliyor).

# Vitrin — Fazlar ve yol haritası

Son güncelleme: 16 Ekim 2026 · Ayrıntılı ürün tanımı: [SPEC.md](SPEC.md)

Toplam **7 faz** var (0'dan 6'ya). Her faz bitince: çalıştırılır, test edilir, GitHub'a gönderilir, Vercel önizlemesinde kontrol edilir, sonra canlıya alınır.

| Faz | Konu | Durum |
|---|---|---|
| 0 | Kurulum | ✅ Bitti |
| 1 | Hesap ve profil | ✅ Bitti |
| 2 | Parça yükleme, akış, oynatıcı | ✅ Kod bitti, test edildi — merge bekliyor |
| 3 | Oylama ve sıralama | ⏳ Sırada |
| 4 | Plak şirketleri ve favoriler | ⏳ |
| 5 | Şikayet, moderasyon, yasal sayfalar, canlıya çıkış | ⏳ |
| 6 | Ödeme ve üyelik paketleri (sonra) | ⏳ |

Ayrıca fazlardan bağımsız bir iş daha var: **🎨 Tasarım** (aşağıda).

---

## Faz 0 — Kurulum ✅
- Next.js + Tailwind sitesi, Supabase (veritabanı, giriş, dosya depolama) bağlantısı
- GitHub reposu ve Vercel'de yayın: vitrindemo-three.vercel.app
- **Bitti sayılma şartı:** Boş site Vercel'de açılıyor ✔

## Faz 1 — Hesap ve profil ✅
- E-posta + şifre ile kayıt ve giriş, e-posta doğrulaması, şifre sıfırlama
- Kayıtta **Dinleyici** veya **Sanatçı** seçimi
- Profil: kullanıcı adı, görünen ad, fotoğraf, biyografi, tür (Rap/Beat), Instagram / YouTube / Spotify / SoundCloud linkleri
- Sanatçının iletişim e-postası (sadece onaylı plak şirketleri görecek)
- Herkese açık profil sayfası: `/kullaniciadi`
- Güvenlik testi: kimse başkasının profilini değiştiremez, kendine yönetici rolü veremez
- **Bitti sayılma şartı:** Sanatçı ve dinleyici hesabı açılıp profil görüntülenebiliyor ✔

### Sağlamlaştırma (Faz 1 ile 2 arası) ✅
- Otomatik kontroller (CI): her gönderimde kod kontrolü, build ve boş veritabanında güvenlik testi
- Dal + PR ile çalışma; `main`'e doğrudan gönderim kapalı
- ⚠️ GitHub hesabındaki fatura kilidi yüzünden CI şu an çalışmıyor; aynı kontroller her commit öncesi bilgisayarda çalıştırılıyor

## Faz 2 — Parça yükleme, akış, oynatıcı ✅ (merge bekliyor)
- **Parça yükleme** (`/yukle`, sadece sanatçı): MP3 (en fazla 15 MB), başlık, Rap/Beat, kapak (en fazla 3 MB, opsiyonel), açıklama
- "Bu parçanın tüm hakları bende" onayı zorunlu
- Haftada en fazla **3 parça** (pazartesi 00:00'da yenilenir)
- Sanatçı kendi parçasını düzenler ve siler
- **Ana sayfa:** "Yeni yüklenenler" akışı, Hepsi / Rap / Beat filtresi
- **Alt oynatıcı:** oynat/duraklat, ileri-geri sarma, ses; sayfa değişince müzik durmaz
- **Dinleme kaydı:** giriş yapmış biri 30 saniye dinleyince sayılır (sunucu kontrol eder), aynı kişi aynı parçayı günde 1 kez
- Güvenlik testi: dinleyici yükleyemez, kimse başkasının parçasını değiştiremez, 4. parça reddedilir
- **Bitti sayılma şartı:** Yüklenen parça akışta görünüyor ve çalınıyor ✔ (gerçek parçayla denendi)

## Faz 3 — Oylama ve sıralama ⏳ (sitenin kalbi)
**Oylama kuralları** — hepsi sunucuda, kandırılamaz şekilde:
- Sadece **beğeni** (yukarı oy); eksi oy yok, kimse rakibini batıramaz
- Dinleyici ve sanatçılar oy verir; plak şirketi ve yönetici veremez
- Kendi parçana oy veremezsin
- Aynı parçaya **haftada en fazla 1 oy**
- Oy vermek için parçayı **en az 30 saniye dinlemiş** olmak gerekir (Faz 2'deki dinleme kaydı)
- **Yeni hesap kuralı:** 7 günden yeni hesapların oyu kaydedilir ama sıralamada sayılmaz

**Sıralama:**
- **Haftalık** (pazartesi–pazar) ve **aylık**, Rap ve Beat ayrı ayrı
- Skor = o dönemdeki geçerli oy sayısı; eşitlikte oyu daha erken toplayan üstte
- Ana sayfada "Bu haftanın zirvesi" (ilk 10)
- Büyük, okunaklı **sıralama sayfası** — Instagram'da paylaşılacak gibi
- Dönem bitince liste dondurulur ve arşivlenir ("Geçmiş haftalar")
- Sanatçı profilinde toplam oy ve "En iyi derece: Rap #3, Kasım 2. hafta" gibi rozet
- **Bitti sayılma şartı:** Yukarıdaki tüm oylama kuralları sunucu tarafında test edildi

## Faz 4 — Plak şirketleri ve favoriler ⏳
- Plak şirketi başvuru formu: şirket adı, web sitesi/Instagram, yetkili kişi, iletişim e-postası, kısa açıklama
- Yönetici onaylayana kadar hesap "beklemede", özellikler kapalı
- Onaylı şirket: "Onaylı Plak Şirketi" rozeti, sanatçıları **favorilere ekleme** (liste sadece kendine görünür), sanatçının iletişim e-postasını görme
- Yönetici için başvuru onay/ret ekranı
- **Bitti sayılma şartı:** Onaylanmamış şirket hiçbir özelliğe erişemiyor

## Faz 5 — Şikayet, moderasyon, yasal sayfalar, canlıya çıkış ⏳
- Her parçada ve profilde **"Şikayet et"**: telif ihlali, uygunsuz içerik, sahte hesap, diğer
- **Yönetici paneli** (`/admin`): şikayetler, şirket başvuruları, parça/hesap gizleme-kaldırma
- **Yasal sayfalar:** kullanım şartları, KVKK aydınlatma metni, çerez bilgilendirmesi, telif ihlali bildirimi (taslak; yayından önce gözden geçirilecek)
- **Canlıya çıkış hazırlığı:**
  - Sitenin kesin adı ve **alan adı** (domain)
  - Boş, yeni bir **canlı Supabase projesi**; demo verisi taşınmaz
  - Türkçe e-posta şablonları + özel e-posta gönderici (alan adı gerekli)
  - Gerçek logo, son tasarım rötuşları
- **Bitti sayılma şartı:** Site gerçek kullanıcıya açılabilir

## Faz 6 — Ödeme ve üyelik paketleri ⏳ (sonra)
- Sanatçı ve plak şirketi için ücretli paketler
- Ödeme altyapısı (Türkiye için iyzico / PayTR vb.)
- **Ön şart:** şirket/vergi kaydı ve paket içeriklerinin belirlenmesi

---

## 🎨 Tasarım (fazlardan bağımsız)
- Seçilen yön: koyu tema, premium/sade, **turuncu** vurgu, şimdilik yazı logo ("vitrin.")
- Şu an sadece temel stil var; **kullanıcının göndereceği tasarım** gelince tüm sayfalar ona göre giydirilecek
- Tasarımda olması gereken ekranlar: ana sayfa, alt oynatıcı, sıralama sayfası, sanatçı profili, parça kartı/satırı, formlar (giriş, kayıt, profil düzenleme, yükleme), boş durumlar — masaüstü ve telefon

## 🚫 Bilerek olmayacaklar
- **Parayla sıralamada yükselme — hiçbir fazda olmayacak**
- Uygulama içi mesajlaşma, yorumlar
- Detaylı istatistik paneli
- Mobil uygulama (iOS/Android) — site telefonda tam çalışır
- Rap ve Beat dışındaki türler, İngilizce arayüz

## ❓ Açık konular
- Sitenin kesin adı ve alan adı (çalışma adı: Vitrin)
- Ücretli paketlerin içeriği (Faz 6'dan önce)
- Ödeme altyapısı (şirket/vergi kaydı gerektirir)
- GitHub hesabındaki fatura kilidi (CI'ı engelliyor)

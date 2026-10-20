# Vitrin — Fazlar ve yol haritası

Son güncelleme: 21 Ekim 2026 · Ayrıntılı kurallar: [SPEC.md](SPEC.md)

**Vitrin nedir?** Spotify gibi bir dinleme sitesi değil; Tinder mantığında bir **keşfedilme platformu**. Yetenekler (rapçi, şarkıcı, beatmaker) keşfedilmek için gelir; keşifçiler (yapımcı, plak şirketi, menajer) yeni yetenek bulmak için gelir; dinleyiciler oylarıyla sıralamayı belirler.

Toplam **10 faz** (0–9). Her faz: çalıştırılır → test edilir → GitHub'a gönderilir → Vercel önizlemesinde kontrol edilir → PR ile canlıya alınır.

| Faz | Konu | Durum |
|---|---|---|
| 0 | Kurulum | ✅ Bitti |
| 1 | Hesap ve profil | ✅ Bitti |
| 2 | Parça yükleme, akış, oynatıcı, dinleme kaydı | ✅ Bitti |
| 3 | Türler, parça sayfası, beğeni, kaydet, takip, yorum, geri bildirim | ✅ Bitti |
| 4 | Oylama, sıralamalar, erken keşifçi puanı | ✅ Bitti |
| 5 | Keşfet modu (kaydırma), öneriler, yakınındaki yetenekler | 🔍 Kod bitti, test bekliyor |
| 6 | Keşifçi tarafı, eşleşme, fırsat panosu | ⏳ Sırada |
| 7 | Bildirimler, şikayet, yönetici paneli, haftalık challenge | ⏳ |
| 8 | Canlıya çıkış | ⏳ |
| 9 | Premium üyelik ve mesajlaşma | ⏳ (şirket kaydından sonra) |

> **Değişmez kural:** Parayla sıralamada yükselme hiçbir fazda olmayacak.

---

## Faz 0 — Kurulum ✅
Next.js + Tailwind sitesi, Supabase (veritabanı, giriş, dosya), GitHub ve Vercel'de yayın.

## Faz 1 — Hesap ve profil ✅
- Kayıt/giriş, e-posta doğrulama, şifre sıfırlama
- Dinleyici / Sanatçı seçimi
- Profil: fotoğraf, biyografi, türler, sosyal linkler, iletişim e-postası
- Herkese açık profil sayfası
- Güvenlik testi (kimse başkasının profilini değiştiremez)
- **+ Sağlamlaştırma:** otomatik kontroller (CI), dal + PR ile çalışma

## Faz 2 — Parça yükleme, akış, oynatıcı ✅
- Parça yükleme: MP3, kapak, "haklar bende" onayı, haftada en fazla 3 parça
- Parça düzenleme ve silme
- Ana sayfa "Yeni yüklenenler" akışı + filtre
- Sayfa değişince durmayan alt oynatıcı
- 30 saniye dinleme kaydı (sunucu doğrular, günde 1)

## Faz 3 — Türler ve etkileşim ✅
- **Türkiye'de çok dinlenen türler:** Rap/Hip-Hop, Beat/Prodüksiyon, Pop, Arabesk/Fantezi, R&B/Soul, Rock/Alternatif, Elektronik/Dans, Akustik/Indie, Türkü/Halk
- **Etiketler:** alt tür (trap, drill, boom bap, melodik rap, arabesk rap…) ve ruh hali (sert, duygusal, chill…)
- **"En iyi an":** sanatçı parçanın en vurucu yerini işaretler (keşfet modunda oradan çalar)
- **Feat:** başka sanatçıları parçaya etiketleme · beat'ler için "Rapçi arıyorum" etiketi
- **Dış linkler:** parça Spotify / YouTube / Apple Music / SoundCloud'da da varsa linkleri
- **Parça sayfası** + paylaşım linki (WhatsApp'ta kapaklı önizleme)
- **Beğeni** (kalp) — sıralamayı etkilemez
- **Kaydet** — kişisel kitaplık
- **Takip** — takip ettiklerinin yeni parçaları ayrı akışta
- **Yorum** — herkese açık; sanatçı kendi parçasındaki yorumu silebilir/kapatabilir; küfür filtresi
- **Zaman damgalı yorum** — "1:24'teki geçiş efsane"; ses dalgası üzerinde işaret, tıklayınca o saniyeye gider
- **Yapılandırılmış geri bildirim** — vokal / flow / söz / prodüksiyon (beat'te: melodi / davul / mix / özgünlük) için 1–5 puan; 30 sn dinlemeden verilemez; sıralamayı etkilemez
- Profile **şehir**, **öne çıkan parça**, **"keşfedilmeye açığım"**
- Oynatıcıda **önceki/sonraki**, bitince sıradakine geçme

## Faz 4 — Oylama ve sıralamalar ✅
- **Oy ≠ beğeni.** Oy sıralamayı belirler; kuralları sıkı:
  - Sadece yukarı oy · kendi parçana oy yok · aynı parçaya haftada 1 oy
  - Oy için en az 30 saniye dinlemiş olmak şart
  - 7 günden yeni hesapların oyu sıralamada sayılmaz
  - Keşifçi ve yönetici oy veremez
- **Haftalık sıralama** ve **aylık top 10**, her tür için ayrı
- **Yükselenler** (yeni yeteneklere şans) · **Şehir sıralaması**
- Ana sayfada "Bu haftanın zirvesi"
- Geçmiş haftalar arşivi, profilde "En iyi derece" rozeti
- Instagram hikâyesine hazır sıralama görseli
- **Erken keşifçi puanı ("Ben demiştim"):** parça az oyluyken oy verdiysen ve parça sonra ilk 10'a girerse puan kazanırsın; **"En iyi kulaklar"** dinleyici sıralaması ve rozetler
- **Sahte oy koruması:** kayıtta captcha, hız sınırları, şüpheli hesap kümelerinin tespiti

## Faz 5 — Keşfet modu ve öneriler 🔍 (Tinder kısmı — kod bitti, test bekliyor)
- Tam ekran kart: parça "en iyi an"dan çalar · **sağa = beğen, sola = geç**, kaydet
- 30 sn dinleyince karttan oy da verilebilir
- Filtre: tür, etiket, ruh hali, şehir · görülen parça tekrar gelmez
- İlk girişte **tercih seçimi** (türler, etiketler, şehir)
- **Öneri sistemi:** "Sana özel", "bunu beğenenler şunu da beğendi", yeni yeteneklere garanti pay
- **Arama:** sanatçı ve parça
- **Yakınındaki yetenekler:** Türkiye haritası (81 il) — ile tıkla, o şehrin sanatçıları ve şehir sıralaması

## Faz 6 — Keşifçi tarafı ve eşleşme ⏳
- **Keşifçi** hesabı (yapımcı / plak şirketi / menajer): başvuru → yönetici onayı → "Onaylı Keşifçi" rozeti
- Keşfet modunda "Favorile" ve "İlgi gönder" butonları
- **İlgi → eşleşme:** sanatçı kabul ederse iletişim bilgileri iki tarafa açılır (Tinder'ın "match"i)
- Favoriler ve sanatçılar hakkında **özel notlar**
- Gelişmiş arama (oy, yükselme hızı, keşfedilmeye açık olanlar)
- **Yetenek alarmı:** kriterlere uyan biri yükselince haber ver
- Sanatçıya istatistik: dinlenme, beğeni, kaydetme, oy, takipçi, **"Profilini bu hafta X keşifçi görüntüledi"**
- **Fırsat panosu:** keşifçiler ilan açar ("Drill rapçi arıyorum", "Açık sahne için sanatçı"), sanatçılar bir parçasıyla başvurur; keşifçi dinler, kısa listeye alır, eşleşme başlatır. Ücretsiz.

## Faz 7 — Bildirimler, güvenlik ve challenge ⏳
- **Bildirim merkezi:** takipçi, beğeni, yorum, "ilk 10'a girdin", ilgi/eşleşme, takip ettiğin sanatçının yeni parçası
- Önemli olanlar için e-posta (kapatılabilir)
- **Şikayet et** (parça, yorum, profil): telif, uygunsuz içerik, sahte hesap, taciz
- **Engelleme**
- **Yönetici paneli:** keşifçi başvuruları, şikayetler, şüpheli oylar, içerik/hesap kaldırma, **Editörün seçimi**
- **Haftalık challenge:** her hafta bir beatmaker'ın beat'i seçilir, rapçiler üzerine yazıp yükler, oylarla kazanan belli olur; kazanan ve beatmaker ana sayfada + rozet

## Faz 8 — Canlıya çıkış ⏳ (gerçek kullanıcıya açılış)
- Yasal sayfalar: kullanım şartları, KVKK, çerezler, telif bildirimi (hukukçu kontrolü)
- **Hesap silme** ve **verilerimi indir** (KVKK)
- Sitenin kesin adı ve **alan adı**
- Boş, yeni **canlı Supabase** (Pro: günlük yedek); test verisi taşınmaz
- Türkçe e-posta şablonları + özel e-posta gönderici
- Hata takibi (Sentry)
- Telefona uygulama gibi ekleme (PWA) + kilit ekranında müzik kontrolü
- **Son tasarım ve gerçek logo**

## Faz 9 — Premium ve mesajlaşma ⏳ (sonra)
- **Mesajlaşma:** ücretsiz hesaplar mesaj başlatamaz; engelleme, şikayet
- Premium paketleri (sanatçı ve keşifçi için ayrı): örn. profilini görüntüleyen keşifçilerin adları, detaylı grafikler
- Ödeme altyapısı (iyzico / PayTR)
- **Ön şart:** şirket/vergi kaydı

---

## 🎨 Tasarım (fazlardan bağımsız)
- Koyu tema, premium/sade, turuncu vurgu, şimdilik yazı logo
- **Demo tasarım uygulandı (18 Ekim 2026):** renkler/fontlar `app/globals.css` + `app/layout.tsx`'te token olarak; ana sayfa, profil, formlar, oynatıcı, 404, boş durumlar, skeleton. Taslak: [Claude Design kanvası](https://claude.ai/artifact/BhE5iWQa1idqp3DpHD4Chn). İleride rötuşlanacak.
- **Senin göndereceğin tasarım** gelince tüm ekranlar ona göre giydirilir
- Tasarlanması gereken ekranlar: ana sayfa, **keşfet modu (kaydırma kartı)**, alt oynatıcı, parça sayfası, sıralama sayfası, profil, keşifçi ekranları, bildirimler, formlar, boş durumlar — masaüstü ve telefon

## 🚫 Bilerek olmayacaklar
- **Parayla sıralamada yükselme**
- Ücretsiz hesaplarda mesaj başlatma
- Native mobil uygulama (v1'de PWA yeterli)
- İngilizce arayüz, video, canlı yayın

## ❓ Karar bekleyenler
- **Mesajlaşmada ücretsiz taraf:** Premium keşifçi ücretsiz sanatçıya yazınca sanatçı cevap verebilsin mi? (Önerim: evet, mesaj isteğini kabul ederse — yoksa keşifçiler yeteneklere ulaşamaz)
- **Erken açılış:** Faz 5'ten sonra davetli kullanıcılarla kapalı beta?
- Premium paket içerikleri ve fiyatlar
- Sitenin adı ve alan adı
- Tür ve etiket listesinin son hali
- GitHub fatura kilidi (CI'ı engelliyor)

## 💡 Fikir havuzu (plana alınmadı, sonra değerlendirilecek)
- Kör dinleme modu — keşfette isim/takipçi/oy gizli, sadece müzik
- Vitrin Wrapped — ay/yıl sonu paylaşılabilir özet kartları
- Vitrin Gecesi — her pazar canlı geri sayımla top 10 açıklaması
- "Şuna benzeyen yeni yetenekleri bul" — ses benzerliğiyle ünlü sanatçıya benzeyenler
- Tarayıcıda stüdyo — beat üzerine telefondan 16 bar kaydet
- Canlı Türkiye haritası — şu an dinlenenler şehir şehir
- Kafiye haritası — rap sözlerinde kafiyeler renkli

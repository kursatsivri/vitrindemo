// Yasal metinler (/yasal/[sayfa]). Taslak: hukukçu kontrolünden önce yer tutucular doldurulmalı.
export type LegalDoc = {
  title: string;
  sections: { heading: string; paragraphs: string[] }[];
};

export const DRAFT_NOTE = "Bu metin hukukçu kontrolünden önce taslaktır.";

const OWNER = "[Ad Soyad / Şirket]";
const ADDRESS = "[Adres]";
const EMAIL = "[E-posta]";

export const LEGAL: Record<string, LegalDoc> = {
  "kullanim-sartlari": {
    title: "Kullanım Şartları",
    sections: [
      {
        heading: "1. Taraflar ve kapsam",
        paragraphs: [
          `Bu şartlar, ${OWNER} (“Vitrin”) tarafından işletilen Vitrin platformunu kullanan herkes için geçerlidir. Hesap oluşturarak veya platformu kullanarak bu şartları kabul etmiş olursun.`,
          "Şartlar zaman zaman güncellenebilir. Önemli değişiklikleri platformda duyururuz; değişiklikten sonra kullanmaya devam etmen güncel şartları kabul ettiğin anlamına gelir.",
        ],
      },
      {
        heading: "2. Hesap",
        paragraphs: [
          "Kayıt olurken doğru bilgi vermek ve hesabının güvenliğini sağlamak senin sorumluluğundadır. Hesabını başkasına devredemez, başkası adına hesap açamazsın.",
          "Bir kişi yalnızca bir hesap kullanabilir. Oyları veya sıralamayı etkilemek için birden fazla hesap açmak yasaktır.",
        ],
      },
      {
        heading: "3. Sıralama ve oylar",
        paragraphs: [
          "Vitrin’de sıralamalar yalnızca kullanıcıların oyları ve dinlemeleriyle belirlenir. Para karşılığında sıralamada yükselmek, öne çıkmak veya oy satın almak mümkün değildir; böyle bir hizmet sunulmaz.",
          "Sahte hesap, bot, oy takası veya benzeri yollarla sonuçları manipüle etmek yasaktır. Şüpheli oylar geçersiz sayılabilir, ilgili hesaplar askıya alınabilir.",
        ],
      },
      {
        heading: "4. Kullanıcı içeriği ve telif hakkı",
        paragraphs: [
          "Yüklediğin parça, kapak görseli, yorum ve diğer içeriklerden sen sorumlusun. Yalnızca hakları sana ait olan ya da yayımlamak için gerekli izinleri aldığın içerikleri yükleyebilirsin.",
          "İçeriğin hakları sende kalır. İçeriği yükleyerek Vitrin’e, onu platformda yayımlamak, çalmak, listelemek ve platformu tanıtmak için gereken, ücretsiz ve münhasır olmayan bir kullanım izni verirsin. İçeriği silersen bu izin makul bir süre içinde sona erer.",
          "Başkasının telif hakkını, marka hakkını veya kişilik haklarını ihlal eden; nefret söylemi, taciz, şiddet çağrısı veya yasa dışı unsur içeren içerikler yasaktır.",
        ],
      },
      {
        heading: "5. Şikayet ve askıya alma",
        paragraphs: [
          "Kurallara aykırı bulduğun içerik veya hesapları “Şikayet et” butonuyla bildirebilirsin. Şikayetler yöneticiler tarafından incelenir.",
          `Vitrin, bu şartlara aykırı içerikleri kaldırma, hesapları geçici veya kalıcı olarak askıya alma hakkını saklı tutar. Askıya alınan hesap sahibi, gerekçesiyle birlikte ${EMAIL} adresine itiraz edebilir.`,
        ],
      },
      {
        heading: "6. Sorumluluğun sınırı",
        paragraphs: [
          "Platform “olduğu gibi” sunulur. Kesintisiz veya hatasız çalışacağını garanti etmeyiz. Kullanıcıların yüklediği içeriklerden Vitrin sorumlu tutulamaz; ancak bildirilen ihlallere makul sürede müdahale ederiz.",
        ],
      },
      {
        heading: "7. Uygulanacak hukuk ve iletişim",
        paragraphs: [
          "Bu şartlar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda Türkiye mahkemeleri ve icra daireleri yetkilidir.",
          `Sorularını ${EMAIL} adresine veya ${ADDRESS} adresine iletebilirsin.`,
        ],
      },
    ],
  },

  kvkk: {
    title: "KVKK Aydınlatma Metni",
    sections: [
      {
        heading: "1. Veri sorumlusu",
        paragraphs: [
          `6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca veri sorumlusu ${OWNER}’dir (adres: ${ADDRESS}, e-posta: ${EMAIL}). Bu metin, Vitrin’i kullanırken hangi kişisel verilerinin nasıl işlendiğini açıklar.`,
        ],
      },
      {
        heading: "2. İşlenen kişisel veriler",
        paragraphs: [
          "Hesap bilgileri: e-posta adresi, kullanıcı adı, şifre (geri döndürülemez biçimde şifrelenmiş olarak), hesap türü.",
          "Profil bilgileri: görünen ad, profil fotoğrafı, biyografi, şehir, tür tercihleri ve eklediğin sosyal medya bağlantıları.",
          "Parça bilgileri: yüklediğin ses dosyaları, kapak görselleri, parça adı, tür ve açıklamalar.",
          "Etkileşimler: beğeniler, yorumlar, takipler, puanlamalar ve bildirimler.",
          "Oylar ve dinleme kayıtları: verdiğin oylar, hangi parçayı ne zaman ve ne kadar dinlediğin.",
          "Teknik veriler: IP adresi, oturum bilgileri, tarayıcı ve cihaz bilgileri, hata kayıtları.",
          "Şikayetler: gönderdiğin veya hakkında gönderilen şikayetlerin içeriği ve sonucu.",
        ],
      },
      {
        heading: "3. İşleme amaçları",
        paragraphs: [
          "Hesabını oluşturmak ve yönetmek; parçaları yayımlamak ve çalmak; sıralamaları, keşfet akışını ve önerileri hesaplamak.",
          "Oy ve dinleme sayılarının adil olmasını sağlamak; sahte hesap, bot ve oy manipülasyonunu tespit etmek.",
          "Şikayetleri incelemek, kurallara aykırı içerik ve hesaplar hakkında işlem yapmak.",
          "Platformun güvenliğini sağlamak, hataları tespit edip gidermek ve yasal yükümlülükleri yerine getirmek.",
        ],
      },
      {
        heading: "4. Hukuki sebepler",
        paragraphs: [
          "Kişisel verilerin KVKK m.5/2 kapsamında; bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması (c), veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi (ç), bir hakkın tesisi, kullanılması veya korunması (e) ve temel hak ve özgürlüklerine zarar vermemek kaydıyla veri sorumlusunun meşru menfaati (f) hukuki sebeplerine dayanılarak işlenir.",
          "Profilinde herkese açık olarak paylaştığın bilgiler, alenileştirdiğin veriler (d) kapsamında işlenir.",
        ],
      },
      {
        heading: "5. Aktarım",
        paragraphs: [
          "Kişisel verilerin, platformun çalışması için hizmet aldığımız şu sağlayıcılara aktarılır: Supabase (veritabanı, kimlik doğrulama, dosya depolama), Vercel (barındırma), Cloudflare (robot doğrulaması), Sentry (hata takibi) ve e-posta gönderim sağlayıcısı (doğrulama ve bildirim e-postaları).",
          "Bu sağlayıcıların sunucuları yurt dışında bulunabilir. Yurt dışına aktarım KVKK m.9’da öngörülen şartlara uygun olarak yapılır.",
          "Verilerin, yasal olarak yetkili kamu kurum ve kuruluşlarına talep halinde ve mevzuatın izin verdiği ölçüde aktarılabilir.",
        ],
      },
      {
        heading: "6. Toplama yöntemi ve saklama süresi",
        paragraphs: [
          "Veriler, kayıt formu, profil ve yükleme ekranları ile platformu kullanırken elektronik ortamda otomatik yollarla toplanır.",
          "Veriler, hesabın açık olduğu sürece ve ilgili mevzuatta öngörülen süreler boyunca saklanır; süre dolduğunda silinir, yok edilir veya anonim hale getirilir.",
        ],
      },
      {
        heading: "7. Hakların (KVKK m.11)",
        paragraphs: [
          "Kişisel verilerinin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme hakkına sahipsin.",
          "Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini, KVKK m.7 şartları çerçevesinde silinmesini veya yok edilmesini isteme ve bu işlemlerin aktarılan üçüncü kişilere bildirilmesini talep etme hakkın vardır.",
          "İşlenen verilerin yalnızca otomatik sistemlerle analiz edilmesi sonucunda aleyhine bir sonuç çıkmasına itiraz etme ve kanuna aykırı işleme nedeniyle zarara uğrarsan zararın giderilmesini talep etme hakkın da bulunur.",
        ],
      },
      {
        heading: "8. Başvuru yolu",
        paragraphs: [
          `Haklarına ilişkin taleplerini, kimliğini doğrulayabileceğimiz bilgilerle birlikte kayıtlı e-posta adresinden ${EMAIL} adresine yazarak veya ${ADDRESS} adresine yazılı olarak iletebilirsin.`,
          "Başvurular en geç 30 gün içinde ücretsiz olarak sonuçlandırılır. İşlemin ayrıca bir maliyet gerektirmesi halinde Kişisel Verileri Koruma Kurulu’nun belirlediği tarife uygulanabilir.",
        ],
      },
    ],
  },

  cerezler: {
    title: "Çerez Politikası",
    sections: [
      {
        heading: "1. Çerez nedir?",
        paragraphs: ["Çerezler, bir web sitesini ziyaret ettiğinde tarayıcına kaydedilen küçük metin dosyalarıdır."],
      },
      {
        heading: "2. Kullandığımız çerezler",
        paragraphs: [
          "Zorunlu oturum çerezi: Giriş yaptığında oturumunu açık tutmak için kullanılır. Bu çerez olmadan giriş yapılamaz; platformun çalışması için zorunludur ve onay gerektirmez.",
          "Cloudflare Turnstile: Kayıt, giriş ve şifre sıfırlama formlarında robotları ayırt etmek için Cloudflare’in güvenlik doğrulaması kullanılır. Bu doğrulama, yalnızca güvenlik amacıyla kendi çerezlerini veya benzeri teknik verileri kullanabilir.",
        ],
      },
      {
        heading: "3. Kullanmadığımız çerezler",
        paragraphs: [
          "Vitrin’de pazarlama, reklam veya analitik amaçlı çerez kullanılmaz. Seni başka sitelerde takip eden üçüncü taraf çerezleri yoktur.",
        ],
      },
      {
        heading: "4. Çerezleri yönetme",
        paragraphs: [
          "Tarayıcı ayarlarından çerezleri silebilir veya engelleyebilirsin. Zorunlu oturum çerezini engellersen giriş yapamazsın.",
          `Sorularını ${EMAIL} adresine iletebilirsin.`,
        ],
      },
    ],
  },

  telif: {
    title: "Telif Hakkı ve İçerik Kaldırma",
    sections: [
      {
        heading: "1. Genel ilke",
        paragraphs: [
          "Vitrin’e yalnızca hakları yükleyene ait olan veya yayımlanması için izin alınmış içerikler yüklenebilir. Telif hakkını ihlal eden içerikleri bildirildiğinde inceleyip kaldırırız.",
        ],
      },
      {
        heading: "2. Kaldırma talebi nasıl yapılır?",
        paragraphs: [
          "Hesabın varsa: ilgili parçanın sayfasında “Şikayet et” butonuna bas, neden olarak “Telif ihlali”ni seç ve açıklamaya eserin sana ait olduğunu gösteren bilgileri yaz.",
          `Hesabın yoksa veya birden fazla içerik söz konusuysa: ${EMAIL} adresine e-posta gönder.`,
        ],
      },
      {
        heading: "3. Talepte bulunması gerekenler",
        paragraphs: [
          "Hak sahibinin veya yetkili temsilcisinin adı ve iletişim bilgileri.",
          "İhlal edildiği düşünülen eserin tanımı (eser adı, yayın bilgisi, varsa bağlantısı).",
          "Vitrin’deki ihlal eden içeriğin bağlantısı.",
          "Bilgilerin doğru olduğuna ve hak sahibi ya da yetkili temsilcisi olduğuna dair beyan.",
        ],
      },
      {
        heading: "4. Süreç",
        paragraphs: [
          "Talebi inceledikten sonra içeriği yayından kaldırabilir ve yükleyen kullanıcıyı bilgilendirebiliriz. Tekrarlanan ihlallerde hesap askıya alınabilir.",
          `İçeriğinin haksız yere kaldırıldığını düşünüyorsan gerekçeni ${EMAIL} adresine iletebilirsin.`,
          "Gerçeğe aykırı veya kötü niyetli kaldırma talepleri hukuki sorumluluk doğurabilir.",
        ],
      },
    ],
  },
};

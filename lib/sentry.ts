// Sunucu, edge ve tarayıcıdaki Sentry.init için ortak ayarlar.
// DSN yoksa (yerel geliştirme, Sentry hesabı açılmadan önce) init hiç çağrılmaz.
export const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// KVKK: kişisel veri gönderilmez. SDK v11 varsayılan olarak hepsini toplar; tek tek kapatıyoruz.
// userInfo:false IP adresini de kapatır. Replay entegrasyonu eklenmedi.
export const sentryOptions = {
  dsn: sentryDsn,
  tracesSampleRate: 0.1,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    stackFrameVariables: false,
  },
};

-- Faz 1: profiller, sanatçı iletişim bilgisi, avatar depolama

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('listener', 'artist', 'label', 'admin')),
  username text not null unique check (
    username ~ '^[a-z0-9_.]{3,20}$'
    and username !~ '(^\.|\.$|\.\.)'
    and username not in (
      'admin', 'yonetim', 'giris', 'kayit', 'cikis', 'auth', 'api', 'profil', 'ayarlar',
      'sifre', 'sifremi', 'siralama', 'gecmis', 'kesfet', 'yukle', 'parca', 'parcalar',
      'plak', 'sirket', 'yasal', 'kvkk', 'cerez', 'telif', 'sartlar', 'hakkinda',
      'destek', 'iletisim', 'vitrin', 'favicon.ico', 'robots.txt', 'sitemap.xml'
    )
  ),
  display_name text check (char_length(display_name) <= 50),
  bio text check (char_length(bio) <= 300),
  genres text[] not null default '{}' check (genres <@ array['rap', 'beat']),
  -- Sadece bilinen anahtarlar ve https:// linkler (javascript: vb. engellenir)
  socials jsonb not null default '{}' check (
    jsonb_typeof(socials) = 'object'
    and socials - array['instagram', 'youtube', 'spotify', 'soundcloud'] = '{}'::jsonb
    and not jsonb_path_exists(socials, '$.* ? (!(@ like_regex "^https://[^\\s]+$"))')
  ),
  avatar_path text check (avatar_path like id::text || '/%'),
  created_at timestamptz not null default now()
);

-- Ayrı tablo: profiles herkese açık okunuyor, e-posta orada olsaydı herkes görürdü.
create table public.artist_contacts (
  profile_id uuid primary key references public.profiles on delete cascade,
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254)
);

alter table public.profiles enable row level security;
alter table public.artist_contacts enable row level security;

create policy "profiles herkese açık" on public.profiles
  for select using (true);

create policy "sahibi profilini günceller" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Rol ve id istemciden değiştirilemez: UPDATE sadece belirli sütunlara.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username, display_name, bio, genres, socials, avatar_path)
  on public.profiles to authenticated;

-- Faz 4'te onaylı plak şirketleri için ayrı select politikası eklenecek.
create policy "sanatçı kendi iletişimini yönetir" on public.artist_contacts
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (
    profile_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = profile_id and p.role = 'artist')
  );

revoke all on public.artist_contacts from anon;

-- Kayıtta profil oluştur. Sadece dinleyici/sanatçı seçilebilir.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_role text := new.raw_user_meta_data ->> 'role';
begin
  if new_role is null or new_role not in ('listener', 'artist') then
    raise exception 'Geçersiz rol: %', coalesce(new_role, 'boş');
  end if;

  insert into public.profiles (id, role, username)
  values (new.id, new_role, lower(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Avatarlar: herkes okur, herkes sadece kendi klasörüne yazar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

-- Silme/güncelleme için kendi dosyalarını seçebilmeli (herkese açık okuma public URL ile).
create policy "avatar seç" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatar yükle" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatar güncelle" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatar sil" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

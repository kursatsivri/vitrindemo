-- Faz 2: parçalar, dinleme kaydı, ses/kapak depolama

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.profiles on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  genre text not null check (genre in ('rap', 'beat')),
  audio_path text not null unique check (audio_path like artist_id::text || '/%'),
  cover_path text check (cover_path like artist_id::text || '/%'),
  description text check (char_length(description) <= 500),
  duration_sec int check (duration_sec between 1 and 3600),
  -- Yükleme formundaki "tüm haklar bende" onayı; kanıt olarak saklanır.
  rights_confirmed boolean not null check (rights_confirmed),
  -- hidden/removed: Faz 5 moderasyonu (sadece admin değiştirir)
  status text not null default 'active' check (status in ('active', 'hidden', 'removed')),
  created_at timestamptz not null default now()
);

create index tracks_feed_idx on public.tracks (created_at desc) where status = 'active';
create index tracks_artist_idx on public.tracks (artist_id, created_at desc);

alter table public.tracks enable row level security;

create policy "aktif parçalar herkese açık, sahibi hepsini görür" on public.tracks
  for select using (status = 'active' or artist_id = (select auth.uid()));

create policy "sanatçı kendi parçasını ekler" on public.tracks
  for insert to authenticated
  with check (
    artist_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = artist_id and p.role = 'artist')
  );

create policy "sahibi parçasını günceller" on public.tracks
  for update to authenticated
  using (artist_id = (select auth.uid()))
  with check (artist_id = (select auth.uid()));

create policy "sahibi parçasını siler" on public.tracks
  for delete to authenticated
  using (artist_id = (select auth.uid()));

-- status, id, created_at istemciden yazılamaz; ses dosyası sonradan değiştirilemez.
revoke insert, update, delete on public.tracks from anon, authenticated;
grant insert (artist_id, title, genre, audio_path, cover_path, description, duration_sec, rights_confirmed)
  on public.tracks to authenticated;
grant update (title, genre, cover_path, description) on public.tracks to authenticated;
grant delete on public.tracks to authenticated;

-- Haftada en fazla 3 parça (hafta: pazartesi 00:00, Türkiye saati — sıralamayla aynı takvim).
-- ponytail: silinen parça hakkı geri verir; kötüye kullanılırsa silmeyi soft-delete'e çevir.
create function public.enforce_weekly_upload_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Aynı anda gelen iki yükleme sınırı birlikte aşamasın
  perform pg_advisory_xact_lock(hashtext('upload:' || new.artist_id::text));
  if (
    select count(*) from public.tracks
    where artist_id = new.artist_id
      and created_at >= date_trunc('week', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'
  ) >= 3 then
    raise exception 'Haftalık yükleme sınırı: en fazla 3 parça' using errcode = 'P0001', hint = 'weekly_limit';
  end if;
  return new;
end;
$$;

create trigger tracks_weekly_limit
  before insert on public.tracks
  for each row execute function public.enforce_weekly_upload_limit();

-- Dinleme kaydı: kişi + parça + gün başına tek satır. 30 saniye kuralı sunucuda:
-- start_play başlangıcı yazar, count_play ancak 30 sn geçtiyse sayar.
create table public.plays (
  track_id uuid not null references public.tracks on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  day date not null,
  started_at timestamptz not null default now(),
  counted_at timestamptz,
  primary key (track_id, user_id, day)
);

create index plays_user_idx on public.plays (user_id);

alter table public.plays enable row level security;

create policy "kendi dinlemelerini görür" on public.plays
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Yazma sadece aşağıdaki fonksiyonlarla.
revoke insert, update, delete on public.plays from anon, authenticated;

create function public.start_play(p_track uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.plays (track_id, user_id, day)
  select p_track, auth.uid(), (now() at time zone 'Europe/Istanbul')::date
  where auth.uid() is not null
    and exists (select 1 from public.tracks t where t.id = p_track and t.status = 'active')
  on conflict do nothing;
$$;

-- ponytail: gece yarısını aşan dinleme (23:59 başla, 00:00 sonrası say) sayılmaz; nadir, önemsiz.
create function public.count_play(p_track uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with updated as (
    update public.plays
    set counted_at = now()
    where track_id = p_track
      and user_id = auth.uid()
      and day = (now() at time zone 'Europe/Istanbul')::date
      and counted_at is null
      and started_at <= now() - interval '30 seconds'
    returning 1
  )
  select exists (select 1 from updated);
$$;

revoke execute on function public.start_play(uuid), public.count_play(uuid) from public, anon;
grant execute on function public.start_play(uuid), public.count_play(uuid) to authenticated;

-- Depolama: herkes dinler/görür (public), sadece sanatçı kendi klasörüne yükler.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('tracks', 'tracks', true, 15728640, array['audio/mpeg', 'audio/mp3']),
  ('covers', 'covers', true, 3145728, array['image/jpeg', 'image/png', 'image/webp']);

create policy "parça/kapak yükle" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('tracks', 'covers')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'artist')
  );

-- Silebilmek için kendi dosyalarını seçebilmeli. Üzerine yazma (update) yok.
create policy "parça/kapak seç" on storage.objects
  for select to authenticated
  using (bucket_id in ('tracks', 'covers') and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "parça/kapak sil" on storage.objects
  for delete to authenticated
  using (bucket_id in ('tracks', 'covers') and (storage.foldername(name))[1] = (select auth.uid())::text);

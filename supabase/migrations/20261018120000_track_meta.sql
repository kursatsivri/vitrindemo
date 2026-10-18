-- Faz 3A: 9 ana tür, etiketler, en iyi an, feat, dış linkler, ses dalgası, profil alanları

-- Türler (SPEC §3). Etiket listeleri sabit; genişletmek = yeni migration.
alter table public.tracks drop constraint tracks_genre_check;
alter table public.tracks add constraint tracks_genre_check check (
  genre in ('rap', 'beat', 'pop', 'arabesk', 'rnb', 'rock', 'electronic', 'acoustic', 'folk')
);

alter table public.profiles drop constraint profiles_genres_check;
alter table public.profiles add constraint profiles_genres_check check (
  genres <@ array['rap', 'beat', 'pop', 'arabesk', 'rnb', 'rock', 'electronic', 'acoustic', 'folk']
);

alter table public.tracks
  -- Alt tür (en fazla 3) ve ruh hali (en fazla 2)
  add column tags text[] not null default '{}' check (
    cardinality(tags) <= 3
    and tags <@ array[
      'trap', 'drill', 'boom_bap', 'melodic_rap', 'arabesk_rap', 'old_school', 'underground',
      'lofi', 'phonk', 'afro', 'jersey_club', 'deep_house', 'slow', 'ballad', 'indie', 'alternative'
    ]
  ),
  add column moods text[] not null default '{}' check (
    cardinality(moods) <= 2
    and moods <@ array['hard', 'emotional', 'chill', 'energetic', 'dark', 'love', 'party']
  ),
  -- "En iyi an": keşfet modunda buradan çalar
  add column hook_sec int not null default 0 check (
    hook_sec >= 0 and (duration_sec is null or hook_sec < duration_sec)
  ),
  -- Beat'ler için "Rapçi/vokal arıyorum"
  add column seeking_vocal boolean not null default false check (not seeking_vocal or genre = 'beat'),
  -- Dış linkler: sadece bilinen anahtarlar ve https (profiles.socials ile aynı kural)
  add column links jsonb not null default '{}' check (
    jsonb_typeof(links) = 'object'
    and links - array['spotify', 'youtube', 'apple_music', 'soundcloud'] = '{}'::jsonb
    and not jsonb_path_exists(links, '$.* ? (!(@ like_regex "^https://[^\\s]+$"))')
  ),
  -- Ses dalgası: 0–100 arası en fazla 200 tepe değeri (yüklemede tarayıcıda çıkarılır)
  add column waveform smallint[] check (
    waveform is null
    or (cardinality(waveform) between 1 and 200 and 0 <= all(waveform) and 100 >= all(waveform))
  );

grant insert (tags, moods, hook_sec, seeking_vocal, links, waveform) on public.tracks to authenticated;
grant update (tags, moods, hook_sec, seeking_vocal, links, waveform) on public.tracks to authenticated;

-- Feat: parçaya sitedeki başka sanatçıları etiketleme (en fazla 3).
-- Etiketlenen sanatçı kendini çıkarabilir (onaysız etiketlemeye karşı).
create table public.track_features (
  track_id uuid not null references public.tracks on delete cascade,
  artist_id uuid not null references public.profiles on delete cascade,
  primary key (track_id, artist_id)
);

create index track_features_artist_idx on public.track_features (artist_id);

alter table public.track_features enable row level security;

-- Parçayı görebilen feat'lerini de görür (tracks RLS'i burada da geçerli).
create policy "görünen parçanın feat'leri" on public.track_features
  for select using (exists (select 1 from public.tracks t where t.id = track_id));

create policy "parça sahibi sanatçı etiketler" on public.track_features
  for insert to authenticated
  with check (
    exists (select 1 from public.tracks t where t.id = track_id and t.artist_id = (select auth.uid()))
    and artist_id <> (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = artist_id and p.role = 'artist')
  );

create policy "parça sahibi veya etiketlenen kaldırır" on public.track_features
  for delete to authenticated
  using (
    artist_id = (select auth.uid())
    or exists (select 1 from public.tracks t where t.id = track_id and t.artist_id = (select auth.uid()))
  );

revoke insert, update, delete on public.track_features from anon, authenticated;
grant insert (track_id, artist_id), delete on public.track_features to authenticated;

-- En fazla 3 feat. (Politika kendi tablosunu sayamaz → trigger.)
create function public.enforce_feature_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('feat:' || new.track_id::text));
  if (select count(*) from public.track_features where track_id = new.track_id) >= 3 then
    raise exception 'Bir parçaya en fazla 3 sanatçı etiketlenebilir' using errcode = 'P0001', hint = 'feature_limit';
  end if;
  return new;
end;
$$;

create trigger track_features_limit
  before insert on public.track_features
  for each row execute function public.enforce_feature_limit();

-- Profil: şehir (il plaka kodu), "keşfedilmeye açığım", öne çıkan parça
alter table public.profiles
  add column city smallint check (city between 1 and 81),
  add column open_to_discovery boolean not null default true,
  add column featured_track_id uuid references public.tracks on delete set null;

create index profiles_featured_track_idx on public.profiles (featured_track_id);
create index profiles_city_idx on public.profiles (city) where city is not null;

grant update (city, open_to_discovery, featured_track_id) on public.profiles to authenticated;

-- Öne çıkan parça sadece kendi parçan olabilir.
drop policy "sahibi profilini günceller" on public.profiles;
create policy "sahibi profilini günceller" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and (
      featured_track_id is null
      or exists (
        select 1 from public.tracks t where t.id = featured_track_id and t.artist_id = (select auth.uid())
      )
    )
  );

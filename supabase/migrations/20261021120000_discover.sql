-- Faz 5: keşfet modu (kaydırma), tercihler, öneri akışı, arama, şehir sayıları (SPEC §4.8–4.10)

-- Yeni sayfa adresleri kullanıcı adı olarak alınamasın
alter table public.profiles drop constraint profiles_username_check;
alter table public.profiles add constraint profiles_username_check check (
  username ~ '^[a-z0-9_.]{3,20}$'
  and username !~ '(^\.|\.$|\.\.)'
  and username not in (
    'admin', 'yonetim', 'giris', 'kayit', 'cikis', 'auth', 'api', 'profil', 'ayarlar',
    'sifre', 'sifremi', 'siralama', 'gecmis', 'kesfet', 'yukle', 'parca', 'parcalar',
    'plak', 'sirket', 'yasal', 'kvkk', 'cerez', 'telif', 'sartlar', 'hakkinda',
    'destek', 'iletisim', 'vitrin', 'favicon.ico', 'robots.txt', 'sitemap.xml',
    'ara', 'sehir', 'tercihler'
  )
);

-- ── Kaydırma: sağ = beğen, sol = geç. Kaydırılan parça bir daha gösterilmez. ──
create table public.swipes (
  user_id uuid not null references public.profiles on delete cascade,
  track_id uuid not null references public.tracks on delete cascade,
  action text not null check (action in ('like', 'skip')),
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);
create index swipes_track_idx on public.swipes (track_id);

alter table public.swipes enable row level security;
create policy "kendi kaydırmalarını görür" on public.swipes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "kendi adına aktif parçayı kaydırır" on public.swipes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_track(track_id));

revoke all on public.swipes from anon, authenticated;
grant select, insert (user_id, track_id, action) on public.swipes to authenticated;

-- ── Tercihler (ilk girişte seçilir; şehir profiles.city'de) ──────────────
create table public.user_preferences (
  user_id uuid primary key references public.profiles on delete cascade,
  genres text[] not null default '{}' check (
    genres <@ array['rap', 'beat', 'pop', 'arabesk', 'rnb', 'rock', 'electronic', 'acoustic', 'folk']
  ),
  tags text[] not null default '{}' check (
    tags <@ array[
      'trap', 'drill', 'boom_bap', 'melodic_rap', 'arabesk_rap', 'old_school', 'underground',
      'lofi', 'phonk', 'afro', 'jersey_club', 'deep_house', 'slow', 'ballad', 'indie', 'alternative'
    ]
  )
);

alter table public.user_preferences enable row level security;
create policy "kendi tercihini yönetir" on public.user_preferences for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.user_preferences from anon, authenticated;
grant select, delete, insert (user_id, genres, tags), update (genres, tags) on public.user_preferences to authenticated;

-- ── Öneri akışı (keşfet modu + "Sana özel") ──────────────────────────────
-- v1 kural tabanlı skor: tercih türü +3, ortak tercih etiketi başına +1, "bunu beğenenler
-- şunu da beğendi" +2, takip edilen sanatçı +2, bu hafta yükselenlerde +2, hiç dinlenmemiş +1,
-- artı 0–1 rastgelelik. Sonucun en az %30'u hesabı 90 günden yeni sanatçılardan (garanti pay).
-- Hariç: kendi parçası, daha önce kaydırılan, aktif olmayan. Girişsizde kişisel kısımlar boş kalır.
-- security definer: izleyicinin tercih/kaydırmasını okur; her sorgu auth.uid() ile sınırlı.
-- ponytail: her istekte hesaplanır; parça sayısı binleri geçince pg_cron ile önceden hesapla.
create function public.discover_feed(
  p_genre text default null,
  p_tag text default null,
  p_mood text default null,
  p_city int default null,
  p_limit int default 20
)
returns table (track_id uuid, score numeric)
language sql
security definer
set search_path = ''
as $$
  with me as (select auth.uid() as uid),
  pref as (
    select coalesce((select genres from public.user_preferences where user_id = (select uid from me)), '{}') as genres,
           coalesce((select tags from public.user_preferences where user_id = (select uid from me)), '{}') as tags
  ),
  co_liked as (
    select distinct l2.track_id
    from public.likes l1
    join public.likes l2 on l2.user_id = l1.user_id
    where l1.track_id in (select l.track_id from public.likes l where l.user_id = (select uid from me))
      and l1.user_id <> (select uid from me)
  ),
  cand as materialized (
    select t.id,
           p.created_at > now() - interval '90 days' as is_new,
           (case when t.genre = any(pref.genres) then 3 else 0 end
            + cardinality(array(select unnest(t.tags) intersect select unnest(pref.tags)))
            + case when t.id in (select s.track_id from co_liked s) then 2 else 0 end
            + case when exists (
                select 1 from public.follows f where f.follower_id = (select uid from me) and f.followee_id = t.artist_id
              ) then 2 else 0 end
            + case when t.id in (select r.track_id from public.rising_live r) then 2 else 0 end
            + case when not exists (
                select 1 from public.plays pl where pl.track_id = t.id and pl.user_id = (select uid from me)
              ) then 1 else 0 end
            + random())::numeric as score
    from public.tracks t
    join public.profiles p on p.id = t.artist_id
    cross join pref
    where t.status = 'active'
      and t.artist_id is distinct from (select uid from me)
      and not exists (select 1 from public.swipes w where w.user_id = (select uid from me) and w.track_id = t.id)
      and (p_genre is null or t.genre = p_genre)
      and (p_tag is null or p_tag = any(t.tags))
      and (p_mood is null or p_mood = any(t.moods))
      and (p_city is null or p.city = p_city)
  ),
  new_pick as (
    select id, score from cand where is_new order by score desc limit ceil(least(p_limit, 50) * 0.3)::int
  ),
  rest as (
    select id, score from cand where id not in (select id from new_pick)
    order by score desc limit least(p_limit, 50) - (select count(*) from new_pick)
  )
  select id, round(score, 3) from (select * from new_pick union all select * from rest) x
  order by score desc;
$$;
revoke execute on function public.discover_feed(text, text, text, int, int) from public;
grant execute on function public.discover_feed(text, text, text, int, int) to anon, authenticated;

-- ── Arama: sadece aktif parçalar ve sanatçılar. En az 2 karakter, en fazla 50 sonuç. ──
-- ponytail: indekssiz ilike; yavaşlarsa pg_trgm. Türkçe İ/ı büyük-küçük eşleşmesi kusurlu olabilir.
create function public.search_pattern(p_q text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when char_length(btrim(coalesce(p_q, ''))) >= 2
    then '%' || replace(replace(replace(btrim(p_q), '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
$$;

create function public.search_tracks(p_q text, p_genre text default null, p_tag text default null, p_city int default null)
returns setof public.tracks
language sql
stable
set search_path = ''
as $$
  select t.* from public.tracks t
  join public.profiles p on p.id = t.artist_id
  where t.status = 'active'
    and (t.title ilike public.search_pattern(p_q)
         or p.username ilike public.search_pattern(p_q)
         or p.display_name ilike public.search_pattern(p_q))
    and (p_genre is null or t.genre = p_genre)
    and (p_tag is null or p_tag = any(t.tags))
    and (p_city is null or p.city = p_city)
  order by t.created_at desc
  limit 50;
$$;

create function public.search_artists(p_q text, p_city int default null)
returns setof public.profiles
language sql
stable
set search_path = ''
as $$
  select p.* from public.profiles p
  where p.role = 'artist'
    and (p.username ilike public.search_pattern(p_q) or p.display_name ilike public.search_pattern(p_q))
    and (p_city is null or p.city = p_city)
  order by p.username
  limit 50;
$$;

-- ── Harita: ildeki sanatçı sayısı ─────────────────────────────────────────
create view public.city_artist_counts as
  select city, count(*)::int as artists from public.profiles
  where role = 'artist' and city is not null group by city;
grant select on public.city_artist_counts to anon, authenticated;

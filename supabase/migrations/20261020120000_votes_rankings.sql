-- Faz 4: oylar, sıralamalar, dönem arşivi, erken keşifçi puanı (SPEC §4.6, §4.7, §4.7.1)
-- Tüm kurallar burada; istemci kontrolleri sadece kullanıcı deneyimi için.

-- Dönem başlangıcı, Türkiye saati: 'week' → pazartesi, 'month' → ayın 1'i
create function public.period_start(p_period text, p_at timestamptz default now())
returns date
language sql
stable
set search_path = ''
as $$
  select (date_trunc(p_period, p_at at time zone 'Europe/Istanbul'))::date;
$$;

-- ── Oylar ─────────────────────────────────────────────────────────────────
-- Yazma yalnızca cast_vote() ile. counts: hesap 7 günden eskiyse (oy anında).
-- votes_before: oy anında parçanın tüm zamanlar sayılan oyu → erken oy ölçüsü (§4.7.1).
create table public.votes (
  voter_id uuid not null references public.profiles on delete cascade,
  track_id uuid not null references public.tracks on delete cascade,
  week_start date not null,
  counts boolean not null,
  votes_before int not null check (votes_before >= 0),
  created_at timestamptz not null default now(),
  primary key (voter_id, track_id, week_start)  -- aynı parçaya haftada 1 oy
);
create index votes_track_idx on public.votes (track_id, created_at);
create index votes_voter_idx on public.votes (voter_id, created_at desc);

alter table public.votes enable row level security;
create policy "kendi oylarını görür" on public.votes for select to authenticated
  using (voter_id = (select auth.uid()));
revoke all on public.votes from anon, authenticated;
grant select on public.votes to authenticated;

-- Oy ver. Dönüş: oy sıralamada sayılıyor mu (yeni hesapta false).
-- Hata ipuçları (hint): auth, role, not_found, own_track, not_listened, already_voted, rate_limit
create function public.cast_vote(p_track uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_created timestamptz;
  v_week date := public.period_start('week');
  v_counts boolean;
  v_before int;
begin
  if v_uid is null then
    raise exception 'Oy vermek için giriş yap' using errcode = 'P0001', hint = 'auth';
  end if;
  -- Aynı kişinin eşzamanlı çağrıları hız sınırını birlikte aşamasın
  perform pg_advisory_xact_lock(hashtext('vote:' || v_uid::text));
  select role, created_at into v_role, v_created from public.profiles where id = v_uid;
  if coalesce(v_role, '') not in ('listener', 'artist') then
    raise exception 'Bu hesap türü oy veremez' using errcode = 'P0001', hint = 'role';
  end if;
  if not exists (select 1 from public.tracks t where t.id = p_track and t.status = 'active') then
    raise exception 'Parça bulunamadı' using errcode = 'P0001', hint = 'not_found';
  end if;
  if exists (select 1 from public.tracks t where t.id = p_track and t.artist_id = v_uid)
     or exists (select 1 from public.track_features f where f.track_id = p_track and f.artist_id = v_uid) then
    raise exception 'Kendi parçana oy veremezsin' using errcode = 'P0001', hint = 'own_track';
  end if;
  if not exists (
    select 1 from public.plays p where p.track_id = p_track and p.user_id = v_uid and p.counted_at is not null
  ) then
    raise exception 'Oy için parçayı en az 30 saniye dinlemelisin' using errcode = 'P0001', hint = 'not_listened';
  end if;
  if exists (select 1 from public.votes v where v.voter_id = v_uid and v.track_id = p_track and v.week_start = v_week) then
    raise exception 'Bu parçaya bu hafta zaten oy verdin' using errcode = 'P0001', hint = 'already_voted';
  end if;
  if (select count(*) from public.votes where voter_id = v_uid and created_at > now() - interval '1 minute') >= 5
  or (select count(*) from public.votes where voter_id = v_uid and created_at > now() - interval '1 day') >= 50 then
    raise exception 'Çok hızlı oy veriyorsun' using errcode = 'P0001', hint = 'rate_limit';
  end if;

  v_counts := v_created <= now() - interval '7 days';
  -- ponytail: farklı kişilerin eşzamanlı oyları aynı votes_before'u görebilir; erken eşiği için önemsiz.
  select count(*) into v_before from public.votes where track_id = p_track and counts;
  insert into public.votes (voter_id, track_id, week_start, counts, votes_before)
  values (v_uid, p_track, v_week, v_counts, v_before);
  return v_counts;
end;
$$;
revoke execute on function public.cast_vote(uuid) from public, anon;
grant execute on function public.cast_vote(uuid) to authenticated;

-- Parça başına toplam sayılan oy (kim oy verdi sızmaz; sahibi postgres, RLS'siz okur).
create view public.track_vote_totals as
  select track_id, count(*)::int as votes from public.votes where counts group by track_id;
grant select on public.track_vote_totals to anon, authenticated;

-- ── Sıralama ──────────────────────────────────────────────────────────────
-- Dönemdeki sıralama: skor = sayılan oy; eşitlikte son oyu daha erken alan üstte.
-- rank_all genel, rank_genre tür içi, rank_city sanatçının güncel şehri içi (şehir yoksa null).
-- ponytail: her çağrıda hesaplanır; oy hacmi büyürse 15 dk'da bir yenilenen materialized view'a çevir.
create function public.compute_ranking(p_period text, p_start date)
returns table (
  track_id uuid, artist_id uuid, genre text, city smallint,
  score int, last_vote_at timestamptz,
  rank_all int, rank_genre int, rank_city int
)
language sql
stable
security definer
set search_path = ''
as $$
  with scored as (
    select v.track_id, t.artist_id, t.genre, p.city,
           count(*)::int as score, max(v.created_at) as last_vote_at
    from public.votes v
    join public.tracks t on t.id = v.track_id and t.status = 'active'
    join public.profiles p on p.id = t.artist_id
    where v.counts and public.period_start(p_period, v.created_at) = p_start
    group by v.track_id, t.artist_id, t.genre, p.city
  )
  select s.track_id, s.artist_id, s.genre, s.city, s.score, s.last_vote_at,
         (rank() over (order by s.score desc, s.last_vote_at))::int,
         (rank() over (partition by s.genre order by s.score desc, s.last_vote_at))::int,
         case when s.city is not null
              then (rank() over (partition by s.city order by s.score desc, s.last_vote_at))::int end
  from scored s;
$$;

-- Canlı: bu hafta + bu ay
create view public.ranking_live with (security_invoker = true) as
  select 'week'::text as period, public.period_start('week') as period_start, r.*
  from public.compute_ranking('week', public.period_start('week')) r
  union all
  select 'month', public.period_start('month'), r.*
  from public.compute_ranking('month', public.period_start('month')) r;
grant select on public.ranking_live to anon, authenticated;

-- Yükselenler: bu hafta, hesabı 90 günden yeni sanatçıların parçaları
create view public.rising_live with (security_invoker = true) as
  select r.* from public.compute_ranking('week', public.period_start('week')) r
  join public.profiles p on p.id = r.artist_id
  where p.created_at > now() - interval '90 days';
grant select on public.rising_live to anon, authenticated;

-- Dönem bitince dondurulmuş liste. Kimse istemciden yazamaz.
create table public.ranking_snapshots (
  period text not null check (period in ('week', 'month')),
  period_start date not null,
  track_id uuid not null references public.tracks on delete cascade,
  artist_id uuid not null references public.profiles on delete cascade,
  genre text not null,
  city smallint,
  score int not null,
  last_vote_at timestamptz not null,
  rank_all int not null,
  rank_genre int not null,
  rank_city int,
  primary key (period, period_start, track_id)
);
create index ranking_snapshots_artist_idx on public.ranking_snapshots (artist_id);

alter table public.ranking_snapshots enable row level security;
create policy "arşiv herkese açık" on public.ranking_snapshots for select using (true);
revoke all on public.ranking_snapshots from anon, authenticated;
grant select on public.ranking_snapshots to anon, authenticated;

-- Tek okuma API'si: arşiv varsa arşiv, yoksa canlı. p_city verilirse şehir sırası,
-- yoksa p_genre verilirse tür sırası, yoksa genel sıra.
create function public.ranking(p_period text, p_start date, p_genre text default null, p_city int default null)
returns table (
  rank int, track_id uuid, artist_id uuid, genre text, city smallint,
  score int, last_vote_at timestamptz, archived boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with src as (
    select s.track_id, s.artist_id, s.genre, s.city, s.score, s.last_vote_at,
           s.rank_all, s.rank_genre, s.rank_city, true as archived
    from public.ranking_snapshots s where s.period = p_period and s.period_start = p_start
    union all
    select r.*, false
    from public.compute_ranking(p_period, p_start) r
    where not exists (select 1 from public.ranking_snapshots s where s.period = p_period and s.period_start = p_start)
  )
  select case when p_city is not null then rank_city when p_genre is not null then rank_genre else rank_all end,
         track_id, artist_id, genre, city, score, last_vote_at, archived
  from src
  where (p_genre is null or genre = p_genre) and (p_city is null or city = p_city)
  order by 1;
$$;

-- ── Erken keşifçi puanı ("Ben demiştim") ──────────────────────────────────
-- Parça haftalık/aylık tür listesinde ilk 10'a girince, ona daha önce votes_before < 50 iken
-- sayılan oy verenler puan alır: < 10 → 3, < 25 → 2, < 50 → 1. Parça başına kişiye bir kez.
create table public.ear_points (
  user_id uuid not null references public.profiles on delete cascade,
  track_id uuid not null references public.tracks on delete cascade,
  points smallint not null check (points between 1 and 3),
  period text not null,
  period_start date not null,
  awarded_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

alter table public.ear_points enable row level security;
create policy "kulak puanları herkese açık" on public.ear_points for select using (true);
revoke all on public.ear_points from anon, authenticated;
grant select on public.ear_points to anon, authenticated;

-- "En iyi kulaklar": aylık toplam (Türkiye saati). Tüm zamanlar = user_id üzerinden toplam.
create view public.ear_leaderboard with (security_invoker = true) as
  select user_id, public.period_start('month', awarded_at) as month_start, sum(points)::int as points
  from public.ear_points group by 1, 2;
grant select on public.ear_leaderboard to anon, authenticated;

-- ── Arşiv ─────────────────────────────────────────────────────────────────
-- Bitmiş ama arşivlenmemiş her hafta/ayı dondurur, kulak puanlarını dağıtır.
-- Idempotent: kaçan çalışma (uyuyan proje) sonraki seferde telafi edilir. Dönüş: arşivlenen dönem sayısı.
create function public.archive_finished_periods()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  n int := 0;
begin
  for p in
    select distinct x.period, public.period_start(x.period, v.created_at) as period_start
    from public.votes v cross join (values ('week'), ('month')) as x(period)
    where public.period_start(x.period, v.created_at) < public.period_start(x.period)
      and not exists (
        select 1 from public.ranking_snapshots s
        where s.period = x.period and s.period_start = public.period_start(x.period, v.created_at)
      )
  loop
    insert into public.ranking_snapshots
      (period, period_start, track_id, artist_id, genre, city, score, last_vote_at, rank_all, rank_genre, rank_city)
    select p.period, p.period_start, r.* from public.compute_ranking(p.period, p.period_start) r;

    insert into public.ear_points (user_id, track_id, points, period, period_start)
    select v.voter_id, v.track_id,
           case when v.votes_before < 10 then 3 when v.votes_before < 25 then 2 else 1 end,
           p.period, p.period_start
    from public.ranking_snapshots s
    join public.votes v on v.track_id = s.track_id
    where s.period = p.period and s.period_start = p.period_start and s.rank_genre <= 10
      and v.counts and v.votes_before < 50
      and public.period_start(p.period, v.created_at) <= p.period_start
    on conflict do nothing;

    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function public.archive_finished_periods() from public, anon, authenticated;

-- Her gün 00:00 Türkiye (= 21:00 UTC; İstanbul UTC+3 sabit, yaz saati yok).
-- Pazartesi ve ayın 1'inde yeni biten dönemi yakalar, diğer günler boş döner.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('archive_rankings', '0 21 * * *', $$select public.archive_finished_periods()$$);

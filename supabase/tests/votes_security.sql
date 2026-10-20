-- Faz 4 güvenlik testi: oy kuralları, sıralama, arşiv, erken keşifçi puanı.
-- Her şey transaction içinde, sonunda rollback: veritabanında iz bırakmaz.
-- Bir kontrol başarısız olursa 'FAIL: ...' hatası fırlatır; sonunda 'OK' satırı döner.
begin;

-- a: sanatçı (İzmir) · c: sanatçı, t1'de feat · b/e/f: eski dinleyici · n: yeni hesap · l: keşifçi · d: admin
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '{"role":"artist","username":"test_oy_a"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '{"role":"listener","username":"test_oy_b"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local', '{"role":"artist","username":"test_oy_c"}'),
  ('00000000-0000-0000-0000-00000000000d', 'd@test.local', '{"role":"listener","username":"test_oy_d"}'),
  ('00000000-0000-0000-0000-00000000000e', 'e@test.local', '{"role":"listener","username":"test_oy_e"}'),
  ('00000000-0000-0000-0000-00000000000f', 'f@test.local', '{"role":"listener","username":"test_oy_f"}'),
  ('00000000-0000-0000-0000-000000000010', 'n@test.local', '{"role":"listener","username":"test_oy_n"}'),
  ('00000000-0000-0000-0000-000000000011', 'l@test.local', '{"role":"listener","username":"test_oy_l"}');

-- Kayıt akışı keşifçi/admin açmaz; rolleri doğrudan verilir.
update public.profiles set created_at = now() - interval '30 days' where id <> '00000000-0000-0000-0000-000000000010';
update public.profiles set role = 'label' where id = '00000000-0000-0000-0000-000000000011';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000d';
update public.profiles set city = 35, created_at = now() - interval '200 days' where id = '00000000-0000-0000-0000-00000000000a';

-- Parçalar eski tarihli (haftalık yükleme sınırına takılmasın). t3 gizli, t4 pop, t7 c'nin (şehirsiz).
insert into public.tracks (id, artist_id, title, genre, audio_path, rights_confirmed, status, created_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'T1', 'rap', '00000000-0000-0000-0000-00000000000a/1.mp3', true, 'active', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', 'T2', 'rap', '00000000-0000-0000-0000-00000000000a/2.mp3', true, 'active', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-00000000000a', 'T3', 'rap', '00000000-0000-0000-0000-00000000000a/3.mp3', true, 'hidden', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-00000000000a', 'T4', 'pop', '00000000-0000-0000-0000-00000000000a/4.mp3', true, 'active', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-00000000000a', 'T5', 'rap', '00000000-0000-0000-0000-00000000000a/5.mp3', true, 'active', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-00000000000a', 'T6', 'rap', '00000000-0000-0000-0000-00000000000a/6.mp3', true, 'active', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000c', 'T7', 'rap', '00000000-0000-0000-0000-00000000000c/1.mp3', true, 'active', now() - interval '30 days');
-- 8 dolgu rap parçası (ilk 10 sınırını test etmek için)
insert into public.tracks (id, artist_id, title, genre, audio_path, rights_confirmed, created_at)
select ('00000000-0000-0000-0000-0000000000b' || i)::uuid, '00000000-0000-0000-0000-00000000000a', 'Dolgu ' || i, 'rap',
       '00000000-0000-0000-0000-00000000000a/b' || i || '.mp3', true, now() - interval '30 days'
from generate_series(1, 8) i;

insert into public.track_features (track_id, artist_id)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000c');

-- Dinlemeler: b t1/t2/t3'ü saydırdı, t4'ü başlattı ama 30 sn dolmadı; e 6 parça saydırdı; diğerleri t1
insert into public.plays (track_id, user_id, day, counted_at)
select t::uuid, u::uuid, current_date, now() from (values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000c'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000d'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000e'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000e'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-00000000000e'),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-00000000000e'),
  ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-00000000000e'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000e'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000f')
) as x(t, u);
insert into public.plays (track_id, user_id, day, counted_at)
values ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-00000000000b', current_date, null);

-- Beklenen hata ipucuyla reddedilmeli (hint null → herhangi bir hata yeter)
create function pg_temp.expect_fail(p_stmt text, p_hint text default null)
returns void
language plpgsql
as $$
declare h text;
begin
  begin
    execute p_stmt;
  exception when others then
    get stacked diagnostics h = pg_exception_hint;
    if p_hint is not null and h is distinct from p_hint then
      raise exception 'FAIL: beklenen hata % ama "%" -> %', p_hint, coalesce(nullif(h, ''), sqlerrm), p_stmt;
    end if;
    return;
  end;
  raise exception 'FAIL: izin verilmemeliydi -> %', p_stmt;
end;
$$;
grant execute on function pg_temp.expect_fail(text, text) to authenticated, anon;

-- ── Dinleyici B: geçerli oy + atlatma denemeleri ──────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$
declare
  a constant text := '00000000-0000-0000-0000-00000000000a';
  b constant text := '00000000-0000-0000-0000-00000000000b';
  t1 constant text := '00000000-0000-0000-0000-0000000000a1';
  t3 constant text := '00000000-0000-0000-0000-0000000000a3';
  t4 constant text := '00000000-0000-0000-0000-0000000000a4';
  t5 constant text := '00000000-0000-0000-0000-0000000000a5';
begin
  if not public.cast_vote(t1::uuid) then raise exception 'FAIL: eski hesabın oyu sayılmalıydı'; end if;

  perform pg_temp.expect_fail(format('select public.cast_vote(%L)', t1), 'already_voted');
  perform pg_temp.expect_fail(format('select public.cast_vote(%L)', t3), 'not_found');     -- gizli parça
  perform pg_temp.expect_fail(format('select public.cast_vote(%L)', t4), 'not_listened');  -- 30 sn dolmadı
  perform pg_temp.expect_fail(format('select public.cast_vote(%L)', t5), 'not_listened');  -- hiç dinlemedi
  -- Doğrudan yazma: oy, arşiv, kulak puanı; arşivi elle tetikleme
  perform pg_temp.expect_fail(format('insert into public.votes (voter_id, track_id, week_start, counts, votes_before) values (%L, %L, current_date - 7, true, 0)', b, t5));
  perform pg_temp.expect_fail('update public.votes set counts = true');
  perform pg_temp.expect_fail('delete from public.votes');
  perform pg_temp.expect_fail('truncate public.votes');
  perform pg_temp.expect_fail(format('insert into public.ranking_snapshots (period, period_start, track_id, artist_id, genre, score, last_vote_at, rank_all, rank_genre) values (%L, current_date, %L, %L, %L, 999, now(), 1, 1)', 'week', t1, a, 'rap'));
  perform pg_temp.expect_fail('update public.ranking_snapshots set score = 999');
  perform pg_temp.expect_fail('delete from public.ranking_snapshots');
  perform pg_temp.expect_fail(format('insert into public.ear_points (user_id, track_id, points, period, period_start) values (%L, %L, 3, %L, current_date)', b, t1, 'week'));
  perform pg_temp.expect_fail('update public.ear_points set points = 3');
  perform pg_temp.expect_fail('select public.archive_finished_periods()');
end $$;

-- Sanatçı A (kendi parçası) ve C (feat) oy veremez
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select pg_temp.expect_fail($$select public.cast_vote('00000000-0000-0000-0000-0000000000a1')$$, 'own_track');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select pg_temp.expect_fail($$select public.cast_vote('00000000-0000-0000-0000-0000000000a1')$$, 'own_track');

-- Keşifçi L ve admin D oy veremez
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000011","role":"authenticated"}';
select pg_temp.expect_fail($$select public.cast_vote('00000000-0000-0000-0000-0000000000a1')$$, 'role');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select pg_temp.expect_fail($$select public.cast_vote('00000000-0000-0000-0000-0000000000a1')$$, 'role');

-- Yeni hesap N: oy kaydedilir ama sayılmaz; başkasının oyunu göremez
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000010","role":"authenticated"}';
do $$
begin
  if public.cast_vote('00000000-0000-0000-0000-0000000000a1') then
    raise exception 'FAIL: 7 günden yeni hesabın oyu sayıldı';
  end if;
  if (select count(*) from public.votes) <> 1 then raise exception 'FAIL: başkasının oylarını görüyor'; end if;
end $$;

-- Dinleyici E: dakikada 5 oy, 6. reddedilir
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}';
do $$
declare t text;
begin
  foreach t in array array['a1', 'a2', 'a4', 'a5', 'a6'] loop
    perform public.cast_vote(('00000000-0000-0000-0000-0000000000' || t)::uuid);
  end loop;
  perform pg_temp.expect_fail($q$select public.cast_vote('00000000-0000-0000-0000-0000000000c1')$q$, 'rate_limit');
end $$;

-- Dinleyici F: yeni sanatçı C'nin parçasına oy (yükselenler için)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000f","role":"authenticated"}';
select public.cast_vote('00000000-0000-0000-0000-0000000000c1');

-- Ziyaretçi: oy veremez, sıralamayı okur
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select pg_temp.expect_fail($$select public.cast_vote('00000000-0000-0000-0000-0000000000a1')$$);
select pg_temp.expect_fail('select 1 from public.votes');  -- kim oy verdi görünmez
do $$
declare r record;
begin
  -- Bu hafta t1: b + e sayılır, n sayılmaz → 2
  select * into r from public.ranking_live where period = 'week' and track_id = '00000000-0000-0000-0000-0000000000a1';
  if r.score is distinct from 2 then raise exception 'FAIL: canlı skor % (2 olmalı)', r.score; end if;
  if (select votes from public.track_vote_totals where track_id = '00000000-0000-0000-0000-0000000000a1') is distinct from 2 then
    raise exception 'FAIL: toplam oy yanlış';
  end if;
  -- Yükselenler: sadece 90 günden yeni sanatçı C'nin parçası (A 200 günlük)
  if (select array_agg(track_id) from public.rising_live) is distinct from array['00000000-0000-0000-0000-0000000000c1'::uuid] then
    raise exception 'FAIL: yükselenler yanlış: %', (select array_agg(track_id) from public.rising_live);
  end if;
end $$;

-- ── Geçen hafta (postgres olarak geri tarihli oylar) → arşiv ve kulak puanı ──
reset role;
do $$
declare
  lw date := public.period_start('week') - 7;
  base timestamptz := (lw::timestamp + interval '12 hours') at time zone 'Europe/Istanbul';
  b constant uuid := '00000000-0000-0000-0000-00000000000b';
  e constant uuid := '00000000-0000-0000-0000-00000000000e';
  f constant uuid := '00000000-0000-0000-0000-00000000000f';
  n constant uuid := '00000000-0000-0000-0000-000000000010';
  t1 constant uuid := '00000000-0000-0000-0000-0000000000a1';
  t2 constant uuid := '00000000-0000-0000-0000-0000000000a2';
  t4 constant uuid := '00000000-0000-0000-0000-0000000000a4';
  t5 constant uuid := '00000000-0000-0000-0000-0000000000a5';
  t6 constant uuid := '00000000-0000-0000-0000-0000000000a6';
  t7 constant uuid := '00000000-0000-0000-0000-0000000000c1';
  k int; r record;
begin
  insert into public.votes (voter_id, track_id, week_start, counts, votes_before, created_at) values
    (n, t1, lw, false, 0, base),                       -- yeni hesap: sayılmaz, puan yok
    (b, t1, lw, true, 0, base + interval '1 min'),     -- 3 puan
    (e, t1, lw, true, 12, base + interval '2 min'),    -- 2 puan
    (f, t1, lw, true, 30, base + interval '3 min'),    -- 1 puan
    (b, t2, lw, true, 60, base + interval '4 min'),    -- erken değil
    (e, t2, lw, true, 49, base + interval '5 min'),    -- 1 puan
    (f, t2, lw, true, 50, base + interval '6 min'),    -- sınır: puan yok
    (b, t5, lw, true, 50, base + interval '7 min'),
    (e, t5, lw, true, 51, base + interval '8 min'),
    (f, t4, lw, true, 0, base + interval '9 min'),     -- pop #1 → 3 puan
    (b, t6, lw, true, 0, base + interval '20 min'),    -- rap #12 → puan yok
    (e, t7, lw, true, 0, base + interval '21 min');    -- rap #13, şehirsiz
  insert into public.votes (voter_id, track_id, week_start, counts, votes_before, created_at)
  select f, ('00000000-0000-0000-0000-0000000000b' || i)::uuid, lw, true, 50, base + make_interval(mins => 9 + i)
  from generate_series(1, 8) i;

  k := public.archive_finished_periods();
  if k < 1 then raise exception 'FAIL: geçen hafta arşivlenmedi'; end if;
  if exists (select 1 from public.ranking_snapshots where period = 'week' and period_start = public.period_start('week')) then
    raise exception 'FAIL: cari hafta arşivlendi';
  end if;

  -- Rap: t1 3 oy, t2 3 oy (daha geç), t5 2, dolgular 1'er (b1–b8), t6, t7
  select rank_all, rank_genre, rank_city, score into r from public.ranking_snapshots where period = 'week' and period_start = lw and track_id = t1;
  if r.score is distinct from 3 or r.rank_all <> 1 or r.rank_genre <> 1 or r.rank_city <> 1 then
    raise exception 'FAIL: t1 sırası yanlış (%)', r;
  end if;
  select rank_all, rank_genre into r from public.ranking_snapshots where period = 'week' and period_start = lw and track_id = t2;
  if r.rank_all <> 2 or r.rank_genre <> 2 then raise exception 'FAIL: eşitlikte geç toplayan üstte (%)', r; end if;
  if (select rank_genre from public.ranking_snapshots where period = 'week' and period_start = lw and track_id = t4) <> 1 then
    raise exception 'FAIL: pop türü ayrı sıralanmadı';
  end if;
  if (select rank_genre from public.ranking_snapshots where period = 'week' and period_start = lw and track_id = t6) <> 12 then
    raise exception 'FAIL: t6 rap sırası 12 olmalı';
  end if;
  if (select rank_city from public.ranking_snapshots where period = 'week' and period_start = lw and track_id = t7) is not null then
    raise exception 'FAIL: şehirsiz sanatçıya şehir sırası verildi';
  end if;

  -- Kulak puanları: b 3 (t1), e 2+1, f 1+3 (t4); n ve eşik dışı oylar yok
  if (select count(*) from public.ear_points) <> 5 then
    raise exception 'FAIL: kulak puanı satır sayısı %', (select count(*) from public.ear_points);
  end if;
  if (select sum(points) from public.ear_leaderboard where user_id = b) <> 3 then raise exception 'FAIL: b puanı'; end if;
  if (select sum(points) from public.ear_leaderboard where user_id = e) <> 3 then raise exception 'FAIL: e puanı'; end if;
  if (select sum(points) from public.ear_leaderboard where user_id = f) <> 4 then raise exception 'FAIL: f puanı'; end if;
  if exists (select 1 from public.ear_points where user_id = n) then raise exception 'FAIL: yeni hesap puan aldı'; end if;

  -- İkinci çalışma hiçbir şey yapmaz
  k := public.archive_finished_periods();
  if k <> 0 or (select count(*) from public.ear_points) <> 5 then raise exception 'FAIL: arşiv idempotent değil'; end if;

  -- Okuma API'si: arşivden (tür, şehir filtresi) ve canlıdan
  select * into r from public.ranking('week', lw, 'rap') limit 1;
  if r.track_id <> t1 or r.rank <> 1 or not r.archived then raise exception 'FAIL: ranking() arşivi okumadı'; end if;
  if (select count(*) from public.ranking('week', lw, null, 35)) <> 13 then raise exception 'FAIL: şehir filtresi'; end if;
  select * into r from public.ranking('week', public.period_start('week')) limit 1;
  if r.archived or r.track_id <> t1 or r.score <> 2 then raise exception 'FAIL: ranking() canlıyı okumadı'; end if;
end $$;

select 'OK: oy ve sıralama güvenlik kontrolleri geçti' as sonuc;
rollback;

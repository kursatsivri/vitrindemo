-- Faz 7 güvenlik testi: bildirimler, engelleme, şikayet, admin işlemleri, askıya alma, editörün seçimi.
-- Her şey transaction içinde, sonunda rollback: veritabanında iz bırakmaz.
-- Bir kontrol başarısız olursa 'FAIL: ...' hatası fırlatır; sonunda 'OK' satırı döner.
begin;

-- a: sanatçı · b, c: dinleyici (c'yi a engeller) · k: keşifçi (a engeller) · m: admin · r01–r10: oy verenler
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '{"role":"artist","username":"test_md_a"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '{"role":"listener","username":"test_md_b"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local', '{"role":"listener","username":"test_md_c"}'),
  ('00000000-0000-0000-0000-00000000000d', 'k@test.local', '{"role":"listener","username":"test_md_k"}'),
  ('00000000-0000-0000-0000-00000000000e', 'm@test.local', '{"role":"listener","username":"test_md_m"}');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000002' || lpad(i::text, 2, '0'))::uuid, 'r' || i || '@test.local',
       jsonb_build_object('role', 'listener', 'username', 'test_md_r' || lpad(i::text, 2, '0'))
from generate_series(1, 10) i;
update public.profiles set role = 'scout' where id = '00000000-0000-0000-0000-00000000000d';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000e';

insert into public.tracks (id, artist_id, title, genre, audio_path, rights_confirmed, status, created_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Md bir', 'rap', '00000000-0000-0000-0000-00000000000a/1.mp3', true, 'active', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', 'Md iki', 'rap', '00000000-0000-0000-0000-00000000000a/2.mp3', true, 'active', now() - interval '30 days');

-- B, A'yı takip eder → A'ya 'follow'. A'nın yeni parçası → B'ye 'new_track'.
insert into public.follows (follower_id, followee_id) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a');
insert into public.tracks (id, artist_id, title, genre, audio_path, rights_confirmed)
values ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-00000000000a', 'Md üç', 'rap', '00000000-0000-0000-0000-00000000000a/3.mp3', true);

-- a1'e bu hafta 10 sayılan oy → A'ya 'vote_milestone' (10). a2'ye geçen hafta 3 oy → arşivde ilk 10'daysa 'top10'.
insert into public.votes (voter_id, track_id, week_start, counts, votes_before)
select ('00000000-0000-0000-0000-0000000002' || lpad(i::text, 2, '0'))::uuid, '00000000-0000-0000-0000-0000000000a1',
       public.period_start('week'), true, i - 1
from generate_series(1, 10) i;
insert into public.votes (voter_id, track_id, week_start, counts, votes_before, created_at)
select ('00000000-0000-0000-0000-0000000002' || lpad(i::text, 2, '0'))::uuid, '00000000-0000-0000-0000-0000000000a2',
       public.period_start('week', now() - interval '7 days'), true, i - 1, now() - interval '7 days'
from generate_series(1, 3) i;
select public.archive_finished_periods();

-- Keşifçi alarmı: rap, haftada 1+ oy → günlük işte A için 'alert'; ikinci çalışma tekrar üretmez.
insert into public.scout_alerts (scout_id, genre, min_week_votes) values ('00000000-0000-0000-0000-00000000000d', 'rap', 1);
select public.daily_notifications();
select public.daily_notifications();

do $$
declare
  a constant uuid := '00000000-0000-0000-0000-00000000000a';
begin
  if not exists (select 1 from public.notifications where user_id = a and type = 'follow') then raise exception 'FAIL: takip bildirimi yok'; end if;
  if not exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-00000000000b' and type = 'new_track'
                 and track_id = '00000000-0000-0000-0000-0000000000a3') then
    raise exception 'FAIL: takipçiye yeni parça bildirimi yok';
  end if;
  if (select count(*) from public.notifications where user_id = a and type = 'vote_milestone') <> 1 then
    raise exception 'FAIL: oy kilometre taşı bildirimi 1 olmalı';
  end if;
  if exists (select 1 from public.ranking_snapshots where track_id = '00000000-0000-0000-0000-0000000000a2' and period = 'week' and rank_genre <= 10)
     and not exists (select 1 from public.notifications where user_id = a and type = 'top10' and track_id = '00000000-0000-0000-0000-0000000000a2') then
    raise exception 'FAIL: ilk 10 bildirimi yok';
  end if;
  if (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-00000000000d' and type = 'alert' and actor_id = a) <> 1 then
    raise exception 'FAIL: alarm bildirimi tek olmalı';
  end if;
end $$;

create function pg_temp.expect_fail(p_stmt text)
returns void
language plpgsql
as $$
begin
  begin
    execute p_stmt;
  exception when others then
    return;
  end;
  raise exception 'FAIL: izin verilmemeliydi -> %', p_stmt;
end;
$$;
grant execute on function pg_temp.expect_fail(text) to authenticated, anon;

-- ── C, A'yı takip eder; sonra A, C'yi ve K'yi engeller ────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
insert into public.follows (follower_id, followee_id) values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$
begin
  insert into public.blocks (blocker_id, blocked_id) values
    ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c'),
    ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000d');
  perform pg_temp.expect_fail('insert into public.blocks (blocker_id, blocked_id) values (''00000000-0000-0000-0000-00000000000b'', ''00000000-0000-0000-0000-00000000000c'')');
  perform pg_temp.expect_fail('insert into public.blocks (blocker_id, blocked_id) values (''00000000-0000-0000-0000-00000000000a'', ''00000000-0000-0000-0000-00000000000a'')');
  if exists (select 1 from public.follows where follower_id = '00000000-0000-0000-0000-00000000000c') then
    raise exception 'FAIL: engelleyince takip bitmedi';
  end if;
  -- Kendi parçasını beğenmek bildirim üretmez
  insert into public.likes (user_id, track_id) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1');
end $$;

-- ── C (engellenen): yorum ve takip yok; beğenisi bildirim üretmez ─────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
do $$
begin
  perform pg_temp.expect_fail('insert into public.comments (track_id, author_id, body) values (''00000000-0000-0000-0000-0000000000a1'', ''00000000-0000-0000-0000-00000000000c'', ''merhaba'')');
  perform pg_temp.expect_fail('insert into public.follows (follower_id, followee_id) values (''00000000-0000-0000-0000-00000000000c'', ''00000000-0000-0000-0000-00000000000a'')');
  insert into public.likes (user_id, track_id) values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000a1');
  if exists (select 1 from public.blocks) then raise exception 'FAIL: engellenen engel satırını görüyor'; end if;
end $$;

-- Üçüncü kişi (B) kimin kimi engellediğini öğrenemez; engellenen (C) kendisinin engellendiğini görür
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$
begin
  if public.is_blocked('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c') then
    raise exception 'FAIL: üçüncü kişi engel bilgisini görüyor';
  end if;
end $$;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
do $$
begin
  if not public.is_blocked('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c') then
    raise exception 'FAIL: engellenen engeli göremiyor';
  end if;
end $$;

-- K (engellenen keşifçi) ilgi gönderemez
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select pg_temp.expect_fail('select public.send_interest(''00000000-0000-0000-0000-00000000000a'')');

-- ── B: beğeni (iki kez), yorum, şikayet ───────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$
declare
  b constant text := '00000000-0000-0000-0000-00000000000b';
  ok int := 0;
  h text;
begin
  insert into public.likes (user_id, track_id) values (b::uuid, '00000000-0000-0000-0000-0000000000a1');
  delete from public.likes where user_id = b::uuid;
  insert into public.likes (user_id, track_id) values (b::uuid, '00000000-0000-0000-0000-0000000000a1');
  insert into public.comments (track_id, author_id, body) values ('00000000-0000-0000-0000-0000000000a1', b::uuid, 'Efsane parça');

  -- Bildirim istemciden yazılamaz, başkasınınki görünmez
  perform pg_temp.expect_fail(format('insert into public.notifications (user_id, type) values (%L, %L)', b, 'follow'));
  perform pg_temp.expect_fail(format('select public.notify(%L, %L)', b, 'follow'));
  if exists (select 1 from public.notifications where user_id <> b::uuid) then raise exception 'FAIL: başkasının bildirimini görüyor'; end if;

  insert into public.reports (reporter_id, target_type, target_id, reason, details)
  values (b::uuid, 'track', '00000000-0000-0000-0000-0000000000a1', 'copyright', 'Benim beat''im');
  perform pg_temp.expect_fail(format('insert into public.reports (reporter_id, target_type, target_id, reason) values (%L, %L, %L, %L)',
    b, 'track', '00000000-0000-0000-0000-0000000000a1', 'other'));                            -- aynı hedefe ikinci kez
  perform pg_temp.expect_fail(format('insert into public.reports (reporter_id, target_type, target_id, reason) values (%L, %L, %L, %L)',
    b, 'track', '00000000-0000-0000-0000-0000000009a9', 'other'));                            -- olmayan hedef
  perform pg_temp.expect_fail(format('insert into public.reports (reporter_id, target_type, target_id, reason) values (%L, %L, %L, %L)',
    '00000000-0000-0000-0000-00000000000c', 'profile', '00000000-0000-0000-0000-00000000000a', 'fake'));  -- başkası adına
  perform pg_temp.expect_fail('update public.reports set status = ''dismissed''');

  -- Günde 10 şikayet: 1 yapıldı, 9 daha geçer, 10.'su takılır
  for i in 1..10 loop
    begin
      insert into public.reports (reporter_id, target_type, target_id, reason)
      values (b::uuid, 'profile', ('00000000-0000-0000-0000-0000000002' || lpad(i::text, 2, '0'))::uuid, 'fake');
      ok := ok + 1;
    exception when others then
      get stacked diagnostics h = pg_exception_hint;
      if h <> 'rate_limit' then raise exception 'FAIL: beklenmeyen hata %', h; end if;
    end;
  end loop;
  if ok <> 9 then raise exception 'FAIL: günlük şikayet sınırı % (9 olmalı)', ok; end if;

  -- Admin işlemleri kapalı
  perform pg_temp.expect_fail('select public.set_track_status(''00000000-0000-0000-0000-0000000000a1'', ''hidden'')');
  perform pg_temp.expect_fail('select public.admin_delete_comment(gen_random_uuid())');
  perform pg_temp.expect_fail('select public.admin_close_opportunity(gen_random_uuid())');
  perform pg_temp.expect_fail('select public.suspend_user(''00000000-0000-0000-0000-00000000000a'', true)');
  perform pg_temp.expect_fail('select public.resolve_report(gen_random_uuid(), ''dismissed'')');
  perform pg_temp.expect_fail('select public.void_votes(''00000000-0000-0000-0000-000000000201'')');
  perform pg_temp.expect_fail('select public.set_editor_pick(''00000000-0000-0000-0000-0000000000a1'', ''x'')');
  perform pg_temp.expect_fail('select * from public.suspicious_vote_clusters()');
  perform pg_temp.expect_fail('update public.tracks set status = ''hidden'' where id = ''00000000-0000-0000-0000-0000000000a1''');
end $$;

-- ── A: bildirimleri ───────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$
declare n int;
begin
  if (select count(*) from public.notifications where type = 'like') <> 1 then
    raise exception 'FAIL: beğeni bildirimi 1 olmalı (tekrar beğeni, kendi beğenisi, engellenen hariç)';
  end if;
  if (select count(*) from public.notifications where type = 'comment') <> 1 then raise exception 'FAIL: yorum bildirimi yok'; end if;
  if exists (select 1 from public.notifications where actor_id = '00000000-0000-0000-0000-00000000000c' and type <> 'follow') then
    raise exception 'FAIL: engellenenden bildirim geldi';
  end if;
  update public.notifications set read_at = now() where read_at is null;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'FAIL: okundu işaretlenemedi'; end if;
  perform pg_temp.expect_fail('update public.notifications set type = ''follow''');
  perform pg_temp.expect_fail('update public.notifications set user_id = ''00000000-0000-0000-0000-00000000000b''');
  if exists (select 1 from public.reports) then raise exception 'FAIL: başkasının şikayetini görüyor'; end if;
end $$;

-- ── Admin ─────────────────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}';
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-00000000000a';
  t1 constant uuid := '00000000-0000-0000-0000-0000000000a1';
  rid uuid;
  cid uuid;
begin
  if (select count(*) from public.reports where reporter_id = '00000000-0000-0000-0000-00000000000b') <> 10 then
    raise exception 'FAIL: admin şikayetleri göremiyor';
  end if;
  select id into rid from public.reports where target_id = t1;
  perform public.set_track_status(t1, 'hidden');
  if not exists (select 1 from public.tracks where id = t1) then raise exception 'FAIL: admin gizli parçayı göremiyor'; end if;
  perform pg_temp.expect_fail(format('select public.set_track_status(%L, %L)', t1, 'suspended'));
  perform public.resolve_report(rid, 'actioned');
  if (select status from public.reports where id = rid) <> 'actioned' then raise exception 'FAIL: şikayet sonuçlanmadı'; end if;

  select id into cid from public.comments where track_id = t1;
  perform public.admin_delete_comment(cid);
  if exists (select 1 from public.comments where id = cid) then raise exception 'FAIL: yorum silinmedi'; end if;

  perform public.set_track_status(t1, 'active');
  perform public.set_editor_pick(t1, 'Haftanın sürprizi');
  if public.void_votes('00000000-0000-0000-0000-000000000201') < 1 then raise exception 'FAIL: oy geçersiz sayılmadı'; end if;
  if (select votes from public.track_vote_totals where track_id = t1) <> 9 then raise exception 'FAIL: geçersiz oy sayıldı'; end if;
  perform * from public.suspicious_vote_clusters();

  perform pg_temp.expect_fail('select public.suspend_user(''00000000-0000-0000-0000-00000000000e'', true)');  -- admin askıya alınamaz
  perform public.suspend_user(a, true);
  if (select suspended_at from public.profiles where id = a) is null then raise exception 'FAIL: askı işaretlenmedi'; end if;
end $$;

-- Ziyaretçi: askıdaki sanatçının parçaları hiçbir yerde yok; editörün seçimi görünür
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$
begin
  if exists (select 1 from public.tracks where artist_id = '00000000-0000-0000-0000-00000000000a') then raise exception 'FAIL: askıdaki parça görünüyor'; end if;
  if exists (select 1 from public.search_tracks('Md ')) then raise exception 'FAIL: askıdaki parça aramada'; end if;
  if exists (select 1 from public.discover_feed() f where f.track_id = '00000000-0000-0000-0000-0000000000a1') then raise exception 'FAIL: askıdaki parça keşfette'; end if;
  if exists (select 1 from public.ranking_live where artist_id = '00000000-0000-0000-0000-00000000000a') then raise exception 'FAIL: askıdaki parça sıralamada'; end if;
end $$;
select pg_temp.expect_fail('select 1 from public.notifications');
select pg_temp.expect_fail('select 1 from public.blocks');
select pg_temp.expect_fail('select public.is_blocked(''00000000-0000-0000-0000-00000000000a'', ''00000000-0000-0000-0000-00000000000c'')');
select pg_temp.expect_fail('insert into public.reports (reporter_id, target_type, target_id, reason) values (''00000000-0000-0000-0000-00000000000b'', ''track'', ''00000000-0000-0000-0000-0000000000a2'', ''other'')');

-- Admin geri açar → parçalar döner, giriş engeli kalkar
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}';
select public.suspend_user('00000000-0000-0000-0000-00000000000a', false);
reset role;
do $$
begin
  if (select count(*) from public.tracks where artist_id = '00000000-0000-0000-0000-00000000000a' and status = 'active') <> 3 then
    raise exception 'FAIL: geri açınca parçalar dönmedi';
  end if;
  if (select banned_until from auth.users where id = '00000000-0000-0000-0000-00000000000a') is not null then
    raise exception 'FAIL: giriş engeli kalkmadı';
  end if;
  if (select track_id from public.editor_picks where week_start = public.period_start('week')) is distinct from '00000000-0000-0000-0000-0000000000a1' then
    raise exception 'FAIL: editörün seçimi kaydedilmedi';
  end if;
end $$;

select 'OK: moderasyon güvenlik kontrolleri geçti' as sonuc;
rollback;

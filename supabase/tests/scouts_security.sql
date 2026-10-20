-- Faz 6 güvenlik testi: keşifçi başvurusu, favori/not, ilgi → eşleşme, istatistik, arama, alarm, fırsat panosu.
-- Her şey transaction içinde, sonunda rollback: veritabanında iz bırakmaz.
-- Bir kontrol başarısız olursa 'FAIL: ...' hatası fırlatır; sonunda 'OK' satırı döner.
begin;

-- l: başvurup onaylanan keşifçi · p: reddedilen başvuran · a: açık sanatçı (iletişimli)
-- c: ilgiye kapalı sanatçı · d: ilgiyi reddeden sanatçı · x: üçüncü kişi · m: admin · r01–r19: hız sınırı için
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'l@test.local', '{"role":"listener","username":"test_sc_l"}'),
  ('00000000-0000-0000-0000-00000000000b', 'p@test.local', '{"role":"listener","username":"test_sc_p"}'),
  ('00000000-0000-0000-0000-00000000000c', 'a@test.local', '{"role":"artist","username":"test_sc_a"}'),
  ('00000000-0000-0000-0000-00000000000d', 'c@test.local', '{"role":"artist","username":"test_sc_c"}'),
  ('00000000-0000-0000-0000-00000000000e', 'd@test.local', '{"role":"artist","username":"test_sc_d"}'),
  ('00000000-0000-0000-0000-00000000000f', 'x@test.local', '{"role":"listener","username":"test_sc_x"}'),
  ('00000000-0000-0000-0000-000000000010', 'm@test.local', '{"role":"listener","username":"test_sc_m"}');
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000001' || lpad(i::text, 2, '0'))::uuid, 'r' || i || '@test.local',
       jsonb_build_object('role', 'artist', 'username', 'test_sc_r' || lpad(i::text, 2, '0'))
from generate_series(1, 19) i;

-- Kayıt akışı admin açmaz; rol doğrudan verilir.
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-000000000010';
update public.profiles set open_to_discovery = false where id = '00000000-0000-0000-0000-00000000000d';
insert into public.artist_contacts (profile_id, email) values ('00000000-0000-0000-0000-00000000000c', 'menajer.a@test.local');
insert into public.tracks (id, artist_id, title, genre, audio_path, rights_confirmed, status, created_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000c', 'Sc A bir', 'rap', '00000000-0000-0000-0000-00000000000c/1.mp3', true, 'active', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000c', 'Sc A gizli', 'rap', '00000000-0000-0000-0000-00000000000c/2.mp3', true, 'hidden', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000e', 'Sc D bir', 'rap', '00000000-0000-0000-0000-00000000000e/1.mp3', true, 'active', now() - interval '30 days');

-- Reddedilmeli
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

-- ── L başvurur; onaylanana kadar keşifçi özellikleri kapalı ───────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$
declare
  l constant text := '00000000-0000-0000-0000-00000000000a';
  a constant text := '00000000-0000-0000-0000-00000000000c';
begin
  perform public.apply_scout('label', 'Sc Plak', 'https://scplak.test', 'Ayşe Test', 'ayse@scplak.test', 'Yeni yetenek arıyoruz, rap ağırlıklı.');
  perform pg_temp.expect_fail('select public.apply_scout(''label'', ''Sc Plak'', null, ''Ayşe'', ''a@b.co'', ''tekrar başvuru deneme'')');  -- zaten beklemede
  perform pg_temp.expect_fail(format('select public.approve_scout(%L, true)', l));  -- kendini onaylayamaz
  perform pg_temp.expect_fail('update public.scout_applications set status = ''approved''');
  perform pg_temp.expect_fail('update public.profiles set role = ''scout''');
  perform pg_temp.expect_fail(format('insert into public.scout_favorites (scout_id, artist_id) values (%L, %L)', l, a));
  perform pg_temp.expect_fail(format('select public.send_interest(%L)', a));
  perform pg_temp.expect_fail(format(
    'insert into public.opportunities (scout_id, title, seeking, deadline, body) values (%L, %L, %L, current_date + 10, %L)',
    l, 'Sc ilan', 'rapper', 'Drill rapçi arıyoruz, başvurun.'));
  perform pg_temp.expect_fail('select public.scout_search()');
  perform pg_temp.expect_fail(format('insert into public.scout_alerts (scout_id) values (%L)', l));
  perform public.record_profile_view(a::uuid);  -- onaysızken sayılmamalı (aşağıda A'nın istatistiğinde)
end $$;

-- P başvurur; sadece kendi başvurusunu görür. Sanatçı başvuramaz.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$
begin
  perform public.apply_scout('manager', 'Sc Menajerlik', null, 'Can Test', 'can@test.local', 'Sahne sanatçısı arıyorum.');
  if (select count(*) from public.scout_applications) <> 1 then raise exception 'FAIL: başkasının başvurusunu görüyor'; end if;
end $$;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select pg_temp.expect_fail('select public.apply_scout(''producer'', ''Sc Sanatçı'', null, ''Sanatçı'', ''s@test.local'', ''sanatçı başvurusu deneme'')');

-- ── Admin: L onay, P ret ──────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000010","role":"authenticated"}';
do $$
begin
  if (select count(*) from public.scout_applications where user_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')) <> 2 then
    raise exception 'FAIL: admin başvuruları göremiyor';
  end if;
  perform public.approve_scout('00000000-0000-0000-0000-00000000000a', true);
  perform public.approve_scout('00000000-0000-0000-0000-00000000000b', false);
  perform pg_temp.expect_fail('select public.approve_scout(''00000000-0000-0000-0000-00000000000a'', true)');  -- artık beklemede değil
  if (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000a') <> 'scout' then
    raise exception 'FAIL: onaylanan keşifçi olmadı';
  end if;
  if (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000b') <> 'listener' then
    raise exception 'FAIL: reddedilenin rolü değişti';
  end if;
end $$;

-- Reddedilen 30 gün dolmadan tekrar başvuramaz; dinleyici görüntülemesi sayılmaz
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select pg_temp.expect_fail('select public.apply_scout(''manager'', ''Sc Menajerlik'', null, ''Can Test'', ''can@test.local'', ''Tekrar deniyorum burada.'')');
select public.record_profile_view('00000000-0000-0000-0000-00000000000c');

-- ── L (onaylı keşifçi): favori, not, ilgi, arama, alarm, ilan ─────────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$
declare
  l constant text := '00000000-0000-0000-0000-00000000000a';
  a constant text := '00000000-0000-0000-0000-00000000000c';
  c constant text := '00000000-0000-0000-0000-00000000000d';
  d constant text := '00000000-0000-0000-0000-00000000000e';
  x constant text := '00000000-0000-0000-0000-00000000000f';
  n int;
begin
  insert into public.scout_favorites (scout_id, artist_id, note) values (l::uuid, a::uuid, 'Flow çok iyi');
  update public.scout_favorites set note = 'Güncel not' where artist_id = a::uuid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: not güncellenmedi'; end if;
  perform pg_temp.expect_fail(format('insert into public.scout_favorites (scout_id, artist_id) values (%L, %L)', l, x));  -- sanatçı değil
  perform pg_temp.expect_fail(format('insert into public.scout_favorites (scout_id, artist_id) values (%L, %L)', x, a));  -- başkası adına

  perform public.send_interest(a::uuid);
  perform public.send_interest(d::uuid);
  perform pg_temp.expect_fail(format('select public.send_interest(%L)', a));  -- ikinci kez
  perform pg_temp.expect_fail(format('select public.send_interest(%L)', c));  -- ilgiye kapalı
  perform pg_temp.expect_fail(format('select public.send_interest(%L)', x));  -- sanatçı değil
  perform pg_temp.expect_fail(format('insert into public.interests (scout_id, artist_id) values (%L, %L)', l, c));  -- doğrudan yazma yok
  if exists (select 1 from public.my_matches()) then raise exception 'FAIL: kabul edilmeden eşleşme var'; end if;
  if exists (select 1 from public.artist_contacts) then raise exception 'FAIL: keşifçi iletişim tablosunu okuyor'; end if;

  perform public.record_profile_view(a::uuid);
  perform public.record_profile_view(a::uuid);  -- aynı gün ikinci kez tek sayılır

  if not exists (select 1 from public.scout_search() where artist_id = a::uuid) then raise exception 'FAIL: arama sanatçıyı bulmadı'; end if;
  if exists (select 1 from public.scout_search(p_open_only => true) where artist_id = c::uuid) then
    raise exception 'FAIL: "keşfedilmeye açık" filtresi kapalıyı döndürdü';
  end if;
  if exists (select 1 from public.scout_search(p_min_votes => 1) where artist_id = a::uuid) then
    raise exception 'FAIL: oy filtresi oysuz sanatçıyı döndürdü';
  end if;

  for i in 1..10 loop
    insert into public.scout_alerts (scout_id, genre) values (l::uuid, 'rap');
  end loop;
  perform pg_temp.expect_fail(format('insert into public.scout_alerts (scout_id) values (%L)', l));  -- 11. alarm
  perform * from public.alert_matches();

  perform pg_temp.expect_fail(format(
    'insert into public.opportunities (scout_id, title, seeking, deadline, body) values (%L, %L, %L, current_date - 1, %L)',
    l, 'Sc geçmiş', 'rapper', 'Son tarihi geçmiş ilan denemesi.'));
  perform pg_temp.expect_fail(format(
    'insert into public.opportunities (scout_id, title, seeking, deadline, body) values (%L, %L, %L, current_date + 200, %L)',
    l, 'Sc uzak', 'rapper', 'Çok uzak son tarih denemesi.'));
  for i in 1..5 loop
    insert into public.opportunities (scout_id, title, seeking, genre, deadline, body)
    values (l::uuid, 'Sc ilan ' || i, 'rapper', 'rap', current_date + 10, 'Drill rapçi arıyoruz, başvurun.');
  end loop;
  perform pg_temp.expect_fail(format(
    'insert into public.opportunities (scout_id, title, seeking, deadline, body) values (%L, %L, %L, current_date + 10, %L)',
    l, 'Sc ilan 6', 'rapper', 'Altıncı açık ilan denemesi.'));
  update public.opportunities set closed = true where title = 'Sc ilan 5';

  perform pg_temp.expect_fail('select public.cast_vote(''00000000-0000-0000-0000-0000000000a1'')');  -- keşifçi oy veremez
end $$;

-- ── D ilgiyi reddeder ─────────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}';
select public.answer_interest('00000000-0000-0000-0000-00000000000a', false);

-- ── A ilgiyi kabul eder, ilana başvurur ───────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
do $$
declare
  l constant text := '00000000-0000-0000-0000-00000000000a';
  a constant text := '00000000-0000-0000-0000-00000000000c';
  o1 uuid := (select id from public.opportunities where title = 'Sc ilan 1');
  o2 uuid := (select id from public.opportunities where title = 'Sc ilan 2');
  o5 uuid := (select id from public.opportunities where title = 'Sc ilan 5');
  s record;
begin
  if (select count(*) from public.interests) <> 1 then raise exception 'FAIL: sanatçı gelen ilgisini görmüyor'; end if;
  perform public.answer_interest(l::uuid, true);
  perform pg_temp.expect_fail(format('select public.answer_interest(%L, false)', l));  -- cevaplanmış
  if (select email from public.my_matches()) is distinct from 'ayse@scplak.test'
     or (select contact_person from public.my_matches()) is distinct from 'Ayşe Test' then
    raise exception 'FAIL: sanatçı keşifçinin iletişimini görmüyor';
  end if;

  select * into s from public.artist_stats();
  if s.scout_views_week <> 1 then raise exception 'FAIL: keşifçi görüntüleme % (1 olmalı)', s.scout_views_week; end if;

  insert into public.opportunity_applications (opportunity_id, artist_id, track_id, note)
  values (o1, a::uuid, '00000000-0000-0000-0000-0000000000a1', 'Demo parçam');
  perform pg_temp.expect_fail(format('insert into public.opportunity_applications (opportunity_id, artist_id, track_id) values (%L, %L, %L)',
    o1, a, '00000000-0000-0000-0000-0000000000a1'));  -- ilan başına 1
  perform pg_temp.expect_fail(format('insert into public.opportunity_applications (opportunity_id, artist_id, track_id) values (%L, %L, %L)',
    o2, a, '00000000-0000-0000-0000-0000000000a2'));  -- gizli parça
  perform pg_temp.expect_fail(format('insert into public.opportunity_applications (opportunity_id, artist_id, track_id) values (%L, %L, %L)',
    o2, a, '00000000-0000-0000-0000-0000000000e1'));  -- başkasının parçası
  perform pg_temp.expect_fail(format('insert into public.opportunity_applications (opportunity_id, artist_id, track_id) values (%L, %L, %L)',
    o5, a, '00000000-0000-0000-0000-0000000000a1'));  -- kapalı ilan
  perform pg_temp.expect_fail('update public.opportunity_applications set status = ''matched''');
  perform pg_temp.expect_fail(format('select public.review_application(%L, %L, %L)', o1, a, 'matched'));
  perform pg_temp.expect_fail('select public.scout_search()');
  update public.opportunities set closed = true where id = o1;  -- RLS: etkisiz kalmalı
  if exists (select 1 from public.opportunities where id = o1 and closed) then raise exception 'FAIL: sanatçı başkasının ilanını kapattı'; end if;
  if exists (select 1 from public.scout_favorites) then raise exception 'FAIL: sanatçı keşifçinin notunu görüyor'; end if;
end $$;

-- ── X (üçüncü kişi) hiçbir şey görmez ─────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000f","role":"authenticated"}';
do $$
declare o1 uuid := (select id from public.opportunities where title = 'Sc ilan 1');
begin
  if exists (select 1 from public.interests) then raise exception 'FAIL: başkalarının ilgilerini görüyor'; end if;
  if exists (select 1 from public.my_matches()) then raise exception 'FAIL: başkalarının eşleşmesini görüyor'; end if;
  if exists (select 1 from public.scout_favorites) then raise exception 'FAIL: başkasının favorilerini görüyor'; end if;
  if exists (select 1 from public.scout_alerts) then raise exception 'FAIL: başkasının alarmlarını görüyor'; end if;
  if exists (select 1 from public.opportunity_applications) then raise exception 'FAIL: başkalarının başvurularını görüyor'; end if;
  if exists (select 1 from public.alert_matches()) then raise exception 'FAIL: başkasının alarm sonuçlarını görüyor'; end if;
  perform pg_temp.expect_fail(format('insert into public.opportunity_applications (opportunity_id, artist_id, track_id) values (%L, %L, %L)',
    o1, '00000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-0000000000a1'));
  perform pg_temp.expect_fail('select public.send_interest(''00000000-0000-0000-0000-00000000000c'')');
  perform pg_temp.expect_fail('select * from public.profile_views');
end $$;

-- ── L: eşleşme, başvuru değerlendirme, reddedilen ilgi, hız sınırı ────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-00000000000c';
  o1 uuid := (select id from public.opportunities where title = 'Sc ilan 1');
  ok int := 0;
  h text;
begin
  perform pg_temp.expect_fail('select public.send_interest(''00000000-0000-0000-0000-00000000000e'')');  -- reddedilen tekrar gönderilemez
  if (select email from public.my_matches()) is distinct from 'menajer.a@test.local' then
    raise exception 'FAIL: keşifçi eşleştiği sanatçının iletişimini görmüyor';
  end if;
  if (select count(*) from public.opportunity_applications) <> 1 then raise exception 'FAIL: ilan sahibi başvuruyu görmüyor'; end if;
  perform public.review_application(o1, a, 'shortlisted');
  perform pg_temp.expect_fail(format('select public.review_application(%L, %L, %L)', o1, a, 'bogus'));
  perform public.review_application(o1, a, 'matched');
  perform pg_temp.expect_fail(format('select public.review_application(%L, %L, %L)', o1, a, 'declined'));  -- eşleşme kesin
  if (select source from public.interests where artist_id = a) <> 'discover'
     or (select status from public.interests where artist_id = a) <> 'accepted' then
    raise exception 'FAIL: ilan eşleşmesi mevcut ilgiyi bozdu';
  end if;

  -- Bugün 2 ilgi gönderildi (A, D); 18 tane daha geçer, 19.'su günlük sınıra takılır.
  for i in 1..19 loop
    begin
      perform public.send_interest(('00000000-0000-0000-0000-0000000001' || lpad(i::text, 2, '0'))::uuid);
      ok := ok + 1;
    exception when others then
      get stacked diagnostics h = pg_exception_hint;
      if h <> 'rate_limit' then raise exception 'FAIL: beklenmeyen hata %', h; end if;
    end;
  end loop;
  if ok <> 18 then raise exception 'FAIL: günlük ilgi sınırı % (18 olmalı)', ok; end if;
end $$;

-- İlan başvurusundan eşleşme: daha önce reddedilmiş ilgi olsa da iletişim açılır (sanatçı başvurarak onay verdi)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}';
insert into public.opportunity_applications (opportunity_id, artist_id, track_id)
select id, '00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-0000000000e1' from public.opportunities where title = 'Sc ilan 2';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select public.review_application(id, '00000000-0000-0000-0000-00000000000e', 'matched') from public.opportunities where title = 'Sc ilan 2';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}';
do $$
begin
  if (select email from public.my_matches()) is distinct from 'ayse@scplak.test' then
    raise exception 'FAIL: ilan eşleşmesinde iletişim açılmadı';
  end if;
end $$;

-- ── Ziyaretçi ─────────────────────────────────────────────────────────────
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select pg_temp.expect_fail('select 1 from public.interests');
select pg_temp.expect_fail('select 1 from public.scout_favorites');
select pg_temp.expect_fail('select 1 from public.scout_applications');
select pg_temp.expect_fail('select 1 from public.opportunity_applications');
select pg_temp.expect_fail('select public.my_matches()');
select pg_temp.expect_fail('select public.record_profile_view(''00000000-0000-0000-0000-00000000000c'')');
do $$
begin
  if (select count(*) from public.opportunities where title like 'Sc ilan %') <> 5 then raise exception 'FAIL: ilanlar herkese açık değil'; end if;
  if (select org_name from public.scout_profiles where user_id = '00000000-0000-0000-0000-00000000000a') is distinct from 'Sc Plak' then
    raise exception 'FAIL: onaylı keşifçi kimliği görünmüyor';
  end if;
  if exists (select 1 from public.scout_profiles where user_id = '00000000-0000-0000-0000-00000000000b') then
    raise exception 'FAIL: reddedilen keşifçi kimliği görünüyor';
  end if;
end $$;

select 'OK: keşifçi güvenlik kontrolleri geçti' as sonuc;
rollback;

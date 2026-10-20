-- Faz 7 güvenlik testi: haftalık challenge (aday beat, katılım kuralları, sınır istisnası, beatmaker feat'i, kazanan).
-- Her şey transaction içinde, sonunda rollback: veritabanında iz bırakmaz.
-- Katılım pazartesi–cuma açık: test günü hafta sonuysa "katılım reddedilir" dalı denenir.
begin;

-- bm: beatmaker · r1, r2, r3: rapçi · v1–v3: oy veren · m: admin
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'bm@test.local', '{"role":"artist","username":"test_ch_bm"}'),
  ('00000000-0000-0000-0000-00000000000b', 'r1@test.local', '{"role":"artist","username":"test_ch_r1"}'),
  ('00000000-0000-0000-0000-00000000000c', 'r2@test.local', '{"role":"artist","username":"test_ch_r2"}'),
  ('00000000-0000-0000-0000-00000000000d', 'r3@test.local', '{"role":"artist","username":"test_ch_r3"}'),
  ('00000000-0000-0000-0000-00000000000e', 'm@test.local', '{"role":"listener","username":"test_ch_m"}'),
  ('00000000-0000-0000-0000-000000000011', 'v1@test.local', '{"role":"listener","username":"test_ch_v1"}'),
  ('00000000-0000-0000-0000-000000000012', 'v2@test.local', '{"role":"listener","username":"test_ch_v2"}'),
  ('00000000-0000-0000-0000-000000000013', 'v3@test.local', '{"role":"listener","username":"test_ch_v3"}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000e';

-- b1 aday beat, b2 aday değil; r1 bu hafta 3 parça yükledi (haftalık sınır dolu)
insert into public.tracks (id, artist_id, title, genre, audio_path, rights_confirmed, challenge_candidate, created_at) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000a', 'Ch beat', 'beat', '00000000-0000-0000-0000-00000000000a/1.mp3', true, true, now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000000a', 'Ch beat iki', 'beat', '00000000-0000-0000-0000-00000000000a/2.mp3', true, false, now() - interval '30 days');
insert into public.tracks (artist_id, title, genre, audio_path, rights_confirmed)
select '00000000-0000-0000-0000-00000000000b', 'Ch r1 ' || i, 'rap', '00000000-0000-0000-0000-00000000000b/' || i || '.mp3', true
from generate_series(1, 3) i;

-- Geçen haftanın challenge'ı: r2 iki oy, r3 bir oy → kazanan r2. (Katılım kuralı insert'te; geçmiş veri update ile kurulur.)
insert into public.challenges (id, week_start, beat_track_id)
values ('00000000-0000-0000-0000-0000000000c0', public.period_start('week') - 7, '00000000-0000-0000-0000-0000000000b1');
insert into public.tracks (id, artist_id, title, genre, audio_path, rights_confirmed, created_at) values
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000000c', 'Ch r2 eski', 'rap', '00000000-0000-0000-0000-00000000000c/1.mp3', true, now() - interval '7 days'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-00000000000d', 'Ch r3 eski', 'rap', '00000000-0000-0000-0000-00000000000d/1.mp3', true, now() - interval '7 days');
update public.tracks set challenge_id = '00000000-0000-0000-0000-0000000000c0'
where id in ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c3');
insert into public.votes (voter_id, track_id, week_start, counts, votes_before, created_at) values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000c2', public.period_start('week') - 7, true, 0, now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000c2', public.period_start('week') - 7, true, 1, now() - interval '7 days'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-0000000000c3', public.period_start('week') - 7, true, 0, now() - interval '7 days');

do $$
begin
  if public.finish_challenges() < 1 then raise exception 'FAIL: biten challenge kapanmadı'; end if;
  if (select winner_track_id from public.challenges where id = '00000000-0000-0000-0000-0000000000c0')
     is distinct from '00000000-0000-0000-0000-0000000000c2' then
    raise exception 'FAIL: kazanan yanlış';
  end if;
  if public.finish_challenges() <> 0 then raise exception 'FAIL: kapanan challenge tekrar işlendi'; end if;
  if not exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-00000000000c' and type = 'challenge_win')
     or not exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-00000000000a' and type = 'challenge_win') then
    raise exception 'FAIL: kazanan/beatmaker bildirimi yok';
  end if;
  if (select rank from public.challenge_standings('00000000-0000-0000-0000-0000000000c0')
      where track_id = '00000000-0000-0000-0000-0000000000c3') <> 2 then
    raise exception 'FAIL: challenge sıralaması yanlış';
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

-- ── Admin bu haftanın challenge'ını açar ──────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select pg_temp.expect_fail('select public.create_challenge(public.period_start(''week''), ''00000000-0000-0000-0000-0000000000b1'')');  -- admin değil
select pg_temp.expect_fail('insert into public.challenges (week_start, beat_track_id) values (public.period_start(''week''), ''00000000-0000-0000-0000-0000000000b1'')');
update public.tracks set challenge_candidate = true where id = '00000000-0000-0000-0000-0000000000b2';  -- başkasının beat'i: RLS etkisiz bırakır
do $$
begin
  if (select challenge_candidate from public.tracks where id = '00000000-0000-0000-0000-0000000000b2') then
    raise exception 'FAIL: başkasının beat''ini aday yaptı';
  end if;
end $$;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}';
do $$
declare w date := public.period_start('week');
begin
  perform pg_temp.expect_fail(format('select public.create_challenge(%L, %L)', w, '00000000-0000-0000-0000-0000000000b2'));      -- aday değil
  perform pg_temp.expect_fail(format('select public.create_challenge(%L, %L)', w + 1, '00000000-0000-0000-0000-0000000000b1'));  -- pazartesi değil
  perform pg_temp.expect_fail(format('select public.create_challenge(%L, %L)', w - 14, '00000000-0000-0000-0000-0000000000b1')); -- geçmiş hafta
  perform public.create_challenge(w, '00000000-0000-0000-0000-0000000000b1');
  perform pg_temp.expect_fail(format('select public.create_challenge(%L, %L)', w, '00000000-0000-0000-0000-0000000000b1'));      -- aynı hafta
end $$;

-- ── r1 katılır (haftalık sınır dolu olsa da) ──────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$
declare
  cid uuid := (select id from public.challenges where week_start = public.period_start('week'));
  r1 constant text := '00000000-0000-0000-0000-00000000000b';
  open boolean := extract(isodow from now() at time zone 'Europe/Istanbul') <= 5;
  stmt text;
  e1 uuid;
begin
  stmt := format('insert into public.tracks (artist_id, title, genre, audio_path, rights_confirmed, challenge_id) values (%L, %L, %L, %L, true, %L)',
                 r1, 'Ch katılım', 'rap', r1 || '/e1.mp3', cid);
  if not open then
    perform pg_temp.expect_fail(stmt);  -- hafta sonu katılım kapalı
    return;
  end if;
  execute stmt;
  select id into e1 from public.tracks where title = 'Ch katılım';
  if not exists (select 1 from public.track_features where track_id = e1
                 and artist_id = '00000000-0000-0000-0000-00000000000a') then
    raise exception 'FAIL: beatmaker feat olarak eklenmedi';
  end if;
  -- Beatmaker feat'i kaldırılamaz (RLS satırı süzer)
  delete from public.track_features where track_id = e1;
  if not exists (select 1 from public.track_features where track_id = e1) then
    raise exception 'FAIL: beatmaker feat''i kaldırıldı';
  end if;
  perform pg_temp.expect_fail(format('insert into public.tracks (artist_id, title, genre, audio_path, rights_confirmed, challenge_id) values (%L, %L, %L, %L, true, %L)',
    r1, 'Ch ikinci', 'rap', r1 || '/e2.mp3', cid));                                                         -- ikinci katılım
  perform pg_temp.expect_fail(format('insert into public.tracks (artist_id, title, genre, audio_path, rights_confirmed) values (%L, %L, %L, %L, true)',
    r1, 'Ch normal', 'rap', r1 || '/n4.mp3'));                                                              -- normal yükleme sınırı hâlâ dolu
  perform pg_temp.expect_fail(format('insert into public.tracks (artist_id, title, genre, audio_path, rights_confirmed, challenge_id) values (%L, %L, %L, %L, true, %L)',
    r1, 'Ch geçmiş', 'rap', r1 || '/e3.mp3', '00000000-0000-0000-0000-0000000000c0'));                      -- geçmiş challenge
  perform pg_temp.expect_fail(format('update public.tracks set challenge_id = null where id = %L', e1));
end $$;

-- Beatmaker kendi challenge'ına katılamaz, beat ile de katılım olmaz
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$
declare cid uuid := (select id from public.challenges where week_start = public.period_start('week'));
begin
  perform pg_temp.expect_fail(format('insert into public.tracks (artist_id, title, genre, audio_path, rights_confirmed, challenge_id) values (%L, %L, %L, %L, true, %L)',
    '00000000-0000-0000-0000-00000000000a', 'Ch bm', 'rap', '00000000-0000-0000-0000-00000000000a/x.mp3', cid));
end $$;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
do $$
declare cid uuid := (select id from public.challenges where week_start = public.period_start('week'));
begin
  perform pg_temp.expect_fail(format('insert into public.tracks (artist_id, title, genre, audio_path, rights_confirmed, challenge_id) values (%L, %L, %L, %L, true, %L)',
    '00000000-0000-0000-0000-00000000000c', 'Ch beatle', 'beat', '00000000-0000-0000-0000-00000000000c/x.mp3', cid));
end $$;

-- Beatmaker katılıma oy veremez (dinlemiş olsa bile)
reset role;
insert into public.plays (track_id, user_id, day, counted_at)
select id, '00000000-0000-0000-0000-00000000000a', (now() at time zone 'Europe/Istanbul')::date, now()
from public.tracks where title = 'Ch katılım';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$
begin
  if exists (select 1 from public.tracks where title = 'Ch katılım') then
    perform pg_temp.expect_fail(format('select public.cast_vote(%L)', (select id from public.tracks where title = 'Ch katılım')));
  end if;
end $$;

-- Ziyaretçi sıralamayı ve challenge'ları görür
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$
begin
  if (select count(*) from public.challenges where beat_track_id = '00000000-0000-0000-0000-0000000000b1') < 1 then
    raise exception 'FAIL: challenge''lar herkese açık değil';
  end if;
  perform * from public.challenge_standings('00000000-0000-0000-0000-0000000000c0');
end $$;
select pg_temp.expect_fail('select public.finish_challenges()');

select 'OK: challenge güvenlik kontrolleri geçti' as sonuc;
rollback;

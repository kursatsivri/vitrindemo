-- Faz 5 güvenlik testi: kaydırma, tercihler, öneri akışı, arama, şehir sayıları.
-- Her şey transaction içinde, sonunda rollback: veritabanında iz bırakmaz.
-- Bir kontrol başarısız olursa 'FAIL: ...' hatası fırlatır; sonunda 'OK' satırı döner.
begin;

-- a: eski sanatçı (Ankara) · n: yeni sanatçı (İzmir) · b, c: dinleyici
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '{"role":"artist","username":"test_ks_a"}'),
  ('00000000-0000-0000-0000-00000000000e', 'n@test.local', '{"role":"artist","username":"test_ks_n"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '{"role":"listener","username":"test_ks_b"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local', '{"role":"listener","username":"test_ks_c"}');

-- Demo verisi sonuçları etkilemesin: diğer parçalar gizli, diğer profillerin şehri boş (rollback geri alır)
update public.tracks set status = 'hidden' where artist_id not in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000e');
update public.profiles set city = null where id not in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000e');

update public.profiles set created_at = now() - interval '200 days', city = 6 where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set city = 35 where id = '00000000-0000-0000-0000-00000000000e';

insert into public.tracks (id, artist_id, title, genre, tags, audio_path, rights_confirmed, status, created_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Ksf rap bir', 'rap', '{}', '00000000-0000-0000-0000-00000000000a/1.mp3', true, 'active', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', 'Ksf pop iki', 'pop', '{slow}', '00000000-0000-0000-0000-00000000000a/2.mp3', true, 'active', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-00000000000a', 'Ksf gizli pop', 'pop', '{}', '00000000-0000-0000-0000-00000000000a/3.mp3', true, 'hidden', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000e', 'Ksf yeni bir', 'rap', '{}', '00000000-0000-0000-0000-00000000000e/1.mp3', true, 'active', now() - interval '30 days'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000000e', 'Ksf yeni iki', 'rap', '{}', '00000000-0000-0000-0000-00000000000e/2.mp3', true, 'active', now() - interval '30 days');

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

-- ── Dinleyici B: kaydırma ve tercih ───────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$
declare
  b constant text := '00000000-0000-0000-0000-00000000000b';
  c constant text := '00000000-0000-0000-0000-00000000000c';
  t1 constant text := '00000000-0000-0000-0000-0000000000a1';
  t2 constant text := '00000000-0000-0000-0000-0000000000a2';
  t3 constant text := '00000000-0000-0000-0000-0000000000a3';
  n int;
begin
  insert into public.swipes (user_id, track_id, action) values (b::uuid, t1::uuid, 'skip');
  insert into public.user_preferences (user_id, genres, tags) values (b::uuid, '{pop}', '{slow}');

  perform pg_temp.expect_fail(format('insert into public.swipes (user_id, track_id, action) values (%L, %L, %L)', c, t2, 'like'));  -- başkası adına
  perform pg_temp.expect_fail(format('insert into public.swipes (user_id, track_id, action) values (%L, %L, %L)', b, t3, 'like'));  -- gizli parça
  perform pg_temp.expect_fail(format('insert into public.swipes (user_id, track_id, action) values (%L, %L, %L)', b, t1, 'like'));  -- ikinci kez
  perform pg_temp.expect_fail(format('insert into public.swipes (user_id, track_id, action) values (%L, %L, %L)', b, t2, 'love'));  -- geçersiz
  perform pg_temp.expect_fail('update public.swipes set action = ''like''');
  perform pg_temp.expect_fail('delete from public.swipes');
  perform pg_temp.expect_fail('truncate public.swipes');
  perform pg_temp.expect_fail(format('insert into public.user_preferences (user_id, genres) values (%L, %L)', c, '{rap}'));  -- başkası adına
  perform pg_temp.expect_fail('update public.user_preferences set genres = ''{jazz}''');                                    -- liste dışı tür
  perform pg_temp.expect_fail('update public.user_preferences set tags = ''{serbest}''');                                   -- liste dışı etiket
  perform pg_temp.expect_fail(format('update public.user_preferences set user_id = %L', c));                                -- sahiplik değişmez
  perform pg_temp.expect_fail('update public.profiles set username = ''sehir''');                                           -- yeni yasak ad

  -- Akış: kaydırılan (t1) ve gizli (t3) yok; tercih türü pop (t2) en üstte
  if exists (select 1 from public.discover_feed() where track_id in (t1::uuid, t3::uuid)) then
    raise exception 'FAIL: akışta kaydırılmış veya gizli parça var';
  end if;
  if (select track_id from public.discover_feed() limit 1) is distinct from t2::uuid then
    raise exception 'FAIL: tercih edilen tür üstte değil';
  end if;
  select count(*) into n from public.discover_feed(p_genre => 'rap');
  if n <> 2 then raise exception 'FAIL: tür filtresi % parça döndü (2 olmalı)', n; end if;
  select count(*) into n from public.discover_feed(p_city => 35);
  if n <> 2 then raise exception 'FAIL: şehir filtresi % parça döndü (2 olmalı)', n; end if;
end $$;

-- ── Dinleyici C: B'nin verisini göremez; yeni yetenek payı ────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
do $$
declare n int;
begin
  if exists (select 1 from public.swipes) then raise exception 'FAIL: başkasının kaydırmalarını görüyor'; end if;
  if exists (select 1 from public.user_preferences) then raise exception 'FAIL: başkasının tercihini görüyor'; end if;
  update public.user_preferences set genres = '{rap}';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: başkasının tercihini değiştirdi'; end if;

  -- C eski sanatçı A'yı takip eder → A'nın parçaları (+2) yeni sanatçınınkilerden hep yüksek.
  -- 2 sonuçta %30 pay = 1 parça yine de yeni sanatçıdan gelmeli.
  insert into public.follows (follower_id, followee_id) values ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a');
  select count(*) into n from public.discover_feed(p_limit => 2) f
  join public.tracks t on t.id = f.track_id where t.artist_id = '00000000-0000-0000-0000-00000000000e';
  if n <> 1 then raise exception 'FAIL: yeni yetenek payı % (1 olmalı)', n; end if;
  if (select count(*) from public.discover_feed(p_limit => 2)) <> 2 then raise exception 'FAIL: limit uyulmadı'; end if;
end $$;

-- Sanatçı A kendi parçalarını akışta görmez; sahibi olsa da arama gizli parçayı döndürmez
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$
begin
  if exists (select 1 from public.discover_feed() f join public.tracks t on t.id = f.track_id
             where t.artist_id = '00000000-0000-0000-0000-00000000000a') then
    raise exception 'FAIL: sanatçı kendi parçasını akışta görüyor';
  end if;
  if exists (select 1 from public.search_tracks('Ksf gizli')) then raise exception 'FAIL: arama gizli parçayı döndürdü (sahip)'; end if;
end $$;

-- ── Ziyaretçi: akış, arama, harita ────────────────────────────────────────
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select pg_temp.expect_fail('select 1 from public.swipes');
select pg_temp.expect_fail('select 1 from public.user_preferences');
select pg_temp.expect_fail('insert into public.swipes (user_id, track_id, action) values (''00000000-0000-0000-0000-00000000000b'', ''00000000-0000-0000-0000-0000000000a2'', ''like'')');
do $$
declare n int;
begin
  select count(*) into n from public.discover_feed();
  if n <> 4 then raise exception 'FAIL: ziyaretçi akışı % parça (4 olmalı)', n; end if;

  if exists (select 1 from public.search_tracks('Ksf gizli')) then raise exception 'FAIL: arama gizli parçayı döndürdü'; end if;
  select count(*) into n from public.search_tracks('ksf');
  if n <> 4 then raise exception 'FAIL: başlık araması % (4 olmalı)', n; end if;
  select count(*) into n from public.search_tracks('test_ks_n');
  if n <> 2 then raise exception 'FAIL: sanatçı adıyla parça araması % (2 olmalı)', n; end if;
  select count(*) into n from public.search_tracks('ksf', 'pop');
  if n <> 1 then raise exception 'FAIL: arama tür filtresi % (1 olmalı)', n; end if;
  if exists (select 1 from public.search_tracks('%%')) then raise exception 'FAIL: joker karakter kaçırılmadı'; end if;
  if exists (select 1 from public.search_tracks('k')) then raise exception 'FAIL: tek harf araması sonuç döndü'; end if;
  select count(*) into n from public.search_artists('test_ks');
  if n <> 2 then raise exception 'FAIL: sanatçı araması % (2 olmalı, dinleyiciler hariç)', n; end if;
  select count(*) into n from public.search_artists('test_ks', 35);
  if n <> 1 then raise exception 'FAIL: sanatçı şehir filtresi % (1 olmalı)', n; end if;

  if (select artists from public.city_artist_counts where city = 35) is distinct from 1 then
    raise exception 'FAIL: şehir sanatçı sayısı yanlış';
  end if;
end $$;

select 'OK: keşfet ve arama güvenlik kontrolleri geçti' as sonuc;
rollback;

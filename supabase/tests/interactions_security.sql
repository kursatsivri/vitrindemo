-- Faz 3B güvenlik testi: beğeni, kaydet, takip, yorum (küfür/spam/sahip silme), geri bildirim puanı.
-- Her şey transaction içinde, sonunda rollback: veritabanında iz bırakmaz.
-- Bir kontrol başarısız olursa 'FAIL: ...' hatası fırlatır; sonunda 'OK' satırı döner.
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '{"role":"artist","username":"test_ia_a"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '{"role":"listener","username":"test_ia_b"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local', '{"role":"listener","username":"test_ia_c"}'),
  ('00000000-0000-0000-0000-00000000000d', 'd@test.local', '{"role":"listener","username":"test_ia_d"}'),
  ('00000000-0000-0000-0000-00000000000e', 'e@test.local', '{"role":"listener","username":"test_ia_e"}'),
  ('00000000-0000-0000-0000-00000000000f', 'f@test.local', '{"role":"listener","username":"test_ia_f"}');

-- A'nın 3 parçası: açık (t1), yorumları kapalı olacak (t2), gizli (t3)
insert into public.tracks (id, artist_id, title, genre, audio_path, rights_confirmed, status) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Açık', 'rap', '00000000-0000-0000-0000-00000000000a/1.mp3', true, 'active'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', 'Yorumsuz', 'rap', '00000000-0000-0000-0000-00000000000a/2.mp3', true, 'active'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-00000000000a', 'Gizli', 'rap', '00000000-0000-0000-0000-00000000000a/3.mp3', true, 'hidden');

-- Sanatçı A: t2'de yorumları kapatır; kendi parçasına puan veremez (dinlemiş olsa bile)
-- B, t2'yi dinlemeye başladı ama 30 sn dolmadı (counted_at boş) → t2'ye puan veremez
insert into public.plays (track_id, user_id, day, counted_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', current_date, now()),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000b', current_date, null);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$
declare n int;
begin
  update public.tracks set comments_enabled = false where id = '00000000-0000-0000-0000-0000000000a2';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: sahibi yorumları kapatamadı'; end if;
  begin
    insert into public.ratings (user_id, track_id, s1, s2, s3, s4)
    values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 5, 5, 5, 5);
    raise exception 'FAIL: sanatçı kendi parçasına puan verdi';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

-- Dinleyici B
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$
declare
  a constant text := '00000000-0000-0000-0000-00000000000a';
  b constant text := '00000000-0000-0000-0000-00000000000b';
  t1 constant text := '00000000-0000-0000-0000-0000000000a1';
  t2 constant text := '00000000-0000-0000-0000-0000000000a2';
  t3 constant text := '00000000-0000-0000-0000-0000000000a3';
  stmt text;
  n int;
begin
  insert into public.likes (user_id, track_id) values (b::uuid, t1::uuid);
  insert into public.saves (user_id, track_id) values (b::uuid, t1::uuid);
  insert into public.follows (follower_id, followee_id) values (b::uuid, a::uuid);
  insert into public.comments (track_id, author_id, body) values (t1::uuid, b::uuid, 'Efsane parça');

  foreach stmt in array array[
    format('insert into public.likes (user_id, track_id) values (%L, %L)', a, t1),          -- başkası adına
    format('insert into public.likes (user_id, track_id) values (%L, %L)', b, t1),          -- iki kez
    format('insert into public.likes (user_id, track_id) values (%L, %L)', b, t3),          -- gizli parça
    format('insert into public.saves (user_id, track_id) values (%L, %L)', a, t1),
    format('insert into public.follows (follower_id, followee_id) values (%L, %L)', b, b),  -- kendini
    format('insert into public.follows (follower_id, followee_id) values (%L, %L)', a, b),  -- başkası adına
    format('insert into public.comments (track_id, author_id, body) values (%L, %L, %L)', t1, a, 'başkası adına'),
    format('insert into public.comments (track_id, author_id, body) values (%L, %L, %L)', t2, b, 'kapalı parçaya'),
    format('insert into public.comments (track_id, author_id, body) values (%L, %L, %L)', t3, b, 'gizli parçaya'),
    format('insert into public.comments (track_id, author_id, body) values (%L, %L, %L)', t1, b, '   '),
    format('insert into public.comments (track_id, author_id, body) values (%L, %L, %L)', t1, b, 'AMK ne bu'),
    format('insert into public.comments (track_id, author_id, body) values (%L, %L, %L)', t1, b, 'siktir git'),
    format('insert into public.comments (track_id, author_id, body) values (%L, %L, %L)', t1, b, 'tam bir piç'),
    format('update public.comments set body = %L where track_id = %L', 'değişti', t1),
    format('update public.tracks set comments_enabled = false where id = %L', t1),
    format('insert into public.ratings (user_id, track_id, s1, s2, s3, s4) values (%L, %L, 4, 4, 4, 4)', b, t1),  -- hiç dinlemedi
    format('insert into public.ratings (user_id, track_id, s1, s2, s3, s4) values (%L, %L, 4, 4, 4, 4)', b, t2)   -- 30 sn dolmadı
  ] loop
    begin
      execute stmt;
      get diagnostics n = row_count;
      -- update'ler yetki yoksa hata, varsa 0 satır olmalı
      if stmt like 'update%' and n = 0 then continue; end if;
      raise exception 'FAIL: izin verilmemeliydi -> %', stmt;
    exception when others then
      if sqlerrm like 'FAIL%' then raise; end if;
    end;
  end loop;

  -- Masum cümleler küfür sayılmaz (+ ilk yorumla 5 yorum = dakikalık sınır)
  insert into public.comments (track_id, author_id, body, at_sec) values
    (t1::uuid, b::uuid, 'Bu parçayı götürdüm, 1:24 efsane', 84),
    (t1::uuid, b::uuid, 'Amine çok iyi söylemiş', null),
    (t1::uuid, b::uuid, 'nice pic, I got it', null),
    (t1::uuid, b::uuid, 'ananı özledin mi diye sordu', null);
  begin
    insert into public.comments (track_id, author_id, body) values (t1::uuid, b::uuid, '6. yorum');
    raise exception 'FAIL: dakikada 6. yorum kabul edildi';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

-- B parçayı 30 sn dinlemiş olsun → puan verebilir
reset role;
insert into public.plays (track_id, user_id, day, counted_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000b', current_date, now());
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$
declare n int; s record;
begin
  begin
    insert into public.ratings (user_id, track_id, s1, s2, s3, s4)
    values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a1', 6, 4, 4, 4);
    raise exception 'FAIL: 1–5 dışı puan kabul edildi';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  insert into public.ratings (user_id, track_id, s1, s2, s3, s4)
  values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a1', 4, 3, 5, 2);
  update public.ratings set s1 = 5 where track_id = '00000000-0000-0000-0000-0000000000a1';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: kendi puanını değiştiremedi'; end if;

  select * into s from public.rating_summary('00000000-0000-0000-0000-0000000000a1');
  if s.n <> 1 or s.a1 is not null then raise exception 'FAIL: 5 puanlamadan önce ortalama göründü'; end if;
end $$;

-- Dinleyici C: B'nin kaydettiklerini ve puanını göremez, B'nin yorumunu silemez; beğeni/takip herkese açık
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
do $$
declare n int;
begin
  if exists (select 1 from public.saves) then raise exception 'FAIL: başkasının kaydettiklerini görüyor'; end if;
  if exists (select 1 from public.ratings) then raise exception 'FAIL: başkasının puanını görüyor'; end if;
  if (select count(*) from public.likes where track_id = '00000000-0000-0000-0000-0000000000a1') <> 1 then
    raise exception 'FAIL: beğeni sayısı görünmüyor';
  end if;
  if not exists (select 1 from public.follows where followee_id = '00000000-0000-0000-0000-00000000000a') then
    raise exception 'FAIL: takipçiler görünmüyor';
  end if;
  delete from public.comments where author_id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: başkasının yorumu silindi'; end if;
end $$;

-- Sanatçı A kendi parçasındaki yorumu siler
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$
declare n int;
begin
  delete from public.comments where body = 'Efsane parça';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: parça sahibi yorumu silemedi'; end if;
end $$;

-- B kendi yorumunu siler, takibi ve beğeniyi geri alır
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$
declare n int;
begin
  delete from public.comments where body = 'Amine çok iyi söylemiş';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: kendi yorumunu silemedi'; end if;
  delete from public.likes where track_id = '00000000-0000-0000-0000-0000000000a1';
  delete from public.follows where followee_id = '00000000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: takibi bırakamadı'; end if;
end $$;

-- 5 puanlamadan sonra ortalama görünür
reset role;
insert into public.ratings (user_id, track_id, s1, s2, s3, s4)
select u, '00000000-0000-0000-0000-0000000000a1', 3, 3, 3, 3
from unnest(array[
  '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d',
  '00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000f'
]::uuid[]) as u;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$
declare s record;
begin
  select * into s from public.rating_summary('00000000-0000-0000-0000-0000000000a1');
  -- s1: B'nin 5'i + dört 3 → 3.4
  if s.n <> 5 or s.a1 <> 3.4 then raise exception 'FAIL: ortalama yanlış (n=%, a1=%)', s.n, s.a1; end if;
  begin
    insert into public.likes (user_id, track_id) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a1');
    raise exception 'FAIL: ziyaretçi beğeni ekledi';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

select 'OK: etkileşim güvenlik kontrolleri geçti' as sonuc;
rollback;

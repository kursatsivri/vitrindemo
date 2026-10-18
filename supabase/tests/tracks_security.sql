-- Faz 2 güvenlik testi: parçalar, haftalık sınır, depolama, dinleme kaydı.
-- Her şey transaction içinde, sonunda rollback: veritabanında iz bırakmaz.
-- Bir kontrol başarısız olursa 'FAIL: ...' hatası fırlatır; sonunda 'OK' satırı döner.
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '{"role":"artist","username":"test_sanatci_a"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '{"role":"listener","username":"test_dinleyici"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local', '{"role":"artist","username":"test_sanatci_c"}');

-- Sanatçı A
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

do $$
declare
  a constant text := '00000000-0000-0000-0000-00000000000a';
  c constant text := '00000000-0000-0000-0000-00000000000c';
  cols constant text := 'insert into public.tracks (artist_id, title, genre, audio_path, rights_confirmed%s) values (%L, %L, %L, %L, %s%s)';
  stmt text;
  n int;
  t uuid;
begin
  foreach stmt in array array[
    format(cols, '', c, 'Başkası adına', 'rap', c || '/x.mp3', 'true', ''),
    format(cols, '', a, 'Haklar onaysız', 'rap', a || '/x.mp3', 'false', ''),
    format(cols, ', status', a, 'Durum seçmeye çalışır', 'rap', a || '/x.mp3', 'true', ', ''active'''),
    format(cols, '', a, 'Başkasının dosyası', 'rap', c || '/x.mp3', 'true', ''),
    format(cols, '', a, 'Tür dışı', 'jazz', a || '/x.mp3', 'true', ''),
    format(cols, '', a, '   ', 'rap', a || '/x.mp3', 'true', ''),
    format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'tracks', c || '/x.mp3'),
    format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'covers', c || '/x.png')
  ] loop
    begin
      execute stmt;
      raise exception 'FAIL: izin verilmemeliydi -> %', stmt;
    exception when others then
      if sqlerrm like 'FAIL%' then raise; end if;
    end;
  end loop;

  -- 3 parça yüklenir, 4. haftalık sınıra takılır
  for i in 1..3 loop
    insert into public.tracks (artist_id, title, genre, audio_path, rights_confirmed)
    values (a::uuid, 'Parça ' || i, 'rap', a || '/' || i || '.mp3', true);
  end loop;
  begin
    insert into public.tracks (artist_id, title, genre, audio_path, rights_confirmed)
    values (a::uuid, 'Parça 4', 'rap', a || '/4.mp3', true);
    raise exception 'FAIL: haftada 4. parça yüklenebildi';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm not like 'Haftalık%' then raise exception 'FAIL: beklenmeyen hata: %', sqlerrm; end if;
  end;

  select id into t from public.tracks where audio_path = a || '/1.mp3';
  foreach stmt in array array[
    format('update public.tracks set audio_path = %L where id = %L', a || '/y.mp3', t),
    format('update public.tracks set status = %L where id = %L', 'active', t),
    format('update public.tracks set artist_id = %L where id = %L', c, t)
  ] loop
    begin
      execute stmt;
      raise exception 'FAIL: izin verilmemeliydi -> %', stmt;
    exception when others then
      if sqlerrm like 'FAIL%' then raise; end if;
    end;
  end loop;

  update public.tracks set title = 'Yeni ad', description = 'Açıklama' where id = t;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: kendi parçasını güncelleyemedi'; end if;

  insert into storage.objects (bucket_id, name) values ('tracks', a || '/1.mp3'), ('covers', a || '/1.png');
end $$;

-- Moderasyon simülasyonu (admin işi): bir parça gizlenir
reset role;
update public.tracks set status = 'hidden' where audio_path = '00000000-0000-0000-0000-00000000000a/3.mp3';

-- Dinleyici B
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

do $$
declare
  a constant text := '00000000-0000-0000-0000-00000000000a';
  b constant text := '00000000-0000-0000-0000-00000000000b';
  t uuid;
  n int;
  stmt text;
begin
  select id into t from public.tracks where audio_path = a || '/1.mp3';
  if t is null then raise exception 'FAIL: dinleyici aktif parçayı göremiyor'; end if;
  if exists (select 1 from public.tracks where status <> 'active') then
    raise exception 'FAIL: dinleyici gizli parçayı görüyor';
  end if;

  foreach stmt in array array[
    format('insert into public.tracks (artist_id, title, genre, audio_path, rights_confirmed) values (%L, %L, %L, %L, true)',
      b, 'Dinleyici yükler', 'rap', b || '/x.mp3'),
    format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'tracks', b || '/x.mp3'),
    format('insert into public.plays (track_id, user_id, day) values (%L, %L, current_date)', t, b),
    format('update public.plays set counted_at = now() where track_id = %L', t)
  ] loop
    begin
      execute stmt;
      -- update plays: yetki yoksa hata, varsa 0 satır olmalı
      get diagnostics n = row_count;
      if stmt like 'update%' and n = 0 then continue; end if;
      raise exception 'FAIL: izin verilmemeliydi -> %', stmt;
    exception when others then
      if sqlerrm like 'FAIL%' then raise; end if;
    end;
  end loop;

  update public.tracks set title = 'hack' where id = t;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: başkasının parçası güncellendi'; end if;
  delete from public.tracks where id = t;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: başkasının parçası silindi'; end if;

  -- Dinleme: başlar, 30 sn dolmadan sayılmaz
  perform public.start_play(t);
  if public.count_play(t) then raise exception 'FAIL: 30 saniye dolmadan dinleme sayıldı'; end if;
end $$;

-- 30 saniye geçmiş gibi yap
reset role;
update public.plays set started_at = now() - interval '31 seconds'
  where user_id = '00000000-0000-0000-0000-00000000000b';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

do $$
declare
  t uuid;
  hidden uuid;
begin
  select track_id into t from public.plays limit 1;
  if not public.count_play(t) then raise exception 'FAIL: 30 saniye sonra dinleme sayılmadı'; end if;
  if public.count_play(t) then raise exception 'FAIL: aynı gün ikinci kez sayıldı'; end if;
  if (select count(*) from public.plays where counted_at is not null) <> 1 then
    raise exception 'FAIL: dinleme kaydı yazılmadı';
  end if;
end $$;

-- Gizli parçaya dinleme başlatılamaz
reset role;
do $$
declare hidden uuid;
begin
  select id into hidden from public.tracks where status = 'hidden';
  perform set_config('test.hidden', hidden::text, true);
end $$;
set local role authenticated;
do $$
begin
  perform public.start_play(current_setting('test.hidden')::uuid);
  if exists (select 1 from public.plays where track_id = current_setting('test.hidden')::uuid) then
    raise exception 'FAIL: gizli parçaya dinleme kaydı açıldı';
  end if;
end $$;

-- Sanatçı A gizlenen kendi parçasını görür
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$
begin
  if (select count(*) from public.tracks where artist_id = '00000000-0000-0000-0000-00000000000a') <> 3 then raise exception 'FAIL: sanatçı kendi parçalarının hepsini görmüyor'; end if;
  if exists (select 1 from public.plays) then raise exception 'FAIL: sanatçı başkasının dinleme kaydını görüyor'; end if;
end $$;

-- Ziyaretçi: aktif parçaları görür, dinleme kaydı açamaz
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$
begin
  if (select count(*) from public.tracks where artist_id = '00000000-0000-0000-0000-00000000000a') <> 2 then raise exception 'FAIL: ziyaretçi aktif parçaları doğru görmüyor'; end if;
  begin
    perform public.start_play(gen_random_uuid());
    raise exception 'FAIL: ziyaretçi start_play çağırabildi';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

select 'OK: parça güvenlik kontrolleri geçti' as sonuc;
rollback;

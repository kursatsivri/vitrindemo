-- Faz 3A güvenlik testi: türler, etiketler, en iyi an, dış linkler, ses dalgası, feat, profil alanları.
-- Her şey transaction içinde, sonunda rollback: veritabanında iz bırakmaz.
-- Bir kontrol başarısız olursa 'FAIL: ...' hatası fırlatır; sonunda 'OK' satırı döner.
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '{"role":"artist","username":"test_meta_a"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '{"role":"listener","username":"test_meta_b"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.local', '{"role":"artist","username":"test_meta_c"}'),
  ('00000000-0000-0000-0000-00000000000d', 'd@test.local', '{"role":"artist","username":"test_meta_d"}'),
  ('00000000-0000-0000-0000-00000000000e', 'e@test.local', '{"role":"artist","username":"test_meta_e"}'),
  ('00000000-0000-0000-0000-00000000000f', 'f@test.local', '{"role":"artist","username":"test_meta_f"}');

-- C'nin bir parçası (A'nın öne çıkan parça olarak seçememesi için)
insert into public.tracks (id, artist_id, title, genre, audio_path, rights_confirmed) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000c', 'C parçası', 'pop',
   '00000000-0000-0000-0000-00000000000c/c1.mp3', true);

-- Sanatçı A
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

do $$
declare
  a constant text := '00000000-0000-0000-0000-00000000000a';
  ins constant text := 'insert into public.tracks (artist_id, title, genre, audio_path, rights_confirmed, duration_sec, %s) values (%L, %L, %L, %L, true, 200, %s)';
  stmt text;
  t uuid;
  n int;
begin
  foreach stmt in array array[
    format(ins, 'tags', a, 'Tür dışı', 'jazz', a || '/x1.mp3', '''{}'''),
    format(ins, 'tags', a, 'Çok etiket', 'rap', a || '/x2.mp3', '''{trap,drill,lofi,phonk}'''),
    format(ins, 'tags', a, 'Bilinmeyen etiket', 'rap', a || '/x3.mp3', '''{kpop}'''),
    format(ins, 'moods', a, 'Çok ruh hali', 'rap', a || '/x4.mp3', '''{hard,dark,chill}'''),
    format(ins, 'hook_sec', a, 'En iyi an süreden uzun', 'rap', a || '/x5.mp3', '200'),
    format(ins, 'hook_sec', a, 'Negatif an', 'rap', a || '/x6.mp3', '-5'),
    format(ins, 'seeking_vocal', a, 'Rap parçada vokal aranıyor', 'rap', a || '/x7.mp3', 'true'),
    format(ins, 'links', a, 'Zararlı link', 'rap', a || '/x8.mp3', '''{"spotify":"javascript:alert(1)"}'''),
    format(ins, 'links', a, 'Bilinmeyen link', 'rap', a || '/x9.mp3', '''{"tiktok":"https://tiktok.com/x"}'''),
    format(ins, 'waveform', a, 'Dalga değeri büyük', 'rap', a || '/x10.mp3', '''{10,150}'''),
    format(ins, 'waveform', a, 'Dalga çok uzun', 'rap', a || '/x11.mp3', format('%L', (select array_agg(1)::text from generate_series(1, 201))))
  ] loop
    begin
      execute stmt;
      raise exception 'FAIL: izin verilmemeliydi -> %', stmt;
    exception when others then
      if sqlerrm like 'FAIL%' then raise; end if;
    end;
  end loop;

  -- Geçerli: yeni tür + etiket + ruh hali + an + link + dalga
  insert into public.tracks (artist_id, title, genre, audio_path, rights_confirmed, duration_sec, tags, moods, hook_sec, links, waveform)
  values (a::uuid, 'Geçerli', 'arabesk', a || '/ok.mp3', true, 200, '{arabesk_rap,slow}', '{emotional}', 45,
          '{"spotify":"https://open.spotify.com/track/x"}', '{0,50,100}')
  returning id into t;

  -- Beat'te "vokal arıyorum" olur
  insert into public.tracks (artist_id, title, genre, audio_path, rights_confirmed, seeking_vocal)
  values (a::uuid, 'Beat', 'beat', a || '/beat.mp3', true, true);

  update public.tracks set tags = '{drill}', moods = '{hard}', hook_sec = 10 where id = t;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: kendi parçasının etiketlerini güncelleyemedi'; end if;

  -- Feat: dinleyici, kendisi ve 4. sanatçı reddedilir
  foreach stmt in array array[
    format('insert into public.track_features (track_id, artist_id) values (%L, %L)', t, '00000000-0000-0000-0000-00000000000b'),
    format('insert into public.track_features (track_id, artist_id) values (%L, %L)', t, a),
    format('insert into public.track_features (track_id, artist_id) values (%L, %L)', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000d')
  ] loop
    begin
      execute stmt;
      raise exception 'FAIL: izin verilmemeliydi -> %', stmt;
    exception when others then
      if sqlerrm like 'FAIL%' then raise; end if;
    end;
  end loop;

  insert into public.track_features (track_id, artist_id) values
    (t, '00000000-0000-0000-0000-00000000000c'),
    (t, '00000000-0000-0000-0000-00000000000d'),
    (t, '00000000-0000-0000-0000-00000000000e');
  begin
    insert into public.track_features (track_id, artist_id) values (t, '00000000-0000-0000-0000-00000000000f');
    raise exception 'FAIL: 4. feat eklenebildi';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- Profil: geçersiz şehir, başkasının parçası öne çıkan olamaz; kendi parçası olur
  foreach stmt in array array[
    format('update public.profiles set city = 82 where id = %L', a),
    format('update public.profiles set featured_track_id = %L where id = %L', '00000000-0000-0000-0000-0000000000c1', a)
  ] loop
    begin
      execute stmt;
      raise exception 'FAIL: izin verilmemeliydi -> %', stmt;
    exception when others then
      if sqlerrm like 'FAIL%' then raise; end if;
    end;
  end loop;

  update public.profiles set city = 35, open_to_discovery = false, featured_track_id = t where id = a::uuid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: kendi profil alanlarını güncelleyemedi'; end if;

  perform set_config('test.track', t::text, true);
end $$;

-- Etiketlenen sanatçı C kendini çıkarabilir, başkasını çıkaramaz
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
do $$
declare n int;
begin
  delete from public.track_features
    where track_id = current_setting('test.track')::uuid and artist_id = '00000000-0000-0000-0000-00000000000d';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: etiketlenen başka bir feat''i sildi'; end if;

  delete from public.track_features
    where track_id = current_setting('test.track')::uuid and artist_id = '00000000-0000-0000-0000-00000000000c';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: etiketlenen kendini çıkaramadı'; end if;
end $$;

-- Dinleyici B: başkasının parçasına feat ekleyemez ve etiket değiştiremez; feat'leri görür
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$
declare n int;
begin
  begin
    insert into public.track_features (track_id, artist_id)
    values (current_setting('test.track')::uuid, '00000000-0000-0000-0000-00000000000f');
    raise exception 'FAIL: başkasının parçasına feat eklendi';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  update public.tracks set tags = '{phonk}' where id = current_setting('test.track')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: başkasının parçasının etiketi değişti'; end if;

  if (select count(*) from public.track_features where track_id = current_setting('test.track')::uuid) <> 2 then
    raise exception 'FAIL: feat listesi yanlış görünüyor';
  end if;
end $$;

select 'OK: parça bilgisi güvenlik kontrolleri geçti' as sonuc;
rollback;

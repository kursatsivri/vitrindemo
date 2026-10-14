-- Faz 1 güvenlik testi. Çalıştır: npx supabase db query --linked -f supabase/tests/profiles_security.sql
-- Her şey transaction içinde, sonunda rollback: veritabanında iz bırakmaz.
-- Bir kontrol başarısız olursa 'FAIL: ...' hatası fırlatır; sonunda 'OK' satırı döner.
begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '{"role":"artist","username":"test_sanatci"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '{"role":"listener","username":"test_dinleyici"}');

-- Kayıtta admin/label rolü seçilemez
do $$
declare r text;
begin
  foreach r in array array['admin', 'label'] loop
    begin
      insert into auth.users (id, email, raw_user_meta_data)
      values (gen_random_uuid(), r || '@test.local', jsonb_build_object('role', r, 'username', 'test_' || r));
      raise exception 'FAIL: % rolüyle kayıt kabul edildi', r;
    exception when others then
      if sqlerrm like 'FAIL%' then raise; end if;
    end;
  end loop;
end $$;

-- Sanatçı A olarak
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

do $$
declare
  a constant text := '00000000-0000-0000-0000-00000000000a';
  b constant text := '00000000-0000-0000-0000-00000000000b';
  stmt text;
  n int;
begin
  foreach stmt in array array[
    format('update public.profiles set role = %L where id = %L', 'admin', a),
    format('update public.profiles set username = %L where id = %L', 'Admin', a),
    format('update public.profiles set username = %L where id = %L', 'giris', a),
    format('update public.profiles set username = %L where id = %L', 'a..b', a),
    format('update public.profiles set socials = %L where id = %L', '{"instagram":"javascript:alert(1)"}', a),
    format('update public.profiles set socials = %L where id = %L', '{"tiktok":"https://tiktok.com/x"}', a),
    format('update public.profiles set genres = %L where id = %L', '{rap,pop}', a),
    format('update public.profiles set avatar_path = %L where id = %L', b || '/x.png', a),
    format('insert into public.profiles (id, role, username) values (%L, %L, %L)', gen_random_uuid(), 'admin', 'test_x'),
    format('insert into public.artist_contacts (profile_id, email) values (%L, %L)', b, 'x@test.local'),
    format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'avatars', b || '/x.png')
  ] loop
    begin
      execute stmt;
      raise exception 'FAIL: izin verilmemeliydi -> %', stmt;
    exception when others then
      if sqlerrm like 'FAIL%' then raise; end if;
    end;
  end loop;

  -- Başkasının profili: hata vermez ama 0 satır etkiler
  update public.profiles set bio = 'hack' where id = b::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: başkasının profili güncellendi'; end if;

  -- İzin verilenler
  update public.profiles
    set display_name = 'Test', genres = '{rap}', socials = '{"instagram":"https://instagram.com/test"}',
        avatar_path = a || '/x.png'
    where id = a::uuid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: kendi profilini güncelleyemedi'; end if;

  insert into public.artist_contacts (profile_id, email) values (a::uuid, 'menajer@test.local');
  insert into storage.objects (bucket_id, name) values ('avatars', a || '/x.png');
end $$;

-- Dinleyici B olarak
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

do $$
begin
  if exists (select 1 from public.artist_contacts) then
    raise exception 'FAIL: dinleyici sanatçının iletişim e-postasını görüyor';
  end if;
  begin
    insert into public.artist_contacts (profile_id, email)
    values ('00000000-0000-0000-0000-00000000000b', 'b@test.local');
    raise exception 'FAIL: dinleyici iletişim e-postası ekleyebildi';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

-- Giriş yapmamış ziyaretçi profilleri görür, iletişimi göremez
set local role anon;
do $$
begin
  if not exists (select 1 from public.profiles where username = 'test_sanatci') then
    raise exception 'FAIL: ziyaretçi profili göremiyor';
  end if;
  begin
    perform 1 from public.artist_contacts;
    raise exception 'FAIL: ziyaretçi artist_contacts okuyabildi';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

select 'OK: tüm güvenlik kontrolleri geçti' as sonuc;
rollback;

-- Faz 8 güvenlik testi: verilerimi indir + hesabımı sil (KVKK).
-- Her şey transaction içinde, sonunda rollback: veritabanında iz bırakmaz.
-- Bir kontrol başarısız olursa 'FAIL: ...' hatası fırlatır; sonunda 'OK' satırı döner.
begin;

-- a: sanatçı (iletişim e-postalı, 1 parça) · b: dinleyici (beğeni, yorum, takip) · m: admin
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '{"role":"artist","username":"test_hs_a"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '{"role":"listener","username":"test_hs_b"}'),
  ('00000000-0000-0000-0000-00000000000e', 'm@test.local', '{"role":"listener","username":"test_hs_m"}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000e';
insert into public.artist_contacts (profile_id, email) values ('00000000-0000-0000-0000-00000000000a', 'gizli.a@test.local');
insert into public.tracks (id, artist_id, title, genre, audio_path, rights_confirmed, created_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Hs bir', 'rap', '00000000-0000-0000-0000-00000000000a/1.mp3', true, now() - interval '30 days');
insert into public.likes (user_id, track_id) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a1');
insert into public.comments (track_id, author_id, body) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000b', 'Güzel');
insert into public.follows (follower_id, followee_id) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a');

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

-- ── Ziyaretçi: ikisi de kapalı ────────────────────────────────────────────
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select pg_temp.expect_fail('select public.export_my_data()');
select pg_temp.expect_fail('select public.delete_my_account()');

-- ── B: kendi verisi var, A'nın özel verisi yok ────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$
declare d jsonb := public.export_my_data();
begin
  if d->'profil'->>'username' <> 'test_hs_b' then raise exception 'FAIL: dışa aktarımda yanlış profil'; end if;
  if d->'hesap'->>'email' <> 'b@test.local' then raise exception 'FAIL: hesap e-postası yok'; end if;
  if jsonb_array_length(d->'begeniler') <> 1 or jsonb_array_length(d->'yorumlar') <> 1 or jsonb_array_length(d->'takip_ettiklerin') <> 1 then
    raise exception 'FAIL: B''nin etkileşimleri eksik';
  end if;
  if jsonb_array_length(d->'parcalar') <> 0 or d->>'iletisim_eposta' is not null then raise exception 'FAIL: başkasının verisi sızdı'; end if;
  if d::text like '%gizli.a@test.local%' or d::text like '%"a@test.local"%' then raise exception 'FAIL: A''nın e-postası sızdı'; end if;
end $$;

-- ── A: kendi parçası ve iletişim e-postası; takipçi listesi yok ───────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$
declare d jsonb := public.export_my_data();
begin
  if jsonb_array_length(d->'parcalar') <> 1 or d->>'iletisim_eposta' <> 'gizli.a@test.local' then raise exception 'FAIL: A''nın verisi eksik'; end if;
  if jsonb_array_length(d->'takip_ettiklerin') <> 0 then raise exception 'FAIL: takipçiler (başkasının verisi) eklendi'; end if;
end $$;

-- ── Admin kendini silemez ─────────────────────────────────────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}';
select pg_temp.expect_fail('select public.delete_my_account()');

-- ── B hesabını siler: B'nin her şeyi gider, A'nın parçası kalır ───────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select public.delete_my_account();

-- ── A hesabını siler: parçası ve ona bağlı her şey gider ──────────────────
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$
begin
  if exists (select 1 from public.follows where follower_id = '00000000-0000-0000-0000-00000000000b') then raise exception 'FAIL: B''nin takibi kaldı'; end if;
  if not exists (select 1 from public.tracks where id = '00000000-0000-0000-0000-0000000000a1') then raise exception 'FAIL: B silinince A''nın parçası gitti'; end if;
end $$;
select public.delete_my_account();

reset role;
do $$
begin
  if exists (select 1 from auth.users where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')) then
    raise exception 'FAIL: auth kullanıcısı silinmedi';
  end if;
  if exists (select 1 from public.profiles where username in ('test_hs_a', 'test_hs_b')) then raise exception 'FAIL: profil kaldı'; end if;
  if exists (select 1 from public.tracks where id = '00000000-0000-0000-0000-0000000000a1') then raise exception 'FAIL: parça kaldı'; end if;
  if exists (select 1 from public.likes where user_id = '00000000-0000-0000-0000-00000000000b')
     or exists (select 1 from public.comments where author_id = '00000000-0000-0000-0000-00000000000b')
     or exists (select 1 from public.artist_contacts where profile_id = '00000000-0000-0000-0000-00000000000a')
     or exists (select 1 from public.notifications where user_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b')) then
    raise exception 'FAIL: silinen hesabın kayıtları kaldı';
  end if;
  if not exists (select 1 from public.profiles where username = 'test_hs_m') then raise exception 'FAIL: başka hesap etkilendi'; end if;
end $$;

select 'OK: hesap silme ve veri indirme kontrolleri geçti' as sonuc;
rollback;

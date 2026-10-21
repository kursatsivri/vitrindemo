-- Faz 8a: KVKK hakları — verilerimi indir ve hesabımı sil (SPEC §4.1, §4.16)

-- Kullanıcının kendisine ait tüm kayıtlar tek JSON'da. Başkasının kişisel verisi eklenmez
-- (takipçi listesi değil, sadece takip ettiklerin; ilgilerde karşı tarafın kimliği).
create function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
begin
  if u is null then
    raise exception 'Giriş yap' using errcode = 'P0001', hint = 'auth';
  end if;
  return jsonb_build_object(
    'olusturulma', now(),
    'hesap', (select jsonb_build_object('email', email, 'kayit', created_at, 'son_giris', last_sign_in_at) from auth.users where id = u),
    'profil', (select to_jsonb(p) from public.profiles p where p.id = u),
    'iletisim_eposta', (select email from public.artist_contacts where profile_id = u),
    'tercihler', (select to_jsonb(x) from public.user_preferences x where x.user_id = u),
    'parcalar', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.tracks x where x.artist_id = u), '[]'),
    'feat_etiketleri', coalesce((select jsonb_agg(to_jsonb(x)) from public.track_features x where x.artist_id = u), '[]'),
    'begeniler', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.likes x where x.user_id = u), '[]'),
    'kaydedilenler', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.saves x where x.user_id = u), '[]'),
    'takip_ettiklerin', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.follows x where x.follower_id = u), '[]'),
    'yorumlar', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.comments x where x.author_id = u), '[]'),
    'puanlar', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.ratings x where x.user_id = u), '[]'),
    'oylar', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.votes x where x.voter_id = u), '[]'),
    'kulak_puanlari', coalesce((select jsonb_agg(to_jsonb(x)) from public.ear_points x where x.user_id = u), '[]'),
    'dinlemeler', coalesce((select jsonb_agg(to_jsonb(x) order by x.started_at) from public.plays x where x.user_id = u), '[]'),
    'kaydirmalar', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.swipes x where x.user_id = u), '[]'),
    'bildirimler', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.notifications x where x.user_id = u), '[]'),
    'sikayetlerin', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.reports x where x.reporter_id = u), '[]'),
    'engellediklerin', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.blocks x where x.blocker_id = u), '[]'),
    'kesifci_basvurusu', (select to_jsonb(x) from public.scout_applications x where x.user_id = u),
    'kesifci_favoriler', coalesce((select jsonb_agg(to_jsonb(x)) from public.scout_favorites x where x.scout_id = u), '[]'),
    'kesifci_alarmlar', coalesce((select jsonb_agg(to_jsonb(x)) from public.scout_alerts x where x.scout_id = u), '[]'),
    'profil_goruntulemelerin', coalesce((select jsonb_agg(to_jsonb(x)) from public.profile_views x where x.viewer_id = u), '[]'),
    'ilgiler', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.interests x where u in (x.scout_id, x.artist_id)), '[]'),
    'ilanlar', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.opportunities x where x.scout_id = u), '[]'),
    'ilan_basvurulari', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from public.opportunity_applications x where x.artist_id = u), '[]')
  );
end;
$$;

-- Hesabı ve tüm verisini siler (auth.users → profiles → her şey on delete cascade).
-- Dosyalar (avatar, ses, kapak) Storage API ile önce sunucu aksiyonunda silinir; SQL storage'ı silemez.
-- Admin kendini silemez: önce yöneticiliği başka hesaba devretmeli (son admin kaybolmasın).
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := auth.uid();
begin
  if u is null then
    raise exception 'Giriş yap' using errcode = 'P0001', hint = 'auth';
  end if;
  if public.has_role('admin') then
    raise exception 'Yönetici hesabı silinemez; önce yöneticiliği başka hesaba devret' using errcode = 'P0001', hint = 'admin';
  end if;
  delete from auth.users where id = u;
end;
$$;

revoke execute on function public.export_my_data(), public.delete_my_account() from public, anon;
grant execute on function public.export_my_data(), public.delete_my_account() to authenticated;

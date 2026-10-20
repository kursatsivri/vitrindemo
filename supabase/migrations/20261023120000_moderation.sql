-- Faz 7a: bildirimler, engelleme, şikayet, askıya alma, yönetici işlemleri, editörün seçimi
-- (SPEC §4.13, §4.15, §4.7). E-posta bildirimi Faz 8'de.

-- Yeni sayfa adresleri kullanıcı adı olarak alınamasın
alter table public.profiles drop constraint profiles_username_check;
alter table public.profiles add constraint profiles_username_check check (
  username ~ '^[a-z0-9_.]{3,20}$'
  and username !~ '(^\.|\.$|\.\.)'
  and username not in (
    'admin', 'yonetim', 'giris', 'kayit', 'cikis', 'auth', 'api', 'profil', 'ayarlar',
    'sifre', 'sifremi', 'siralama', 'gecmis', 'kesfet', 'yukle', 'parca', 'parcalar',
    'plak', 'sirket', 'yasal', 'kvkk', 'cerez', 'telif', 'sartlar', 'hakkinda',
    'destek', 'iletisim', 'vitrin', 'favicon.ico', 'robots.txt', 'sitemap.xml',
    'ara', 'sehir', 'tercihler', 'kesifci', 'firsatlar', 'bildirimler', 'challenge'
  )
);

-- Askıya alınan hesabın parçaları 'suspended' olur (geri açınca 'active'). Tüm sorgular 'active' baktığı için gizlenir.
alter table public.tracks drop constraint tracks_status_check;
alter table public.tracks add constraint tracks_status_check
  check (status in ('active', 'hidden', 'removed', 'suspended'));
alter table public.profiles add column suspended_at timestamptz;

-- Admin gizlenmiş/askıdaki parçaları da görür (şikayet incelemesi). Yorumlar ve feat'ler tracks RLS'ini izler.
create policy "admin tüm parçaları görür" on public.tracks for select to authenticated
  using ((select public.has_role('admin')));

-- ── Engelleme ─────────────────────────────────────────────────────────────
create table public.blocks (
  blocker_id uuid not null references public.profiles on delete cascade,
  blocked_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;
create policy "kendi engellerini yönetir" on public.blocks for all to authenticated
  using (blocker_id = (select auth.uid()))
  with check (blocker_id = (select auth.uid()));
revoke all on public.blocks from anon, authenticated;
grant select, delete, insert (blocker_id, blocked_id) on public.blocks to authenticated;

-- p_blocker, p_blocked'ı engelledi mi? (Politikalar başkasının engel satırını okuyabilsin diye definer.)
create function public.is_blocked(p_blocker uuid, p_blocked uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.blocks where blocker_id = p_blocker and blocked_id = p_blocked);
$$;

-- Engelleyince iki yönlü takip biter
create function public.on_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocked_id and followee_id = new.blocker_id)
     or (follower_id = new.blocker_id and followee_id = new.blocked_id);
  return new;
end;
$$;
create trigger blocks_after_insert after insert on public.blocks
  for each row execute function public.on_block();

-- Engellenen: engelleyenin parçasına yorum yapamaz, onu takip edemez, ilanına başvuramaz, ilgi alamaz/gönderemez.
drop policy "açık parçaya kendi adına yorum" on public.comments;
create policy "açık parçaya kendi adına yorum" on public.comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.tracks t
      where t.id = track_id and t.status = 'active' and t.comments_enabled
        and not public.is_blocked(t.artist_id, (select auth.uid()))
    )
  );

drop policy "kendi adına takip eder" on public.follows;
create policy "kendi adına takip eder" on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()) and not public.is_blocked(followee_id, follower_id));

drop policy "sanatçı kendi parçasıyla açık ilana başvurur" on public.opportunity_applications;
create policy "sanatçı kendi parçasıyla açık ilana başvurur" on public.opportunity_applications for insert to authenticated
  with check (
    artist_id = (select auth.uid())
    and public.has_role('artist')
    and exists (select 1 from public.tracks t where t.id = track_id and t.artist_id = (select auth.uid()) and t.status = 'active')
    and public.is_open_opportunity(opportunity_id)
    and not exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id and public.is_blocked(o.scout_id, (select auth.uid()))
    )
  );

-- send_interest: Faz 6 + engel kontrolü (iki yönde de; sanatçı engellediyse "ilgi almıyor" der)
create or replace function public.send_interest(p_artist uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Giriş yap' using errcode = 'P0001', hint = 'auth';
  end if;
  perform pg_advisory_xact_lock(hashtext('interest:' || v_uid::text));
  if not public.has_role('scout') then
    raise exception 'Sadece onaylı keşifçiler ilgi gönderebilir' using errcode = 'P0001', hint = 'role';
  end if;
  if not exists (select 1 from public.profiles where id = p_artist and role = 'artist') then
    raise exception 'Sanatçı bulunamadı' using errcode = 'P0001', hint = 'not_found';
  end if;
  if not exists (select 1 from public.profiles where id = p_artist and open_to_discovery)
     or public.is_blocked(p_artist, v_uid) or public.is_blocked(v_uid, p_artist) then
    raise exception 'Bu sanatçı şu an ilgi almıyor' using errcode = 'P0001', hint = 'closed';
  end if;
  if exists (select 1 from public.interests where scout_id = v_uid and artist_id = p_artist) then
    raise exception 'Bu sanatçıya zaten ilgi gönderdin' using errcode = 'P0001', hint = 'already_sent';
  end if;
  if (select count(*) from public.interests where scout_id = v_uid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Günde en fazla 20 ilgi gönderebilirsin' using errcode = 'P0001', hint = 'rate_limit';
  end if;
  insert into public.interests (scout_id, artist_id) values (v_uid, p_artist);
end;
$$;

-- ── Bildirimler ───────────────────────────────────────────────────────────
-- Yazma sadece notify() ile (tetikleyiciler ve cron). dedupe: aynı olay bir kez.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  type text not null check (type in (
    'follow', 'like', 'comment', 'interest', 'match', 'application', 'application_status',
    'scout_decision', 'new_track', 'vote_milestone', 'top10', 'alert', 'challenge_beat', 'challenge_win'
  )),
  actor_id uuid references public.profiles on delete cascade,
  track_id uuid references public.tracks on delete cascade,
  entity_id uuid,
  data jsonb not null default '{}',
  dedupe text unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;
create policy "kendi bildirimlerini görür" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "kendi bildirimini okundu yapar" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "kendi bildirimini siler" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.notifications from anon, authenticated;
grant select, delete, update (read_at) on public.notifications to authenticated;

-- Kendine ve seni engelleyen kişiden bildirim yok.
create function public.notify(
  p_user uuid, p_type text, p_actor uuid default null, p_track uuid default null,
  p_entity uuid default null, p_data jsonb default '{}', p_dedupe text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, actor_id, track_id, entity_id, data, dedupe)
  select p_user, p_type, p_actor, p_track, p_entity, p_data, p_dedupe
  where p_user is not null
    and p_user is distinct from p_actor
    and (p_actor is null or not public.is_blocked(p_user, p_actor))
  on conflict (dedupe) do nothing;
$$;
revoke execute on function public.notify(uuid, text, uuid, uuid, uuid, jsonb, text) from public, anon, authenticated;

create function public.notify_follow() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify(new.followee_id, 'follow', new.follower_id, p_dedupe => 'follow:' || new.follower_id || ':' || new.followee_id);
  return new;
end;
$$;
create trigger follows_notify after insert on public.follows for each row execute function public.notify_follow();

create function public.notify_like() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify((select artist_id from public.tracks where id = new.track_id), 'like', new.user_id, new.track_id,
                        p_dedupe => 'like:' || new.user_id || ':' || new.track_id);
  return new;
end;
$$;
create trigger likes_notify after insert on public.likes for each row execute function public.notify_like();

create function public.notify_comment() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify((select artist_id from public.tracks where id = new.track_id), 'comment', new.author_id, new.track_id,
                        new.id, jsonb_build_object('body', left(new.body, 100)));
  return new;
end;
$$;
create trigger comments_notify after insert on public.comments for each row execute function public.notify_comment();

-- İlgi geldi (sanatçıya) · eşleşme (işlemi yapmayan tarafa; ilan eşleşmesinde sanatçıya, kabulde keşifçiye)
create function public.notify_interest() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public.notify(new.artist_id, 'interest', new.scout_id, p_dedupe => 'interest:' || new.scout_id || ':' || new.artist_id);
  end if;
  if new.status = 'accepted' and (tg_op = 'INSERT' or old.status <> 'accepted') then
    if auth.uid() is distinct from new.scout_id then
      perform public.notify(new.scout_id, 'match', new.artist_id, p_dedupe => 'match:' || new.scout_id || ':' || new.artist_id || ':s');
    end if;
    if auth.uid() is distinct from new.artist_id then
      perform public.notify(new.artist_id, 'match', new.scout_id, p_dedupe => 'match:' || new.scout_id || ':' || new.artist_id || ':a');
    end if;
  end if;
  return new;
end;
$$;
create trigger interests_notify after insert or update on public.interests for each row execute function public.notify_interest();

-- İlana başvuru geldi (keşifçiye) · kısa liste / ret (sanatçıya; eşleşme 'match' ile gider)
create function public.notify_application() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_opp public.opportunities;
begin
  select * into v_opp from public.opportunities where id = new.opportunity_id;
  if tg_op = 'INSERT' then
    perform public.notify(v_opp.scout_id, 'application', new.artist_id, new.track_id, v_opp.id,
                          jsonb_build_object('title', v_opp.title));
  elsif new.status in ('shortlisted', 'declined') and new.status <> old.status then
    perform public.notify(new.artist_id, 'application_status', v_opp.scout_id, null, v_opp.id,
                          jsonb_build_object('title', v_opp.title, 'status', new.status));
  end if;
  return new;
end;
$$;
create trigger opportunity_applications_notify after insert or update on public.opportunity_applications
  for each row execute function public.notify_application();

create function public.notify_scout_decision() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> old.status and new.status in ('approved', 'rejected') then
    perform public.notify(new.user_id, 'scout_decision', p_data => jsonb_build_object('status', new.status));
  end if;
  return new;
end;
$$;
create trigger scout_applications_notify after update on public.scout_applications
  for each row execute function public.notify_scout_decision();

-- Takip edilen sanatçının yeni parçası (takipçilere)
create function public.notify_new_track() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' then
    perform public.notify(f.follower_id, 'new_track', new.artist_id, new.id, p_dedupe => 'new_track:' || f.follower_id || ':' || new.id)
    from public.follows f where f.followee_id = new.artist_id;
  end if;
  return new;
end;
$$;
create trigger tracks_notify after insert on public.tracks for each row execute function public.notify_new_track();

-- Oy kilometre taşı: parça 10/50/100/500 sayılan oya ulaşınca
create function public.notify_vote_milestone() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  if new.counts then
    select count(*) into n from public.votes where track_id = new.track_id and counts;
    if n in (10, 50, 100, 500) then
      perform public.notify((select artist_id from public.tracks where id = new.track_id), 'vote_milestone', null, new.track_id,
                            p_data => jsonb_build_object('votes', n), p_dedupe => 'votes:' || new.track_id || ':' || n);
    end if;
  end if;
  return new;
end;
$$;
create trigger votes_notify after insert on public.votes for each row execute function public.notify_vote_milestone();

-- Arşiv (Faz 4) + "ilk 10'a girdin" bildirimi
create or replace function public.archive_finished_periods()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  n int := 0;
begin
  for p in
    select distinct x.period, public.period_start(x.period, v.created_at) as period_start
    from public.votes v cross join (values ('week'), ('month')) as x(period)
    where public.period_start(x.period, v.created_at) < public.period_start(x.period)
      and not exists (
        select 1 from public.ranking_snapshots s
        where s.period = x.period and s.period_start = public.period_start(x.period, v.created_at)
      )
  loop
    insert into public.ranking_snapshots
      (period, period_start, track_id, artist_id, genre, city, score, last_vote_at, rank_all, rank_genre, rank_city)
    select p.period, p.period_start, r.* from public.compute_ranking(p.period, p.period_start) r;

    insert into public.ear_points (user_id, track_id, points, period, period_start)
    select v.voter_id, v.track_id,
           case when v.votes_before < 10 then 3 when v.votes_before < 25 then 2 else 1 end,
           p.period, p.period_start
    from public.ranking_snapshots s
    join public.votes v on v.track_id = s.track_id
    where s.period = p.period and s.period_start = p.period_start and s.rank_genre <= 10
      and v.counts and v.votes_before < 50
      and public.period_start(p.period, v.created_at) <= p.period_start
    on conflict do nothing;

    perform public.notify(s.artist_id, 'top10', null, s.track_id, null,
                          jsonb_build_object('period', p.period, 'period_start', p.period_start, 'rank', s.rank_genre, 'genre', s.genre),
                          'top10:' || p.period || ':' || p.period_start || ':' || s.track_id)
    from public.ranking_snapshots s
    where s.period = p.period and s.period_start = p.period_start and s.rank_genre <= 10;

    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Günlük: yetenek alarmı bildirimi (alarm + sanatçı + hafta başına bir kez) ve 90 günden eski bildirimlerin silinmesi
create function public.daily_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify(a.scout_id, 'alert', r.artist_id, r.track_id, a.id, jsonb_build_object('score', r.score),
                        'alert:' || a.id || ':' || r.artist_id || ':' || public.period_start('week'))
  from public.scout_alerts a
  join public.profiles s on s.id = a.scout_id and s.role = 'scout'
  join public.rising_live r
    on (a.genre is null or r.genre = a.genre)
   and (a.city is null or r.city = a.city)
   and r.score >= a.min_week_votes;
  delete from public.notifications where created_at < now() - interval '90 days';
end;
$$;
revoke execute on function public.daily_notifications() from public, anon, authenticated;
-- 09:00 Türkiye
select cron.schedule('daily_notifications', '0 6 * * *', $$select public.daily_notifications()$$);

-- ── Şikayet ───────────────────────────────────────────────────────────────
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles on delete cascade,
  target_type text not null check (target_type in ('track', 'comment', 'profile', 'opportunity')),
  target_id uuid not null,
  reason text not null check (reason in ('copyright', 'inappropriate', 'fake', 'harassment', 'other')),
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles on delete set null,
  unique (reporter_id, target_type, target_id)
);
create index reports_open_idx on public.reports (created_at) where status = 'open';

alter table public.reports enable row level security;
create policy "şikayet eden kendininkini, admin hepsini görür" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.has_role('admin')));
create policy "kendi adına şikayet eder" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
revoke all on public.reports from anon, authenticated;
grant select, insert (reporter_id, target_type, target_id, reason, details) on public.reports to authenticated;

-- Hedef var mı + günde en fazla 10 şikayet
create function public.check_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exists boolean;
begin
  v_exists := case new.target_type
    when 'track' then exists (select 1 from public.tracks where id = new.target_id)
    when 'comment' then exists (select 1 from public.comments where id = new.target_id)
    when 'profile' then exists (select 1 from public.profiles where id = new.target_id)
    when 'opportunity' then exists (select 1 from public.opportunities where id = new.target_id)
  end;
  if not v_exists then
    raise exception 'Şikayet edilen içerik bulunamadı' using errcode = 'P0001', hint = 'not_found';
  end if;
  perform pg_advisory_xact_lock(hashtext('report:' || new.reporter_id::text));
  if (select count(*) from public.reports where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Günde en fazla 10 şikayet gönderebilirsin' using errcode = 'P0001', hint = 'rate_limit';
  end if;
  return new;
end;
$$;
create trigger reports_check before insert on public.reports for each row execute function public.check_report();

-- ── Editörün seçimi (sıralamadan ayrı, haftalık) ──────────────────────────
create table public.editor_picks (
  week_start date primary key,
  track_id uuid not null references public.tracks on delete cascade,
  note text check (char_length(note) <= 140),
  picked_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
alter table public.editor_picks enable row level security;
create policy "editörün seçimi herkese açık" on public.editor_picks for select using (true);
revoke all on public.editor_picks from anon, authenticated;
grant select on public.editor_picks to anon, authenticated;

-- ── Admin işlemleri (hepsi has_role('admin')) ─────────────────────────────
create function public.require_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Sadece yönetici' using errcode = 'P0001', hint = 'role';
  end if;
end;
$$;

create function public.set_track_status(p_track uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  if p_status not in ('active', 'hidden', 'removed') then
    raise exception 'Geçersiz durum' using errcode = 'P0001', hint = 'invalid';
  end if;
  update public.tracks set status = p_status where id = p_track and status <> 'suspended';
  if not found then
    raise exception 'Parça bulunamadı (askıdaki hesabın parçası olabilir)' using errcode = 'P0001', hint = 'not_found';
  end if;
end;
$$;

create function public.admin_delete_comment(p_comment uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  delete from public.comments where id = p_comment;
end;
$$;

create function public.admin_close_opportunity(p_opp uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  update public.opportunities set closed = true where id = p_opp;
end;
$$;

-- Askıya al / geri aç: giriş kapanır (banned_until), oturumlar düşer, parçalar gizlenir, açık ilanlar kapanır.
-- ponytail: geri açınca kapanan ilanlar açılmaz; gerekirse keşifçi yeniden açar.
create function public.suspend_user(p_user uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  if p_user = auth.uid() or exists (select 1 from public.profiles where id = p_user and role = 'admin') then
    raise exception 'Yönetici askıya alınamaz' using errcode = 'P0001', hint = 'invalid';
  end if;
  if p_on then
    update public.profiles set suspended_at = now() where id = p_user and suspended_at is null;
    update auth.users set banned_until = 'infinity' where id = p_user;
    delete from auth.sessions where user_id = p_user;
    update public.tracks set status = 'suspended' where artist_id = p_user and status = 'active';
    update public.opportunities set closed = true where scout_id = p_user and not closed;
  else
    update public.profiles set suspended_at = null where id = p_user;
    update auth.users set banned_until = null where id = p_user;
    update public.tracks set status = 'active' where artist_id = p_user and status = 'suspended';
  end if;
end;
$$;

create function public.resolve_report(p_report uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  if p_status not in ('actioned', 'dismissed') then
    raise exception 'Geçersiz durum' using errcode = 'P0001', hint = 'invalid';
  end if;
  update public.reports set status = p_status, resolved_at = now(), resolved_by = auth.uid() where id = p_report;
end;
$$;

-- Kişinin oylarını sıralamada geçersiz sayar (arşivlenmiş dönemler değişmez). Dönüş: etkilenen oy sayısı.
create function public.void_votes(p_user uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  perform public.require_admin();
  update public.votes set counts = false where voter_id = p_user and counts;
  get diagnostics n = row_count;
  return n;
end;
$$;

create function public.set_editor_pick(p_track uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  if not public.is_active_track(p_track) then
    raise exception 'Parça bulunamadı' using errcode = 'P0001', hint = 'not_found';
  end if;
  insert into public.editor_picks (week_start, track_id, note, picked_by)
  values (public.period_start('week'), p_track, nullif(btrim(p_note), ''), auth.uid())
  on conflict (week_start) do update
    set track_id = excluded.track_id, note = excluded.note, picked_by = excluded.picked_by, created_at = now();
end;
$$;

-- Şüpheli oy kümeleri: son 30 günde oy veren ve aynı IP'yi paylaşan 3+ hesap. Otomatik işlem yok; admin inceler.
-- ponytail: auth.sessions sadece açık oturumları tutar; ortak IP (okul, mobil hat) yanlış alarm verebilir.
-- Yetmezse kayıtta IP + cihaz izi saklanır.
create function public.suspicious_vote_clusters()
returns table (ip text, users uuid[], votes int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return query
  select g.ip, g.users,
         (select count(*)::int from public.votes v where v.voter_id = any(g.users) and v.created_at > now() - interval '30 days')
  from (
    select host(s.ip) as ip, array_agg(distinct s.user_id) as users
    from auth.sessions s
    where s.ip is not null
      and exists (select 1 from public.votes v where v.voter_id = s.user_id and v.created_at > now() - interval '30 days')
    group by host(s.ip)
    having count(distinct s.user_id) >= 3
  ) g
  order by 3 desc;
end;
$$;

revoke execute on function
  public.require_admin(), public.set_track_status(uuid, text), public.admin_delete_comment(uuid),
  public.admin_close_opportunity(uuid), public.suspend_user(uuid, boolean), public.resolve_report(uuid, text),
  public.void_votes(uuid), public.set_editor_pick(uuid, text), public.suspicious_vote_clusters()
from public, anon;
grant execute on function
  public.require_admin(), public.set_track_status(uuid, text), public.admin_delete_comment(uuid),
  public.admin_close_opportunity(uuid), public.suspend_user(uuid, boolean), public.resolve_report(uuid, text),
  public.void_votes(uuid), public.set_editor_pick(uuid, text), public.suspicious_vote_clusters()
to authenticated;

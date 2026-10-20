-- Faz 6: keşifçi tarafı (SPEC §4.10 keşifçi filtreleri, §4.11, §4.11.1, §4.12)
-- Kural: onaysız keşifçi hiçbir özelliğe erişemez → her şey has_role('scout') kontrolünden geçer.

-- ── Rol: 'label' → 'scout' (yapımcı / plak şirketi / menajer; türü başvuruda) ──
alter table public.profiles drop constraint profiles_role_check;
update public.profiles set role = 'scout' where role = 'label';
alter table public.profiles add constraint profiles_role_check
  check (role in ('listener', 'artist', 'scout', 'admin'));

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
    'ara', 'sehir', 'tercihler', 'kesifci', 'firsatlar'
  )
);

-- Giriş yapan kullanıcının rolü bu mu?
create function public.has_role(p_role text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = p_role);
$$;

-- Türkiye saatiyle bugün
create function public.tr_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Istanbul')::date;
$$;

-- ── Başvuru ───────────────────────────────────────────────────────────────
-- Kişi başı tek satır; reddedilen 30 gün sonra aynı satırı yeniden 'pending' yapar.
create table public.scout_applications (
  user_id uuid primary key references public.profiles on delete cascade,
  kind text not null check (kind in ('producer', 'label', 'manager')),
  org_name text not null check (char_length(btrim(org_name)) between 2 and 80),
  website text check (website ~ '^https://[^\s]+$' and char_length(website) <= 200),
  contact_person text not null check (char_length(btrim(contact_person)) between 2 and 80),
  contact_email text not null check (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(contact_email) <= 254),
  about text not null check (char_length(btrim(about)) between 10 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index scout_applications_pending_idx on public.scout_applications (created_at) where status = 'pending';

alter table public.scout_applications enable row level security;
create policy "kendi başvurusunu veya admin hepsini görür" on public.scout_applications for select to authenticated
  using (user_id = (select auth.uid()) or public.has_role('admin'));
revoke all on public.scout_applications from anon, authenticated;
grant select on public.scout_applications to authenticated;

-- Onaylı keşifçinin herkese açık kimliği (rozet, ilgi gönderen). İletişim bilgisi yok.
create view public.scout_profiles as
  select user_id, kind, org_name, website from public.scout_applications where status = 'approved';
grant select on public.scout_profiles to anon, authenticated;

-- Başvur. Hata ipuçları: auth, role, pending, cooldown
create function public.apply_scout(
  p_kind text, p_org_name text, p_website text, p_contact_person text, p_contact_email text, p_about text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_app public.scout_applications;
begin
  if v_uid is null then
    raise exception 'Başvuru için giriş yap' using errcode = 'P0001', hint = 'auth';
  end if;
  if not public.has_role('listener') then
    raise exception 'Sadece dinleyici hesabıyla başvurulabilir' using errcode = 'P0001', hint = 'role';
  end if;
  select * into v_app from public.scout_applications where user_id = v_uid for update;
  if v_app.status = 'pending' then
    raise exception 'Başvurun zaten inceleniyor' using errcode = 'P0001', hint = 'pending';
  end if;
  if v_app.status = 'rejected' and v_app.reviewed_at > now() - interval '30 days' then
    raise exception 'Reddedilen başvurudan 30 gün sonra tekrar başvurabilirsin' using errcode = 'P0001', hint = 'cooldown';
  end if;
  insert into public.scout_applications (user_id, kind, org_name, website, contact_person, contact_email, about)
  values (v_uid, p_kind, btrim(p_org_name), nullif(btrim(p_website), ''), btrim(p_contact_person), btrim(p_contact_email), btrim(p_about))
  on conflict (user_id) do update set
    kind = excluded.kind, org_name = excluded.org_name, website = excluded.website,
    contact_person = excluded.contact_person, contact_email = excluded.contact_email, about = excluded.about,
    status = 'pending', created_at = now(), reviewed_at = null;
end;
$$;

-- Admin onaylar/reddeder. Onayda dinleyici → keşifçi. Hata ipuçları: role, not_found
create function public.approve_scout(p_user uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Sadece yönetici' using errcode = 'P0001', hint = 'role';
  end if;
  update public.scout_applications
  set status = case when p_approve then 'approved' else 'rejected' end, reviewed_at = now()
  where user_id = p_user and status = 'pending';
  if not found then
    raise exception 'Bekleyen başvuru yok' using errcode = 'P0001', hint = 'not_found';
  end if;
  if p_approve then
    update public.profiles set role = 'scout' where id = p_user and role = 'listener';
  end if;
end;
$$;

-- ── Favoriler + özel not (sadece sahibi görür) ────────────────────────────
create table public.scout_favorites (
  scout_id uuid not null references public.profiles on delete cascade,
  artist_id uuid not null references public.profiles on delete cascade,
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  primary key (scout_id, artist_id)
);

alter table public.scout_favorites enable row level security;
create policy "keşifçi kendi favorilerini yönetir" on public.scout_favorites for all to authenticated
  using (scout_id = (select auth.uid()) and public.has_role('scout'))
  with check (
    scout_id = (select auth.uid()) and public.has_role('scout')
    and exists (select 1 from public.profiles p where p.id = artist_id and p.role = 'artist')
  );
revoke all on public.scout_favorites from anon, authenticated;
grant select, delete, insert (scout_id, artist_id, note), update (note) on public.scout_favorites to authenticated;

-- ── İlgi → eşleşme ────────────────────────────────────────────────────────
-- PK sayesinde aynı keşifçi aynı sanatçıya bir kez ilgi gönderir; reddedilen tekrar gönderilemez.
create table public.interests (
  scout_id uuid not null references public.profiles on delete cascade,
  artist_id uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  source text not null default 'discover' check (source in ('discover', 'opportunity')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  primary key (scout_id, artist_id)
);
create index interests_artist_idx on public.interests (artist_id, created_at desc);
create index interests_scout_idx on public.interests (scout_id, created_at desc);

alter table public.interests enable row level security;
create policy "iki taraf görür" on public.interests for select to authenticated
  using (scout_id = (select auth.uid()) or artist_id = (select auth.uid()));
revoke all on public.interests from anon, authenticated;
grant select on public.interests to authenticated;

-- Hata ipuçları: auth, role, not_found, closed, already_sent, rate_limit
create function public.send_interest(p_artist uuid)
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
  if not exists (select 1 from public.profiles where id = p_artist and open_to_discovery) then
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

-- Sanatçı gelen ilgiyi kabul/ret eder. Hata ipucu: not_found
create function public.answer_interest(p_scout uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.interests
  set status = case when p_accept then 'accepted' else 'declined' end, answered_at = now()
  where scout_id = p_scout and artist_id = auth.uid() and status = 'pending';
  if not found then
    raise exception 'Bekleyen ilgi yok' using errcode = 'P0001', hint = 'not_found';
  end if;
end;
$$;

-- Eşleşmeler ve karşı tarafın iletişim e-postası. Sadece kabul edilmiş ilgiler.
-- Sanatçı iletişim e-postası eklemediyse email null döner.
create function public.my_matches()
returns table (scout_id uuid, artist_id uuid, other_id uuid, email text, contact_person text, matched_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.scout_id, i.artist_id,
         case when i.scout_id = auth.uid() then i.artist_id else i.scout_id end,
         case when i.scout_id = auth.uid() then c.email else a.contact_email end,
         case when i.artist_id = auth.uid() then a.contact_person end,
         i.answered_at
  from public.interests i
  left join public.artist_contacts c on c.profile_id = i.artist_id
  left join public.scout_applications a on a.user_id = i.scout_id
  where i.status = 'accepted' and auth.uid() in (i.scout_id, i.artist_id)
  order by i.answered_at desc;
$$;

-- ── Profil görüntüleme (sadece keşifçiler sayılır) ────────────────────────
create table public.profile_views (
  viewer_id uuid not null references public.profiles on delete cascade,
  profile_id uuid not null references public.profiles on delete cascade,
  day date not null,
  primary key (viewer_id, profile_id, day)
);
create index profile_views_profile_idx on public.profile_views (profile_id, day);

alter table public.profile_views enable row level security;
revoke all on public.profile_views from anon, authenticated;

create function public.record_profile_view(p_profile uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.profile_views (viewer_id, profile_id, day)
  select auth.uid(), p_profile, public.tr_today()
  where public.has_role('scout') and p_profile <> auth.uid()
    and exists (select 1 from public.profiles where id = p_profile and role = 'artist')
  on conflict do nothing;
$$;

-- ── Sanatçı istatistikleri (kendi hesabı) ─────────────────────────────────
create function public.artist_stats()
returns table (plays int, likes int, saves int, votes int, followers int, scout_views_week int)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (select id from public.tracks where artist_id = auth.uid())
  select
    (select count(*)::int from public.plays where track_id in (select id from mine) and counted_at is not null),
    (select count(*)::int from public.likes where track_id in (select id from mine)),
    (select count(*)::int from public.saves where track_id in (select id from mine)),
    (select count(*)::int from public.votes where track_id in (select id from mine) and counts),
    (select count(*)::int from public.follows where followee_id = auth.uid()),
    (select count(distinct viewer_id)::int from public.profile_views
     where profile_id = auth.uid() and day >= public.period_start('week'));
$$;

-- ── Gelişmiş arama (sadece keşifçi) ───────────────────────────────────────
-- p_sort: votes (toplam sayılan oy) | rising (bu haftaki oy) | new (yeni hesap)
-- ponytail: her çağrıda hesaplanır; sanatçı sayısı binleri geçince istatistik tablosuna çevir.
create function public.scout_search(
  p_genre text default null,
  p_city int default null,
  p_min_votes int default 0,
  p_open_only boolean default false,
  p_sort text default 'votes'
)
returns table (artist_id uuid, total_votes int, week_votes int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role('scout') then
    raise exception 'Sadece onaylı keşifçiler' using errcode = 'P0001', hint = 'role';
  end if;
  return query
  with totals as (
    select t.artist_id, sum(v.votes)::int as votes
    from public.track_vote_totals v join public.tracks t on t.id = v.track_id and t.status = 'active'
    group by t.artist_id
  ),
  week as (
    select r.artist_id, sum(r.score)::int as votes
    from public.compute_ranking('week', public.period_start('week')) r
    group by r.artist_id
  )
  select p.id, coalesce(tot.votes, 0), coalesce(w.votes, 0)
  from public.profiles p
  left join totals tot on tot.artist_id = p.id
  left join week w on w.artist_id = p.id
  where p.role = 'artist'
    and (p_genre is null or exists (
      select 1 from public.tracks t where t.artist_id = p.id and t.status = 'active' and t.genre = p_genre))
    and (p_city is null or p.city = p_city)
    and coalesce(tot.votes, 0) >= coalesce(p_min_votes, 0)
    and (not coalesce(p_open_only, false) or p.open_to_discovery)
  order by
    case p_sort when 'rising' then coalesce(w.votes, 0) when 'new' then 0 else coalesce(tot.votes, 0) end desc,
    p.created_at desc
  limit 50;
end;
$$;

-- ── Yetenek alarmı ────────────────────────────────────────────────────────
create table public.scout_alerts (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.profiles on delete cascade,
  genre text check (genre in ('rap', 'beat', 'pop', 'arabesk', 'rnb', 'rock', 'electronic', 'acoustic', 'folk')),
  city smallint check (city between 1 and 81),
  min_week_votes int not null default 1 check (min_week_votes between 1 and 1000),
  created_at timestamptz not null default now()
);
create index scout_alerts_scout_idx on public.scout_alerts (scout_id);

alter table public.scout_alerts enable row level security;
create policy "keşifçi kendi alarmlarını yönetir" on public.scout_alerts for all to authenticated
  using (scout_id = (select auth.uid()) and public.has_role('scout'))
  with check (scout_id = (select auth.uid()) and public.has_role('scout'));
revoke all on public.scout_alerts from anon, authenticated;
grant select, delete, insert (scout_id, genre, city, min_week_votes) on public.scout_alerts to authenticated;

create function public.enforce_alert_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('alert:' || new.scout_id::text));
  if (select count(*) from public.scout_alerts where scout_id = new.scout_id) >= 10 then
    raise exception 'En fazla 10 alarm kurabilirsin' using errcode = 'P0001', hint = 'alert_limit';
  end if;
  return new;
end;
$$;
create trigger scout_alerts_limit before insert on public.scout_alerts
  for each row execute function public.enforce_alert_limit();

-- Alarmlara uyan, bu hafta yükselen (yükselenler listesindeki) parçalar. RLS: sadece kendi alarmları.
-- ponytail: sayfa açılınca hesaplanır; bildirim (Faz 7) için pg_cron + "gösterildi" kaydı eklenecek.
create function public.alert_matches()
returns table (alert_id uuid, track_id uuid, artist_id uuid, score int)
language sql
stable
set search_path = ''
as $$
  select a.id, r.track_id, r.artist_id, r.score
  from public.scout_alerts a
  join public.rising_live r
    on (a.genre is null or r.genre = a.genre)
   and (a.city is null or r.city = a.city)
   and r.score >= a.min_week_votes
  order by r.score desc;
$$;

-- ── Fırsat panosu ─────────────────────────────────────────────────────────
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.profiles on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 80),
  seeking text not null check (seeking in ('rapper', 'vocal', 'beatmaker', 'stage', 'other')),
  genre text check (genre in ('rap', 'beat', 'pop', 'arabesk', 'rnb', 'rock', 'electronic', 'acoustic', 'folk')),
  city smallint check (city between 1 and 81),
  deadline date not null,
  body text not null check (char_length(btrim(body)) between 10 and 1000),
  closed boolean not null default false,
  created_at timestamptz not null default now()
);
create index opportunities_open_idx on public.opportunities (deadline) where not closed;
create index opportunities_scout_idx on public.opportunities (scout_id);

alter table public.opportunities enable row level security;
create policy "ilanlar herkese açık" on public.opportunities for select using (true);
create policy "keşifçi kendi ilanını açar" on public.opportunities for insert to authenticated
  with check (scout_id = (select auth.uid()) and public.has_role('scout'));
create policy "keşifçi kendi ilanını düzenler" on public.opportunities for update to authenticated
  using (scout_id = (select auth.uid()) and public.has_role('scout'))
  with check (scout_id = (select auth.uid()));
create policy "keşifçi kendi ilanını siler" on public.opportunities for delete to authenticated
  using (scout_id = (select auth.uid()));
revoke all on public.opportunities from anon, authenticated;
grant select on public.opportunities to anon, authenticated;
grant insert (scout_id, title, seeking, genre, city, deadline, body),
      update (title, seeking, genre, city, deadline, body, closed), delete
  on public.opportunities to authenticated;

create function public.is_open_opportunity(p_opp uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from public.opportunities where id = p_opp and not closed and deadline >= public.tr_today());
$$;

-- Son tarih en fazla 90 gün sonrası; keşifçi başına aynı anda en fazla 5 açık ilan.
create function public.check_opportunity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or new.deadline <> old.deadline)
     and new.deadline not between public.tr_today() and public.tr_today() + 90 then
    raise exception 'Son tarih bugünden itibaren en fazla 90 gün olabilir' using errcode = 'P0001', hint = 'deadline';
  end if;
  if not new.closed and new.deadline >= public.tr_today() then
    perform pg_advisory_xact_lock(hashtext('opp:' || new.scout_id::text));
    if (select count(*) from public.opportunities
        where scout_id = new.scout_id and id <> new.id and not closed and deadline >= public.tr_today()) >= 5 then
      raise exception 'Aynı anda en fazla 5 açık ilanın olabilir' using errcode = 'P0001', hint = 'open_limit';
    end if;
  end if;
  return new;
end;
$$;
create trigger opportunities_check before insert or update on public.opportunities
  for each row execute function public.check_opportunity();

-- Başvuru: sanatçı kendi aktif parçasıyla, açık ilana, ilan başına bir kez.
create table public.opportunity_applications (
  opportunity_id uuid not null references public.opportunities on delete cascade,
  artist_id uuid not null references public.profiles on delete cascade,
  track_id uuid not null references public.tracks on delete cascade,
  note text check (char_length(note) <= 300),
  status text not null default 'pending' check (status in ('pending', 'shortlisted', 'declined', 'matched')),
  created_at timestamptz not null default now(),
  primary key (opportunity_id, artist_id)
);
create index opportunity_applications_artist_idx on public.opportunity_applications (artist_id);

alter table public.opportunity_applications enable row level security;
create policy "başvuran ve ilan sahibi görür" on public.opportunity_applications for select to authenticated
  using (
    artist_id = (select auth.uid())
    or exists (select 1 from public.opportunities o where o.id = opportunity_id and o.scout_id = (select auth.uid()))
  );
create policy "sanatçı kendi parçasıyla açık ilana başvurur" on public.opportunity_applications for insert to authenticated
  with check (
    artist_id = (select auth.uid())
    and public.has_role('artist')
    and exists (select 1 from public.tracks t where t.id = track_id and t.artist_id = (select auth.uid()) and t.status = 'active')
    and public.is_open_opportunity(opportunity_id)
  );
create policy "sanatçı başvurusunu geri çeker" on public.opportunity_applications for delete to authenticated
  using (artist_id = (select auth.uid()) and status <> 'matched');
revoke all on public.opportunity_applications from anon, authenticated;
grant select, delete, insert (opportunity_id, artist_id, track_id, note) on public.opportunity_applications to authenticated;

-- İlan sahibi başvuruyu değerlendirir. 'matched' kesin: ilgi kabul edilmiş sayılır,
-- iletişim iki tarafa açılır (sanatçı başvurarak onay verdi). Hata ipuçları: role, invalid, not_found
create function public.review_application(p_opp uuid, p_artist uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.has_role('scout')
     or not exists (select 1 from public.opportunities where id = p_opp and scout_id = v_uid) then
    raise exception 'Sadece ilan sahibi' using errcode = 'P0001', hint = 'role';
  end if;
  if p_status not in ('shortlisted', 'declined', 'matched') then
    raise exception 'Geçersiz durum' using errcode = 'P0001', hint = 'invalid';
  end if;
  update public.opportunity_applications set status = p_status
  where opportunity_id = p_opp and artist_id = p_artist and status <> 'matched';
  if not found then
    raise exception 'Başvuru bulunamadı' using errcode = 'P0001', hint = 'not_found';
  end if;
  if p_status = 'matched' then
    insert into public.interests (scout_id, artist_id, status, source, answered_at)
    values (v_uid, p_artist, 'accepted', 'opportunity', now())
    on conflict (scout_id, artist_id) do update set status = 'accepted', answered_at = now();
  end if;
end;
$$;

-- ── Fonksiyon izinleri ────────────────────────────────────────────────────
revoke execute on function
  public.apply_scout(text, text, text, text, text, text), public.approve_scout(uuid, boolean),
  public.send_interest(uuid), public.answer_interest(uuid, boolean), public.my_matches(),
  public.record_profile_view(uuid), public.artist_stats(),
  public.scout_search(text, int, int, boolean, text), public.alert_matches(),
  public.review_application(uuid, uuid, text)
from public, anon;
grant execute on function
  public.apply_scout(text, text, text, text, text, text), public.approve_scout(uuid, boolean),
  public.send_interest(uuid), public.answer_interest(uuid, boolean), public.my_matches(),
  public.record_profile_view(uuid), public.artist_stats(),
  public.scout_search(text, int, int, boolean, text), public.alert_matches(),
  public.review_application(uuid, uuid, text)
to authenticated;

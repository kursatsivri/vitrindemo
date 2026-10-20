-- Faz 7b: haftalık challenge (SPEC §4.17)
-- Takvim: pazartesi–cuma katılım, oylama pazar 23:59'a kadar (normal oy kurallarıyla). Admin aday beat'lerden seçer.

-- Beatmaker'ın onayı: "challenge'a aday" = rapçiler bu beat'i challenge için kullanabilir.
alter table public.tracks
  add column challenge_candidate boolean not null default false check (not challenge_candidate or genre = 'beat');
grant insert (challenge_candidate), update (challenge_candidate) on public.tracks to authenticated;

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique check (extract(isodow from week_start) = 1),
  beat_track_id uuid not null references public.tracks on delete cascade,
  winner_track_id uuid references public.tracks on delete set null,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.challenges enable row level security;
create policy "challenge'lar herkese açık" on public.challenges for select using (true);
revoke all on public.challenges from anon, authenticated;
grant select on public.challenges to anon, authenticated;

-- Katılım = challenge_id'li parça. Sonradan değiştirilemez (update izni yok). Sanatçı başına 1 katılım.
alter table public.tracks add column challenge_id uuid references public.challenges on delete set null;
create unique index tracks_challenge_entry_idx on public.tracks (challenge_id, artist_id) where challenge_id is not null;
grant insert (challenge_id) on public.tracks to authenticated;

-- Admin bu hafta veya sonrası için challenge açar. Hata ipuçları: role, invalid, not_candidate, exists
create function public.create_challenge(p_week date, p_beat uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_beatmaker uuid;
begin
  perform public.require_admin();
  if extract(isodow from p_week) <> 1 or p_week < public.period_start('week') then
    raise exception 'Hafta bu haftanın veya sonraki bir haftanın pazartesisi olmalı' using errcode = 'P0001', hint = 'invalid';
  end if;
  select artist_id into v_beatmaker from public.tracks
  where id = p_beat and status = 'active' and genre = 'beat' and challenge_candidate;
  if v_beatmaker is null then
    raise exception 'Beat challenge''a aday değil' using errcode = 'P0001', hint = 'not_candidate';
  end if;
  if exists (select 1 from public.challenges where week_start = p_week) then
    raise exception 'O haftanın challenge''ı zaten var' using errcode = 'P0001', hint = 'exists';
  end if;
  insert into public.challenges (week_start, beat_track_id) values (p_week, p_beat) returning id into v_id;
  perform public.notify(v_beatmaker, 'challenge_beat', null, p_beat, v_id, jsonb_build_object('week_start', p_week));
  return v_id;
end;
$$;

-- Katılım kuralları: o haftanın challenge'ı, Türkiye saatiyle pazartesi–cuma, vokalli parça, beatmaker katılamaz.
create function public.check_challenge_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.challenges;
begin
  if new.challenge_id is null then
    return new;
  end if;
  select * into c from public.challenges where id = new.challenge_id;
  if c.week_start is distinct from public.period_start('week')
     or extract(isodow from now() at time zone 'Europe/Istanbul') > 5 then
    raise exception 'Bu challenge''a katılım kapalı' using errcode = 'P0001', hint = 'challenge_closed';
  end if;
  if new.genre = 'beat' then
    raise exception 'Challenge katılımı vokalli bir parça olmalı' using errcode = 'P0001', hint = 'challenge_genre';
  end if;
  if exists (select 1 from public.tracks b where b.id = c.beat_track_id and b.artist_id = new.artist_id) then
    raise exception 'Kendi beat''inin challenge''ına katılamazsın' using errcode = 'P0001', hint = 'own_beat';
  end if;
  return new;
end;
$$;
create trigger tracks_challenge_check before insert on public.tracks
  for each row execute function public.check_challenge_entry();

-- Katılınca beatmaker otomatik feat olur → katılımlara oy veremez (cast_vote kuralı).
create function public.add_challenge_beatmaker()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.challenge_id is not null then
    insert into public.track_features (track_id, artist_id)
    select new.id, b.artist_id
    from public.challenges c join public.tracks b on b.id = c.beat_track_id
    where c.id = new.challenge_id
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger tracks_challenge_feature after insert on public.tracks
  for each row execute function public.add_challenge_beatmaker();

-- Beatmaker feat'i challenge katılımından kaldırılamaz (yoksa beatmaker oy verebilirdi).
create function public.is_challenge_beatmaker(p_track uuid, p_artist uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tracks t
    join public.challenges c on c.id = t.challenge_id
    join public.tracks b on b.id = c.beat_track_id
    where t.id = p_track and b.artist_id = p_artist
  );
$$;
drop policy "parça sahibi veya etiketlenen kaldırır" on public.track_features;
create policy "parça sahibi veya etiketlenen kaldırır" on public.track_features
  for delete to authenticated
  using (
    (artist_id = (select auth.uid())
     or exists (select 1 from public.tracks t where t.id = track_id and t.artist_id = (select auth.uid())))
    and not public.is_challenge_beatmaker(track_id, artist_id)
  );

-- Haftalık 3 parça sınırı (Faz 2) — challenge katılımı sayılmaz.
create or replace function public.enforce_weekly_upload_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.challenge_id is not null then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('upload:' || new.artist_id::text));
  if (
    select count(*) from public.tracks
    where artist_id = new.artist_id
      and challenge_id is null
      and created_at >= date_trunc('week', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'
  ) >= 3 then
    raise exception 'Haftalık yükleme sınırı: en fazla 3 parça' using errcode = 'P0001', hint = 'weekly_limit';
  end if;
  return new;
end;
$$;

-- Challenge sıralaması: o haftanın sayılan oyları; eşitlikte son oyu daha erken alan üstte (sıralamayla aynı kural).
create function public.challenge_standings(p_challenge uuid)
returns table (track_id uuid, artist_id uuid, score int, last_vote_at timestamptz, rank int)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.artist_id, count(v.voter_id)::int, max(v.created_at),
         (rank() over (order by count(v.voter_id) desc, max(v.created_at)))::int
  from public.tracks t
  join public.challenges c on c.id = t.challenge_id
  left join public.votes v on v.track_id = t.id and v.counts and v.week_start = c.week_start
  where t.challenge_id = p_challenge and t.status = 'active'
  group by t.id, t.artist_id
  order by 5;
$$;
grant execute on function public.challenge_standings(uuid) to anon, authenticated;

-- Biten haftaların kazananını yazar (en az 1 oy gerekir), kazanana ve beatmaker'a bildirim. Idempotent.
create function public.finish_challenges()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  v_winner uuid;
  n int := 0;
begin
  for c in
    select ch.*, b.artist_id as beatmaker from public.challenges ch join public.tracks b on b.id = ch.beat_track_id
    where ch.week_start < public.period_start('week') and ch.finished_at is null
  loop
    select s.track_id into v_winner from public.challenge_standings(c.id) s where s.score > 0 order by s.rank limit 1;
    update public.challenges set winner_track_id = v_winner, finished_at = now() where id = c.id;
    if v_winner is not null then
      perform public.notify((select artist_id from public.tracks where id = v_winner), 'challenge_win', null, v_winner, c.id,
                            jsonb_build_object('role', 'winner'));
      perform public.notify(c.beatmaker, 'challenge_win', (select artist_id from public.tracks where id = v_winner), v_winner, c.id,
                            jsonb_build_object('role', 'beatmaker'));
    end if;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function public.finish_challenges() from public, anon, authenticated;
-- Her gün 00:05 Türkiye; pazartesi biten haftayı kapatır
select cron.schedule('finish_challenges', '5 21 * * *', $$select public.finish_challenges()$$);

revoke execute on function public.create_challenge(date, uuid) from public, anon;
grant execute on function public.create_challenge(date, uuid) to authenticated;

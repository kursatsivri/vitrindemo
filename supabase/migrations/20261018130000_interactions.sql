-- Faz 3B: beğeni, kaydet, takip, yorum, yapılandırılmış geri bildirim (SPEC §4.5)

-- Görünür (aktif) parça mı? Politika içinde tekrar tekrar kullanılıyor.
create function public.is_active_track(p_track uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from public.tracks where id = p_track and status = 'active');
$$;

-- ── Beğeni: sıralamayı etkilemez, sayısı herkese açık ─────────────────────
create table public.likes (
  user_id uuid not null references public.profiles on delete cascade,
  track_id uuid not null references public.tracks on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);
create index likes_track_idx on public.likes (track_id);

alter table public.likes enable row level security;
create policy "beğeniler herkese açık" on public.likes for select using (true);
create policy "kendi adına beğenir" on public.likes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_track(track_id));
create policy "kendi beğenisini geri alır" on public.likes for delete to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on public.likes from anon, authenticated;
grant insert (user_id, track_id), delete on public.likes to authenticated;

-- ── Kaydet: kişisel kitaplık, sadece sahibi görür ─────────────────────────
create table public.saves (
  user_id uuid not null references public.profiles on delete cascade,
  track_id uuid not null references public.tracks on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);
create index saves_track_idx on public.saves (track_id);

alter table public.saves enable row level security;
create policy "kaydettiklerini görür" on public.saves for select to authenticated
  using (user_id = (select auth.uid()));
create policy "kendi kitaplığına ekler" on public.saves for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_track(track_id));
create policy "kendi kitaplığından çıkarır" on public.saves for delete to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on public.saves from anon, authenticated;
grant insert (user_id, track_id), delete on public.saves to authenticated;

-- ── Takip ─────────────────────────────────────────────────────────────────
create table public.follows (
  follower_id uuid not null references public.profiles on delete cascade,
  followee_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;
create policy "takipler herkese açık" on public.follows for select using (true);
create policy "kendi adına takip eder" on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()));
create policy "kendi takibini bırakır" on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));

revoke insert, update, delete on public.follows from anon, authenticated;
grant insert (follower_id, followee_id), delete on public.follows to authenticated;

-- ── Yorum ─────────────────────────────────────────────────────────────────
alter table public.tracks add column comments_enabled boolean not null default true;
grant update (comments_enabled) on public.tracks to authenticated;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks on delete cascade,
  author_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  -- Zaman damgası: yorum parçanın bu saniyesine bağlı (opsiyonel)
  at_sec int check (at_sec between 0 and 3600),
  created_at timestamptz not null default now()
);
create index comments_track_idx on public.comments (track_id, created_at desc);
create index comments_author_idx on public.comments (author_id, created_at desc);

alter table public.comments enable row level security;
-- Parçayı görebilen yorumlarını da görür (tracks RLS'i geçerli).
create policy "görünen parçanın yorumları" on public.comments for select
  using (exists (select 1 from public.tracks t where t.id = track_id));
create policy "açık parçaya kendi adına yorum" on public.comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.tracks t where t.id = track_id and t.status = 'active' and t.comments_enabled
    )
  );
-- Yazan kendi yorumunu, parça sahibi parçasındaki her yorumu siler.
create policy "yazan veya parça sahibi siler" on public.comments for delete to authenticated
  using (
    author_id = (select auth.uid())
    or exists (select 1 from public.tracks t where t.id = track_id and t.artist_id = (select auth.uid()))
  );

revoke insert, update, delete on public.comments from anon, authenticated;
grant insert (track_id, author_id, body, at_sec), delete on public.comments to authenticated;

-- Küfür listesi: büyük/küçük harf duyarsız regex kalıpları (\m \M = kelime başı/sonu).
-- İstemciler okuyamaz; admin yeni kalıp ekleyerek genişletir.
create table public.banned_terms (pattern text primary key);
alter table public.banned_terms enable row level security;
revoke all on public.banned_terms from anon, authenticated;

-- Masum kelimeleri yakalamasın diye dar tutuldu: "got"/"pic" (İngilizce), "Amine" (isim),
-- "götür", "ananı özledim" gibi kullanımlar engellenmez.
insert into public.banned_terms (pattern) values
  ('\mamk\M'), ('\mamq\M'), ('\maq\M'), ('\mam[ıi]na\M'), ('\mamc[ıi]k'), ('\morospu'),
  ('\mpiç\M'), ('\mpiçlik'), ('\ms[iı]k(tir|erim|eyim|im\M|ik\M|iş|ti\M|ecem|ece[gğ]im)'),
  ('\myar+a[kğ]'), ('\mgöt(\M|ün|ü\M|veren|lek)'),
  ('\mkahpe'), ('\mpezevenk'), ('\mibne'), ('\mo[çc]\M'), ('\mgavat'), ('\mkaltak'), ('\myav[şs]ak');

-- Küfür ve spam kontrolü (dakikada 5, günde 50 yorum).
create function public.check_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.banned_terms b where new.body ~* b.pattern) then
    raise exception 'Yorum uygunsuz ifade içeriyor' using errcode = 'P0001', hint = 'profanity';
  end if;
  if (select count(*) from public.comments
      where author_id = new.author_id and created_at > now() - interval '1 minute') >= 5
  or (select count(*) from public.comments
      where author_id = new.author_id and created_at > now() - interval '1 day') >= 50 then
    raise exception 'Çok hızlı yorum yapıyorsun' using errcode = 'P0001', hint = 'rate_limit';
  end if;
  return new;
end;
$$;

create trigger comments_check
  before insert on public.comments
  for each row execute function public.check_comment();

-- ── Yapılandırılmış geri bildirim (4 kriter, 1–5) ─────────────────────────
-- Vokalli parçada: vokal, flow/ritim, söz, prodüksiyon. Beat'te: melodi, davul/ritim, mix, özgünlük.
create table public.ratings (
  user_id uuid not null references public.profiles on delete cascade,
  track_id uuid not null references public.tracks on delete cascade,
  s1 smallint not null check (s1 between 1 and 5),
  s2 smallint not null check (s2 between 1 and 5),
  s3 smallint not null check (s3 between 1 and 5),
  s4 smallint not null check (s4 between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);
create index ratings_track_idx on public.ratings (track_id);

alter table public.ratings enable row level security;

-- Puan vermek için: aktif parça, kendi parçası değil, en az bir kez 30 sn dinlemiş (plays.counted_at).
create function public.can_rate(p_track uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from public.tracks t where t.id = p_track and t.status = 'active' and t.artist_id <> (select auth.uid()))
     and exists (select 1 from public.plays p where p.track_id = p_track and p.user_id = (select auth.uid()) and p.counted_at is not null);
$$;

create policy "kendi puanını görür" on public.ratings for select to authenticated
  using (user_id = (select auth.uid()));
create policy "dinlediği parçaya puan verir" on public.ratings for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_rate(track_id));
create policy "kendi puanını değiştirir" on public.ratings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.can_rate(track_id));

revoke insert, update, delete on public.ratings from anon, authenticated;
grant insert (user_id, track_id, s1, s2, s3, s4) on public.ratings to authenticated;
grant update (s1, s2, s3, s4) on public.ratings to authenticated;

-- Ortalama sadece en az 5 puanlamadan sonra görünür (tek kişinin puanı ifşa olmasın).
create function public.rating_summary(p_track uuid)
returns table (n int, a1 numeric, a2 numeric, a3 numeric, a4 numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int,
         case when count(*) >= 5 then round(avg(s1), 1) end,
         case when count(*) >= 5 then round(avg(s2), 1) end,
         case when count(*) >= 5 then round(avg(s3), 1) end,
         case when count(*) >= 5 then round(avg(s4), 1) end
  from public.ratings r
  where r.track_id = p_track and public.is_active_track(p_track);
$$;

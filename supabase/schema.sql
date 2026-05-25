create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 2 and 24),
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.friend_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.friend_group_members (
  group_id uuid not null references public.friend_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.friend_groups(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz,
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.friend_groups(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  local_id text not null,
  group_id uuid references public.friend_groups(id) on delete set null,
  season_id uuid references public.seasons(id) on delete set null,
  score integer not null check (score between 0 and 450),
  summary text,
  played_at timestamptz not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (owner_id, local_id)
);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_username text;
  final_username text;
begin
  raw_username := coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), 'jugador');
  final_username := lower(regexp_replace(raw_username, '[^a-zA-Z0-9]+', '-', 'g'));
  final_username := trim(both '-' from final_username);
  if char_length(final_username) < 2 then
    final_username := 'jugador-' || substr(new.id::text, 1, 8);
  end if;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data ->> 'display_name', final_username)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;
alter table public.friend_groups enable row level security;
alter table public.friend_group_members enable row level security;
alter table public.invites enable row level security;
alter table public.seasons enable row level security;
alter table public.games enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "group_select_members" on public.friend_groups;
create policy "group_select_members"
  on public.friend_groups for select
  to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.friend_group_members m
      where m.group_id = id and m.user_id = auth.uid()
    )
  );

drop policy if exists "group_insert_owner" on public.friend_groups;
create policy "group_insert_owner"
  on public.friend_groups for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "member_select_own_groups" on public.friend_group_members;
create policy "member_select_own_groups"
  on public.friend_group_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.friend_groups g
      where g.id = group_id and g.owner_id = auth.uid()
    )
  );

drop policy if exists "member_insert_self_or_owner" on public.friend_group_members;
create policy "member_insert_self_or_owner"
  on public.friend_group_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.friend_groups g
      where g.id = group_id and g.owner_id = auth.uid()
    )
  );

drop policy if exists "invites_select_authenticated_unused" on public.invites;
create policy "invites_select_authenticated_unused"
  on public.invites for select
  to authenticated
  using (
    used_at is null
    or created_by = auth.uid()
    or used_by = auth.uid()
  );

drop policy if exists "invites_insert_group_member" on public.invites;
create policy "invites_insert_group_member"
  on public.invites for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.friend_group_members m
      where m.group_id = group_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "invites_update_authenticated" on public.invites;
create policy "invites_update_authenticated"
  on public.invites for update
  to authenticated
  using (used_at is null)
  with check (used_by = auth.uid());

drop policy if exists "seasons_select_group_members" on public.seasons;
create policy "seasons_select_group_members"
  on public.seasons for select
  to authenticated
  using (
    exists (
      select 1 from public.friend_group_members m
      where m.group_id = group_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "seasons_insert_group_members" on public.seasons;
create policy "seasons_insert_group_members"
  on public.seasons for insert
  to authenticated
  with check (
    exists (
      select 1 from public.friend_group_members m
      where m.group_id = group_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "games_select_owner_or_group" on public.games;
create policy "games_select_owner_or_group"
  on public.games for select
  to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.friend_group_members m
      where m.group_id = group_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "games_upsert_owner" on public.games;
create policy "games_upsert_owner"
  on public.games for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "games_update_owner" on public.games;
create policy "games_update_owner"
  on public.games for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

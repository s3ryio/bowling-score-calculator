drop policy if exists "member_select_own_groups" on public.friend_group_members;
create policy "member_select_own_groups"
  on public.friend_group_members for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "member_insert_self_or_owner" on public.friend_group_members;
drop policy if exists "member_insert_self" on public.friend_group_members;
create policy "member_insert_self"
  on public.friend_group_members for insert
  to authenticated
  with check (user_id = auth.uid());

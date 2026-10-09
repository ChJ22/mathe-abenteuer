-- Im Supabase SQL Editor ausführen. Eigene Tabelle; verändert keine Sprachtrainer-Daten.
begin;
create table if not exists public.mathe_game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 2000000),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.mathe_game_saves enable row level security;
revoke all on public.mathe_game_saves from anon, authenticated;
grant select on public.mathe_game_saves to authenticated;
drop policy if exists mathe_read_own on public.mathe_game_saves;
create policy mathe_read_own on public.mathe_game_saves for select to authenticated
using ((select auth.uid()) = user_id);

-- Schreibvorgänge nur über die Funktion, damit ältere Geräte keine neueren Stände überschreiben.
create or replace function public.mathe_save(p_state jsonb, p_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  row_data public.mathe_game_saves%rowtype;
begin
  if uid is null then raise exception 'Anmeldung erforderlich' using errcode='42501'; end if;
  if p_revision is null or p_revision < 0 or p_state is null
     or jsonb_typeof(p_state) <> 'object' or octet_length(p_state::text) > 2000000 then
    raise exception 'Ungültiger Spielstand' using errcode='22023';
  end if;
  -- Serialisiert auch den ersten Schreibvorgang eines Kontos.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text, 0));
  select * into row_data from public.mathe_game_saves where user_id=uid for update;
  if found then
    if row_data.revision <> p_revision then
      return jsonb_build_object('conflict',true,'revision',row_data.revision,'state',row_data.state);
    end if;
    update public.mathe_game_saves set state=p_state, revision=revision+1, updated_at=now()
      where user_id=uid returning * into row_data;
  else
    if p_revision <> 0 then
      return jsonb_build_object('conflict',true,'revision',0,'state',null);
    end if;
    insert into public.mathe_game_saves(user_id,state) values(uid,p_state) returning * into row_data;
  end if;
  return jsonb_build_object('conflict',false,'revision',row_data.revision,'updated_at',row_data.updated_at);
end;
$$;
revoke all on function public.mathe_save(jsonb,bigint) from public, anon, authenticated;
grant execute on function public.mathe_save(jsonb,bigint) to authenticated;
commit;

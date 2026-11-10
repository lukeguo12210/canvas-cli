begin;
create table public.canvas_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  school_id text not null,
  school_name text not null,
  canvas_origin text not null check(canvas_origin ~ '^https://[^/]+$'),
  canvas_user_id text not null,
  canvas_display_name text not null,
  encrypted_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.canvas_connections enable row level security;
-- No browser or OAuth user can access credential rows, including ciphertext.
revoke all on public.canvas_connections from public, anon, authenticated;
grant select,insert,update,delete on public.canvas_connections to service_role;

create table public.request_buckets (
  bucket text primary key,
  window_start timestamptz not null,
  count integer not null
);
alter table public.request_buckets enable row level security;
revoke all on public.request_buckets from public,anon,authenticated;
grant all on public.request_buckets to service_role;
create function public.take_request(p_bucket text,p_limit integer) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  insert into public.request_buckets(bucket,window_start,count)
  values (p_bucket,date_trunc('minute',now()),1)
  on conflict(bucket) do update set
    count=case when request_buckets.window_start=date_trunc('minute',now()) then request_buckets.count+1 else 1 end,
    window_start=date_trunc('minute',now())
  returning count into n;
  return n<=p_limit;
end; $$;
revoke all on function public.take_request(text,integer) from public,anon,authenticated;
grant execute on function public.take_request(text,integer) to service_role;

-- JWT signature alone cannot prove a session has not been revoked.
grant select on auth.sessions to service_role;
create function public.session_is_active(p_user uuid,p_session uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
 select exists(select 1 from auth.sessions where id=p_session and user_id=p_user and (not_after is null or not_after>now()));
$$;
revoke all on function public.session_is_active(uuid,uuid) from public,anon,authenticated;
grant execute on function public.session_is_active(uuid,uuid) to service_role;

-- OAuth access-token hook: keep regular website tokens separate from MCP tokens.
-- Registered OAuth clients are restricted to this one resource by a fixed audience.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create table private.runtime_config(key text primary key,value text not null);
revoke all on private.runtime_config from public,anon,authenticated;
create function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare claims jsonb; mcp_resource text;
begin
 claims:=event->'claims';
 if coalesce(event->>'client_id',claims->>'client_id','')<>'' then
   select value into mcp_resource from private.runtime_config where key='mcp_resource';
   if mcp_resource is null then raise exception 'MCP audience is not configured'; end if;
   claims:=jsonb_set(claims,'{aud}',to_jsonb(mcp_resource));
   claims:=jsonb_set(claims,'{scope}',to_jsonb('canvas:read'::text));
 end if;
 return jsonb_set(event,'{claims}',claims);
end; $$;
grant usage on schema private to supabase_auth_admin;
grant select on private.runtime_config to supabase_auth_admin;
revoke all on function public.custom_access_token_hook(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
commit;

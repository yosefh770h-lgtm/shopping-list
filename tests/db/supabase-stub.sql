-- Minimal Supabase-like environment for testing schema.sql locally

do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='supabase_admin') then create role supabase_admin nologin; end if;
end $$;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists auth;
create table if not exists auth.users(id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}', created_at timestamptz default now(), last_sign_in_at timestamptz, updated_at timestamptz default now(), phone text, banned_until timestamptz, deleted_at timestamptz, is_anonymous boolean default false);
-- GoTrue columns used by the v20 email/password guards
alter table auth.users add column if not exists encrypted_password text, add column if not exists email_change text default '';
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true),''),'anon') $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
create table if not exists auth.identities(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, provider text, identity_data jsonb);
create table if not exists auth.mfa_factors(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, factor_type text default 'totp', status text default 'unverified');
create table if not exists auth.sessions(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade);
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;
create schema if not exists net;
create table if not exists net.calls(id bigserial, url text, body jsonb, headers jsonb, at timestamptz default now());
create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint language sql as $$ insert into net.calls(url,body,headers) values(url,body,headers) returning id $$;
do $$ begin if not exists (select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime; end if; end $$;
create schema if not exists storage;
create table if not exists storage.buckets(id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid, created_at timestamptz default now());
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, delete on storage.objects to anon, authenticated;
create schema if not exists vault;
create schema if not exists cron;
create table if not exists cron.job(jobname text primary key, schedule text, command text);
create or replace function cron.schedule(job_name text, schedule text, command text) returns bigint language plpgsql as $$
begin insert into cron.job values (job_name, schedule, command) on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command; return 1; end $$;
-- כמו Supabase אחרי 30.10.2026: טבלאות ורצפים חדשים לא מקבלים גישה אוטומטית — schema.sql צריך לדאוג לזה בעצמו.
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- =====================================================================
--  רשימת קניות — מבנה מסד הנתונים ב-Supabase + חוקי אבטחה (RLS)
--  איך מריצים: Supabase → SQL Editor → New query → מדביקים את כל הקובץ → Run
--  אפשר להריץ שוב בבטחה (הכל כתוב כך שלא ישבור נתונים קיימים).
-- =====================================================================

-- ---------- הרשאות ברירת מחדל לטבלאות חדשות ----------
-- מ-30.10.2026 Supabase כבר לא נותן אוטומטית ל-anon/authenticated/service_role גישה לטבלאות חדשות ב-public.
-- כל הקובץ הזה בנוי על ההתנהגות הקודמת (גישה כברירת מחדל, ו-RLS + revoke חוסמים מה שצריך), אז מחזירים אותה כאן,
-- לפני שנוצרת אף טבלה. משפיע רק על טבלאות/רצפים שייווצרו מעכשיו — טבלאות קיימות לא משתנות.
alter default privileges in schema public grant select, insert, update, delete, truncate, references, trigger on tables to anon, authenticated, service_role;
alter default privileges in schema public grant usage, select, update on sequences to anon, authenticated, service_role;

-- ---------- מנהל האתר וצוות ----------
-- הבעלים: רק המיילים האלה (מאומתים) — היחיד שיכול להוסיף/להסיר צוות.
-- צוות נוסף נשמר לפי מזהה משתמש (לא לפי מייל), כך שאי אפשר "לתפוס" הרשאה ע"י הרשמה עם מייל של מישהו אחר.
create table if not exists public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','moderator')),
  added_at timestamptz not null default now()
);
alter table public.staff enable row level security;

-- 🔐 אימות דו-שלבי: מי שהפעיל קוד מאפליקציית Authenticator מקבל הרשאות ניהול רק אחרי שהקליד את הקוד בכניסה הזאת (aal2).
--    מי שעוד לא הפעיל — לא משתנה לו כלום. כך סיסמה שדלפה לבד לא מספיקה כדי להיכנס לבק אופיס.
-- אין כיבוי של האימות הדו-שלבי לכל הצוות בבת אחת (סיסמה של הבעלים שדלפה הייתה מספיקה כדי לבטל את ההגנה לכולם).
-- הטבלה mfa_settings נשארת רק כדי שלא יישבר כלום; מי שאיבד טלפון — mfa_reset() רק לו.
create table if not exists public.mfa_settings (id int primary key default 1 check (id = 1), off boolean not null default false, updated_at timestamptz not null default now());
insert into public.mfa_settings(id) values (1) on conflict (id) do nothing;
alter table public.mfa_settings enable row level security;
revoke all on public.mfa_settings from anon, authenticated;
create or replace function public.mfa_ok() returns boolean
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if coalesce(auth.jwt()->>'aal', '') = 'aal2' then return true; end if;
  return not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status::text = 'verified');
exception when undefined_table then return true;
end $$;
revoke all on function public.mfa_ok() from public, anon;
grant execute on function public.mfa_ok() to authenticated;
-- הבעלים: רק חשבון שסומן בעלים ב-app_metadata (yam_owner = true). שום מייל לא כתוב בקוד כבעלים.
-- את app_metadata משתמש לא יכול לשנות בעצמו — רק SQL או השרת. (p_email נשאר רק כדי שהחתימה לא תשתנה)
create or replace function public.yam_owner_match(p_email text, p_meta jsonb) returns boolean
language sql stable set search_path = public as $$
  select coalesce(p_meta->>'yam_owner', '') = 'true';
$$;
create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and public.yam_owner_match(u.email, u.raw_app_meta_data)
      and u.email_confirmed_at is not null
  ) and public.mfa_ok();
$$;
-- מנהל = הבעלים או מנהל נוסף
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select public.is_owner() or (exists (select 1 from public.staff where user_id = auth.uid() and role = 'admin') and public.mfa_ok());
$$;
-- צוות = מנהלים + צוות פיקוח
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select public.is_admin() or (exists (select 1 from public.staff where user_id = auth.uid() and role = 'moderator') and public.mfa_ok());
$$;
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public, auth as $$
  select case when public.is_owner() then 'owner'
              else (select role from public.staff where user_id = auth.uid() and public.mfa_ok()) end;
$$;
drop policy if exists "staff read" on public.staff;
create policy "staff read" on public.staff for select using (user_id = auth.uid() or public.is_admin());

-- הוספת איש צוות (רק הבעלים). המשתמש חייב להיות רשום כבר באתר.
create or replace function public.staff_add(p_email text, p_role text) returns text
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not public.is_owner() then return 'forbidden'; end if;
  if p_role not in ('admin','moderator') then return 'bad_role'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if uid is null then return 'not_found'; end if;
  if uid = auth.uid() then return 'owner'; end if;
  insert into public.staff(user_id, role) values (uid, p_role)
  on conflict (user_id) do update set role = excluded.role;
  return 'ok';
end $$;
create or replace function public.staff_remove(p_user uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.staff where user_id = p_user and public.is_owner();
$$;
create or replace function public.staff_list() returns table(user_id uuid, role text, name text, email text, added_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  return query
  select s.user_id, s.role, coalesce(p.name,'')::text, coalesce(u.email,'')::text, s.added_at
  from public.staff s join auth.users u on u.id = s.user_id left join public.profiles p on p.id = s.user_id
  where public.is_admin() order by s.added_at;
end $$;

-- ---------- פרופילים (שם + מייל של כל מי שהצטרף) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.profiles add column if not exists updates_seen_at timestamptz not null default now();
alter table public.profiles add column if not exists rep_bonus int not null default 0;
alter table public.profiles add column if not exists feed_seen_at timestamptz not null default now();
alter table public.profiles enable row level security;
drop policy if exists "profiles self read" on public.profiles;
drop policy if exists "profiles admin read" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "profiles admin delete" on public.profiles;
create policy "profiles self read"   on public.profiles for select using (id = auth.uid());
create policy "profiles admin read"  on public.profiles for select using (public.is_admin());
create policy "profiles self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles admin delete" on public.profiles for delete using (public.is_admin());
-- המשתמש לא יכול לשנות לעצמו את המייל ידנית — המייל תמיד מגיע ממערכת ההתחברות
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  new.email := coalesce((select email from auth.users where id = new.id), '');
  new.name := left(coalesce(new.name, ''), 40);
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles
  for each row execute function public.profiles_guard();

revoke update on public.profiles from anon, authenticated;
grant update (name, last_seen, updates_seen_at, feed_seen_at) on public.profiles to authenticated;

-- יצירת פרופיל אוטומטית בהרשמה
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, name, email)
  values (new.id,
          left(coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), 40),
          coalesce(new.email,''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- "אני מחובר" — מתעדכן כל דקה מהאתר
create or replace function public.touch_presence(p_name text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.profiles(id, name) values (auth.uid(), coalesce(left(p_name,40),''))
  on conflict (id) do update
    set last_seen = now(),
        name = case when coalesce(p_name,'') <> '' then left(p_name,40) else public.profiles.name end;
end $$;

-- ---------- חדרים (הרשימות של המשפחה, מסונכרנות בזמן אמת) ----------
create table if not exists public.rooms (
  code text primary key,
  owner uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_by text,
  updated_at timestamptz not null default now()
);
create table if not exists public.room_members (
  room_code text not null references public.rooms(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_code, user_id)
);
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
create or replace function public.is_room_member(p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.room_members where room_code = p_code and user_id = auth.uid());
$$;
drop policy if exists "rooms member read" on public.rooms;
drop policy if exists "rooms member write" on public.rooms;
create policy "rooms member read"  on public.rooms for select using (public.is_room_member(code));
create policy "rooms member write" on public.rooms for update using (public.is_room_member(code)) with check (public.is_room_member(code));
-- חברי החדר יכולים לעדכן רק את התוכן — לא את הבעלים או הקוד
revoke update on public.rooms from anon, authenticated;
grant update (data, updated_by, updated_at) on public.rooms to authenticated;
drop policy if exists "members self read" on public.room_members;
create policy "members self read" on public.room_members for select using (user_id = auth.uid());

-- החדר האישי שלי (נוצר פעם אחת, קוד אקראי שאי אפשר לנחש)
create or replace function public.ensure_my_room() returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select code into c from public.rooms where owner = auth.uid() order by updated_at limit 1;
  if c is null then
    c := 'YAM' || upper(substr(md5(gen_random_uuid()::text), 1, 9));
    insert into public.rooms(code, owner) values (c, auth.uid());
  end if;
  insert into public.room_members(room_code, user_id) values (c, auth.uid()) on conflict do nothing;
  return c;
end $$;

-- הצטרפות לרשימה של בן משפחה עם הקוד שהוא שלח
create or replace function public.join_room(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if not exists(select 1 from public.rooms where code = upper(trim(p_code))) then return false; end if;
  insert into public.room_members(room_code, user_id) values (upper(trim(p_code)), auth.uid()) on conflict do nothing;
  return true;
end $$;
create or replace function public.leave_room(p_code text) returns void
language sql security definer set search_path = public as $$
  delete from public.room_members where room_code = upper(trim(p_code)) and user_id = auth.uid()
    and not exists(select 1 from public.rooms where code = upper(trim(p_code)) and owner = auth.uid());
$$;

-- ---------- הגדרות האתר (נשלט מהבק אופיס) ----------
create table if not exists public.site_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_config enable row level security;
drop policy if exists "config read" on public.site_config;
drop policy if exists "config admin write" on public.site_config;
create policy "config read" on public.site_config for select using (key <> 'ai' or public.is_admin());
create policy "config admin write" on public.site_config for all using (public.is_admin()) with check (public.is_admin());

-- ---------- מתכונים (כל אחד שולח — המנהל מאשר) ----------
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  emoji text not null default '🍽️',
  req text[] not null default '{}',
  opt text[] not null default '{}',
  steps text not null check (char_length(steps) between 1 and 8000),
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  author_name text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
alter table public.recipes enable row level security;
drop policy if exists "recipes read approved" on public.recipes;
drop policy if exists "recipes read own" on public.recipes;
drop policy if exists "recipes submit" on public.recipes;
drop policy if exists "recipes admin" on public.recipes;
create policy "recipes read approved" on public.recipes for select using (status = 'approved');
create policy "recipes read own"      on public.recipes for select using (author_id = auth.uid());
create policy "recipes submit"        on public.recipes for insert with check (auth.uid() is not null and author_id = auth.uid() and status = 'pending');
create policy "recipes admin"         on public.recipes for all using (public.is_staff()) with check (public.is_staff());

-- ---------- מה שלימדו את הבוט (אישי → המנהל מאשר לכולם) ----------
create table if not exists public.bot_knowledge (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 1 and 300),
  answer text not null check (char_length(answer) between 1 and 2000),
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  author_name text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
alter table public.bot_knowledge enable row level security;
drop policy if exists "kb read approved" on public.bot_knowledge;
drop policy if exists "kb submit" on public.bot_knowledge;
drop policy if exists "kb admin" on public.bot_knowledge;
create policy "kb read approved" on public.bot_knowledge for select using (status = 'approved');
create policy "kb submit"        on public.bot_knowledge for insert with check (auth.uid() is not null and author_id = auth.uid() and status = 'pending');
create policy "kb admin"         on public.bot_knowledge for all using (public.is_staff()) with check (public.is_staff());

-- ---------- רשתות, סניפים ומחירים ----------
create table if not exists public.chains (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 40),
  kind text not null default 'store' check (kind in ('store','online')),
  website text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  chain text not null check (char_length(chain) between 1 and 40),
  city text not null check (char_length(city) between 1 and 40),
  address text not null default '' check (char_length(address) <= 120),
  name text not null default '' check (char_length(name) <= 60),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index if not exists branches_uniq on public.branches (chain, city, address);
-- חנות/סניף שמשתמש מוסיף מחכה לאישור מנהל; מה שהצוות מוסיף — מאושר מיד
alter table public.chains add column if not exists status text not null default 'approved' check (status in ('pending','approved'));
alter table public.branches add column if not exists status text not null default 'approved' check (status in ('pending','approved'));
-- סוג החנות (לסידור לפי קטגוריות)
alter table public.chains add column if not exists category text not null default 'supermarket'
  check (category in ('supermarket','grocery','produce','butcher','bakery','pharm','home','online','other'));
update public.chains set category = 'online' where kind = 'online' and category = 'supermarket';
create table if not exists public.prices (
  id uuid primary key default gen_random_uuid(),
  product text not null check (char_length(product) between 1 and 60),
  product_key text not null,
  chain text not null check (char_length(chain) between 1 and 40),
  branch text not null default '' check (char_length(branch) <= 120),
  price numeric(10,2) not null check (price > 0 and price < 100000),
  barcode text check (barcode is null or barcode ~ '^[0-9]{4,20}$'),
  by_id uuid default auth.uid(),
  by_name text not null default '',
  confirms int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists prices_key on public.prices (product_key);
alter table public.prices add column if not exists status text not null default 'approved' check (status in ('pending','approved'));
alter table public.prices add column if not exists verified boolean not null default false;
alter table public.prices add column if not exists updated_at timestamptz;
alter table public.prices add column if not exists currency text not null default 'ILS' check (currency ~ '^[A-Z]{3}$');
alter table public.prices add column if not exists wrong int not null default 0;
alter table public.prices add column if not exists is_deal boolean not null default false;
alter table public.prices add column if not exists deal_text text not null default '' check (char_length(deal_text) <= 120);
alter table public.prices add column if not exists valid_until date;
create index if not exists prices_by on public.prices (by_id);
alter table public.chains enable row level security;
alter table public.branches enable row level security;
alter table public.prices enable row level security;
drop policy if exists "chains read" on public.chains;
drop policy if exists "chains add" on public.chains;
drop policy if exists "chains admin" on public.chains;
create policy "chains read"  on public.chains for select using (status = 'approved' or created_by = auth.uid() or public.is_staff());
create policy "chains add"   on public.chains for insert with check (auth.uid() is not null and created_by = auth.uid());
create policy "chains admin" on public.chains for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "branches read" on public.branches;
drop policy if exists "branches add" on public.branches;
drop policy if exists "branches admin" on public.branches;
create policy "branches read"  on public.branches for select using (status = 'approved' or created_by = auth.uid() or public.is_staff());
create policy "branches add"   on public.branches for insert with check (auth.uid() is not null and created_by = auth.uid());
create policy "branches admin" on public.branches for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "prices read" on public.prices;
drop policy if exists "prices add" on public.prices;
drop policy if exists "prices admin" on public.prices;
drop policy if exists "prices own update" on public.prices;
drop policy if exists "prices own delete" on public.prices;
create policy "prices read"  on public.prices for select using (auth.uid() is not null and (status = 'approved' or by_id = auth.uid() or public.is_staff()));
create policy "prices own update" on public.prices for update using (by_id = auth.uid()) with check (by_id = auth.uid());
create policy "prices own delete" on public.prices for delete using (by_id = auth.uid());
create policy "prices add"   on public.prices for insert with check (auth.uid() is not null and by_id = auth.uid() and confirms = 0);
create policy "prices admin" on public.prices for all using (public.is_staff()) with check (public.is_staff());
-- כל משתמש יכול לאשר מחיר פעם אחת בלבד, ולא את המחיר של עצמו
create table if not exists public.price_confirms (
  price_id uuid not null references public.prices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (price_id, user_id)
);
alter table public.price_confirms enable row level security;
create or replace function public.confirm_price(p_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then return null; end if;
  if exists (select 1 from public.prices where id = p_id and by_id = auth.uid()) then
    return (select confirms from public.prices where id = p_id);
  end if;
  insert into public.price_confirms(price_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  if found then
    perform set_config('app.bypass_price_guard', 'on', true);
    update public.prices set confirms = confirms + 1 where id = p_id;
    perform set_config('app.bypass_price_guard', 'off', true);
  end if;
  select confirms into n from public.prices where id = p_id;
  return n;
end $$;

-- ---------- בעלי סופרים / אחראי סופר ----------
create table if not exists public.store_managers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  chain text not null check (char_length(chain) between 1 and 40),
  branch text not null default '' check (char_length(branch) <= 120),
  title text not null default 'manager' check (title in ('owner','manager')),
  auto_approve boolean not null default false,
  added_at timestamptz not null default now()
);
alter table public.store_managers enable row level security;
drop policy if exists "store managers read" on public.store_managers;
create policy "store managers read" on public.store_managers for select using (user_id = auth.uid() or public.is_admin());
create or replace function public.store_manager_set(p_email text, p_chain text, p_branch text, p_title text, p_auto boolean) returns text
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not public.is_admin() then return 'forbidden'; end if;
  if coalesce(trim(p_chain),'') = '' then return 'bad_chain'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if uid is null then return 'not_found'; end if;
  insert into public.store_managers(user_id, chain, branch, title, auto_approve)
  values (uid, trim(p_chain), coalesce(trim(p_branch),''), case when p_title = 'owner' then 'owner' else 'manager' end, coalesce(p_auto,false))
  on conflict (user_id) do update set chain = excluded.chain, branch = excluded.branch, title = excluded.title, auto_approve = excluded.auto_approve;
  return 'ok';
end $$;
create or replace function public.store_manager_auto(p_user uuid, p_auto boolean) returns void
language sql security definer set search_path = public as $$
  update public.store_managers set auto_approve = p_auto where user_id = p_user and public.is_admin();
$$;
create or replace function public.store_manager_remove(p_user uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.store_managers where user_id = p_user and public.is_admin();
$$;
create or replace function public.store_manager_list() returns table(user_id uuid, name text, email text, chain text, branch text, title text, auto_approve boolean, added_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  return query select m.user_id, coalesce(p.name,'')::text, coalesce(u.email,'')::text, m.chain, m.branch, m.title, m.auto_approve, m.added_at
  from public.store_managers m join auth.users u on u.id = m.user_id left join public.profiles p on p.id = m.user_id
  where public.is_admin() order by m.added_at;
end $$;

-- מחיר מבעל/אחראי סופר מסומן "רשמי"; אם לא הוגדר לו אישור אוטומטי — ממתין למנהל.
-- משתמש רגיל לא יכול לשנות אישורים/סטטוס/סימון רשמי, וכל עריכה נרשמת בזמן העריכה.
create or replace function public.prices_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare sm public.store_managers%rowtype;
begin
  if current_setting('app.bypass_price_guard', true) = 'on' then return new; end if;
  if auth.uid() is null then return new; end if; -- עריכה ישירה מלוח הבקרה של Supabase
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if public.is_staff() then return new; end if;
    new.confirms := old.confirms; new.wrong := old.wrong; new.by_id := old.by_id; new.created_at := old.created_at; new.chain := old.chain;
  else
    if public.is_staff() then return new; end if;
    new.confirms := 0; new.wrong := 0; new.by_id := auth.uid(); new.updated_at := null;
  end if;
  select * into sm from public.store_managers
   where user_id = auth.uid() and chain = new.chain and (branch = '' or branch = new.branch);
  if found then
    new.verified := true;
    new.status := case when sm.auto_approve then 'approved' else 'pending' end;
  else
    new.verified := false;
    new.status := 'approved';
  end if;
  return new;
end $$;
drop trigger if exists prices_guard on public.prices;
create trigger prices_guard before insert or update on public.prices for each row execute function public.prices_guard();
create or replace function public.my_store() returns table(chain text, branch text, title text, auto_approve boolean)
language sql stable security definer set search_path = public as $$
  select chain, branch, title, auto_approve from public.store_managers where user_id = auth.uid();
$$;

-- ---------- דירוג מדווחים ----------
-- ניקוד = מספר דיווחים מאושרים + 2 על כל אישור של משתמש אחר + בונוס מהמנהל
drop function if exists public.reporter_scores();
create or replace function public.reporter_scores() returns table(user_id uuid, name text, reports int, confirms int, bonus int, score int)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, count(pr.id)::int, coalesce(sum(pr.confirms),0)::int, p.rep_bonus,
         (count(pr.id) + 2*coalesce(sum(pr.confirms),0) + p.rep_bonus)::int
  from public.profiles p left join public.prices pr on pr.by_id = p.id and pr.status = 'approved'
  where auth.uid() is not null
  group by p.id, p.name, p.rep_bonus
  having count(pr.id) > 0 or p.rep_bonus <> 0
  order by 6 desc limit 500;
$$;
create or replace function public.rep_bonus_add(p_user uuid, p_delta int) returns int
language sql security definer set search_path = public as $$
  update public.profiles set rep_bonus = rep_bonus + greatest(-1000, least(1000, p_delta))
  where id = p_user and public.is_staff() returning rep_bonus;
$$;
-- חנות/סניף ממשתמש רגיל נכנסים כ"ממתין"
create or replace function public.force_pending() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then new.status := 'pending'; end if;
  return new;
end $$;
drop trigger if exists force_pending on public.chains;
create trigger force_pending before insert on public.chains for each row execute function public.force_pending();
drop trigger if exists force_pending on public.branches;
create trigger force_pending before insert on public.branches for each row execute function public.force_pending();

-- ---------- הערות והארות מהמשתמשים ----------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(),
  name text not null default '',
  email text not null default '',
  message text not null check (char_length(message) between 1 and 3000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists "feedback send" on public.feedback;
drop policy if exists "feedback admin" on public.feedback;
create policy "feedback send"  on public.feedback for insert with check (auth.uid() is not null and user_id = auth.uid() and is_read = false);
create policy "feedback admin" on public.feedback for all using (public.is_admin()) with check (public.is_admin());

-- ---------- שם הכותב נלקח תמיד מהפרופיל (אי אפשר להתחזות לאחר) ----------
create or replace function public.my_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select name from public.profiles where id = auth.uid()), '');
$$;
create or replace function public.fill_author_name() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if public.is_staff() then return new; end if;
  if tg_table_name = 'prices' then new.by_name := public.my_name();
  elsif tg_table_name = 'feedback' then
    new.name := public.my_name();
    new.email := coalesce((select email from auth.users where id = auth.uid()), '');
  else new.author_name := public.my_name();
  end if;
  return new;
end $$;
drop trigger if exists fill_author on public.recipes;
create trigger fill_author before insert on public.recipes for each row execute function public.fill_author_name();
drop trigger if exists fill_author on public.bot_knowledge;
create trigger fill_author before insert on public.bot_knowledge for each row execute function public.fill_author_name();
drop trigger if exists fill_author on public.prices;
create trigger fill_author before insert on public.prices for each row execute function public.fill_author_name();
drop trigger if exists fill_author on public.feedback;
create trigger fill_author before insert on public.feedback for each row execute function public.fill_author_name();

-- ---------- מונה שימוש בבינה המלאכותית (לשליטה בעלויות) ----------
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
drop policy if exists "ai usage admin read" on public.ai_usage;
create policy "ai usage admin read" on public.ai_usage for select using (public.is_admin());

-- ---------- פרסומות (תמונה + טקסט + קישור) ----------
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  title text not null default '' check (char_length(title) <= 80),
  body text not null default '' check (char_length(body) <= 400),
  image text not null default '' check (char_length(image) <= 1500000),
  link_url text not null default '' check (link_url = '' or link_url ~* '^https?://'),
  advertiser text not null default '' check (char_length(advertiser) <= 60),
  placement text not null default 'popup' check (placement in ('popup','banner')),
  close_after int not null default 5 check (close_after between 0 and 30),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  views int not null default 0,
  clicks int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.ads enable row level security;
drop policy if exists "ads read live" on public.ads;
drop policy if exists "ads admin" on public.ads;
-- מי רואה פרסומות באתר (בק אופיס ← 📢 פרסומות): all = כל המחוברים · admins = רק מנהלים (לבדיקה) · none = אף אחד
create or replace function public.ads_audience() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select case when value->>'audience' in ('all','admins','none') then value->>'audience' end from public.site_config where key = 'ads'), 'all');
$$;
revoke all on function public.ads_audience() from public;
grant execute on function public.ads_audience() to anon, authenticated;
create policy "ads read live" on public.ads for select using (
  auth.uid() is not null and active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
  and (public.ads_audience() = 'all' or (public.ads_audience() = 'admins' and public.is_admin())));
create policy "ads admin" on public.ads for all using (public.is_admin()) with check (public.is_admin());
create or replace function public.ad_event(p_id uuid, p_kind text) returns void
language sql security definer set search_path = public as $$
  update public.ads set views = views + (case when p_kind = 'view' then 1 else 0 end),
                        clicks = clicks + (case when p_kind = 'click' then 1 else 0 end)
  where id = p_id and auth.uid() is not null;
$$;

-- ---------- עדכונים לאתר (כל משתמש רואה פעם אחת ומאשר שקרא) ----------
create table if not exists public.site_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 6000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.site_updates enable row level security;
drop policy if exists "updates read" on public.site_updates;
drop policy if exists "updates admin" on public.site_updates;
create policy "updates read"  on public.site_updates for select using (auth.uid() is not null and active);
create policy "updates admin" on public.site_updates for all using (public.is_admin()) with check (public.is_admin());
create or replace function public.mark_updates_seen() returns void
language sql security definer set search_path = public as $$
  update public.profiles set updates_seen_at = now() where id = auth.uid();
$$;
create or replace function public.update_read_count(p_id uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.profiles p, public.site_updates u
  where u.id = p_id and p.updates_seen_at >= u.created_at and public.is_admin();
$$;

-- ---------- מעקב אחרי חנויות + עדכונים/מבצעים מהחנויות ----------
create table if not exists public.store_follows (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  chain text not null check (char_length(chain) between 1 and 40),
  created_at timestamptz not null default now(),
  primary key (user_id, chain)
);
alter table public.store_follows enable row level security;
drop policy if exists "follows own" on public.store_follows;
create policy "follows own" on public.store_follows for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create or replace function public.chain_follower_counts() returns table(chain text, followers int)
language sql stable security definer set search_path = public as $$
  select chain, count(*)::int from public.store_follows where auth.uid() is not null group by chain;
$$;

create table if not exists public.store_posts (
  id uuid primary key default gen_random_uuid(),
  chain text not null check (char_length(chain) between 1 and 40),
  branch text not null default '' check (char_length(branch) <= 120),
  kind text not null default 'deal' check (kind in ('deal','news','product')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 2000),
  image text not null default '' check (char_length(image) <= 1500000 and (image = '' or image ~ '^(data:image/|https://)')),
  ends_at timestamptz,
  status text not null default 'approved' check (status in ('pending','approved')),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  author_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists store_posts_chain on public.store_posts (chain, created_at desc);
alter table public.store_posts enable row level security;
drop policy if exists "posts read" on public.store_posts;
drop policy if exists "posts write" on public.store_posts;
drop policy if exists "posts own edit" on public.store_posts;
drop policy if exists "posts own delete" on public.store_posts;
drop policy if exists "posts staff" on public.store_posts;
create policy "posts read" on public.store_posts for select using (auth.uid() is not null and (status = 'approved' or created_by = auth.uid() or public.is_staff()));
-- רק בעל/אחראי הסופר של אותה רשת (או הצוות) יכול לפרסם בשם החנות
create policy "posts write" on public.store_posts for insert with check (
  auth.uid() is not null and created_by = auth.uid()
  and (public.is_staff() or exists (select 1 from public.store_managers m where m.user_id = auth.uid() and m.chain = store_posts.chain)));
create policy "posts own edit" on public.store_posts for update using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "posts own delete" on public.store_posts for delete using (created_by = auth.uid());
create policy "posts staff" on public.store_posts for all using (public.is_staff()) with check (public.is_staff());
create or replace function public.store_posts_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare auto boolean;
begin
  if auth.uid() is null then return new; end if;
  if current_setting('app.bypass_price_guard', true) = 'on' then return new; end if; -- שינוי שם חנות ע"י המנהל
  new.author_name := public.my_name();
  if tg_op = 'UPDATE' then new.updated_at := now(); new.created_by := old.created_by; new.created_at := old.created_at; new.chain := old.chain; end if;
  if public.is_staff() then return new; end if;
  select auto_approve into auto from public.store_managers where user_id = auth.uid() and chain = new.chain;
  new.status := case when coalesce(auto,false) then 'approved' else 'pending' end;
  return new;
end $$;
drop trigger if exists store_posts_guard on public.store_posts;
create trigger store_posts_guard before insert or update on public.store_posts for each row execute function public.store_posts_guard();

-- ---------- דברי תורה על הפרשה (מבקשים ומשתפים דרך הבוט; משתמשים — באישור מנהל) ----------
create table if not exists public.divrei_torah (
  id uuid primary key default gen_random_uuid(),
  parasha text not null check (char_length(parasha) between 1 and 60),
  title text not null default '' check (char_length(title) <= 150),
  body text not null check (char_length(body) between 1 and 20000),
  source_name text not null default '' check (char_length(source_name) <= 120),
  author_id uuid default auth.uid() references auth.users(id) on delete set null,
  author_name text not null default '',
  status text not null default 'pending' check (status in ('pending','approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists divrei_torah_parasha on public.divrei_torah (parasha, status);
alter table public.divrei_torah enable row level security;
drop policy if exists "dt read" on public.divrei_torah;
drop policy if exists "dt submit" on public.divrei_torah;
drop policy if exists "dt staff" on public.divrei_torah;
create policy "dt read"   on public.divrei_torah for select using (auth.uid() is not null and (status = 'approved' or author_id = auth.uid() or public.is_staff()));
create policy "dt submit" on public.divrei_torah for insert with check (auth.uid() is not null and author_id = auth.uid() and (status = 'pending' or public.is_staff()));
create policy "dt staff"  on public.divrei_torah for all using (public.is_staff()) with check (public.is_staff());
create or replace function public.divrei_torah_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  if tg_op = 'INSERT' and new.author_name = '' then new.author_name := public.my_name(); end if;
  if not public.is_staff() then new.status := 'pending'; new.author_name := public.my_name(); end if;
  return new;
end $$;
drop trigger if exists divrei_torah_guard on public.divrei_torah;
create trigger divrei_torah_guard before insert or update on public.divrei_torah for each row execute function public.divrei_torah_guard();

-- ---------- התראות לצוות (תוסף הכרום) ----------
-- מחזיר מה חדש באתר — רק לצוות, ורק מה שמותר לתפקיד:
-- מנהל רואה הכל (כולל משתמשים חדשים והערות); צוות פיקוח רואה רק את מה שהוא מאשר.
create or replace function public.staff_events(p_since timestamptz default null)
returns table(kind text, ref text, title text, detail text, who text, created_at timestamptz, pending boolean)
language plpgsql stable security definer set search_path = public as $$
declare adm boolean := public.is_admin(); me uuid := auth.uid(); s timestamptz;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  s := greatest(coalesce(p_since, now() - interval '3 days'), now() - interval '30 days');
  return query
  select * from (
    select 'user'::text, p.id::text, p.name, p.email, ''::text, p.created_at, false
      from public.profiles p where adm and p.created_at > s and p.id <> me
    union all
    select 'feedback', f.id::text, f.name, left(f.message, 400), f.email, f.created_at, not f.is_read
      from public.feedback f where adm and f.created_at > s
    union all
    select 'recipe', r.id::text, r.name, left(r.steps, 300), r.author_name, r.created_at, r.status = 'pending'
      from public.recipes r where r.created_at > s and r.author_id is distinct from me
    union all
    select 'bot', k.id::text, k.question, left(k.answer, 300), k.author_name, k.created_at, k.status = 'pending'
      from public.bot_knowledge k where k.created_at > s and k.author_id is distinct from me
    union all
    select 'chain', c.id::text, c.name, c.kind, coalesce((select pr.name from public.profiles pr where pr.id = c.created_by), ''), c.created_at, c.status = 'pending'
      from public.chains c where c.created_at > s and c.created_by is not null and c.created_by <> me
    union all
    select 'branch', b.id::text, b.chain || ' — ' || b.city, b.address, coalesce((select pr.name from public.profiles pr where pr.id = b.created_by), ''), b.created_at, b.status = 'pending'
      from public.branches b where b.created_at > s and b.created_by is not null and b.created_by <> me
    union all
    select 'price', x.id::text, x.product, x.chain || case when x.branch <> '' then ' · ' || x.branch else '' end || ' · ' || x.price::text || ' ' || x.currency, x.by_name, x.created_at, x.status = 'pending'
      from public.prices x where x.created_at > s and x.by_id is distinct from me
    union all
    select 'post', o.id::text, o.title, o.chain || case when o.body <> '' then ' — ' || left(o.body, 200) else '' end, o.author_name, o.created_at, o.status = 'pending'
      from public.store_posts o where o.created_at > s and o.created_by is distinct from me
    union all
    select 'torah', d.id::text, case when d.title <> '' then d.title else 'פרשת ' || d.parasha end, 'פרשת ' || d.parasha || ' — ' || left(d.body, 250), d.author_name, d.created_at, d.status = 'pending'
      from public.divrei_torah d where d.created_at > s and d.author_id is distinct from me
    union all
    select 'chat', c.id::text, 'הודעה מ' || coalesce(nullif(c.author_name, ''), 'משתמש/ת'), left(c.body, 300), c.author_name, c.created_at, not c.read_by_staff
      from public.support_messages c where adm and not c.from_staff and c.created_at > s and c.user_id is distinct from me
    union all
    select 'bizreq', r.id::text, 'בקשת הצטרפות: ' || r.business, r.name || ' · ' || r.phone || case when r.message <> '' then ' — ' || left(r.message, 200) else '' end, r.name, r.created_at, r.status = 'pending'
      from public.business_requests r where adm and r.created_at > s
    union all
    select 'flag', x.id::text, x.product || ' — דווח כלא נכון', x.chain || ' · ' || x.price::text || ' ' || x.currency || ' · ✅ ' || x.confirms || ' / ❌ ' || x.wrong, x.by_name, (select max(f.created_at) from public.price_flags f where f.price_id = x.id), true
      from public.prices x where x.wrong > 0 and exists (select 1 from public.price_flags f where f.price_id = x.id and f.created_at > s)
    union all
    select 'message', m.id::text, 'פנייה ל' || m.chain || case when m.name <> '' then ' מ' || m.name else '' end, left(m.body, 300), m.name, m.created_at, not m.is_read
      from public.store_messages m where adm and m.created_at > s and m.user_id is distinct from me
    union all
    select 'review', v.id::text, repeat('⭐', v.stars) || ' ' || v.author_name, left(v.body, 300), v.author_name, coalesce(v.updated_at, v.created_at), v.status = 'pending'
      from public.site_reviews v where coalesce(v.updated_at, v.created_at) > s and v.user_id is distinct from me
  ) e(kind, ref, title, detail, who, created_at, pending)
  order by e.created_at desc
  limit 300;
end $$;

-- כמה דברים ממתינים עכשיו לאישור (למספר על האייקון)
create or replace function public.staff_pending()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare adm boolean := public.is_admin();
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'recipe',   (select count(*) from public.recipes where status = 'pending'),
    'bot',      (select count(*) from public.bot_knowledge where status = 'pending'),
    'chain',    (select count(*) from public.chains where status = 'pending'),
    'branch',   (select count(*) from public.branches where status = 'pending'),
    'price',    (select count(*) from public.prices where status = 'pending'),
    'post',     (select count(*) from public.store_posts where status = 'pending'),
    'torah',    (select count(*) from public.divrei_torah where status = 'pending'),
    'review',   (select count(*) from public.site_reviews where status = 'pending'),
    'flag',     (select count(*) from public.prices where wrong > 0 and wrong >= confirms),
    'chat',     case when adm then (select count(*) from public.support_messages where not from_staff and not read_by_staff) else 0 end,
    'bizreq',   case when adm then (select count(*) from public.business_requests where status = 'pending') else 0 end,
    'message',  case when adm then (select count(*) from public.store_messages where not is_read) else 0 end,
    'feedback', case when adm then (select count(*) from public.feedback where not is_read) else 0 end);
end $$;
revoke all on function public.staff_events(timestamptz) from public, anon;
revoke all on function public.staff_pending() from public, anon;
grant execute on function public.staff_events(timestamptz) to authenticated;
grant execute on function public.staff_pending() to authenticated;

-- ---------- מחיקת חשבון (דרישה של Google Play) ----------
-- המשתמש מוחק את עצמו: החשבון, הפרופיל, הרשימות שבבעלותו, המעקבים וההרשאות נמחקים;
-- דיווחים ציבוריים (מחירים, מתכונים, הערות) נשארים אבל בלי שם ובלי מייל.
create or replace function public.delete_my_account() returns text
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return 'not_signed_in'; end if;
  if public.is_owner() then return 'owner'; end if;
  update public.prices set by_name = '' where by_id = uid;
  update public.recipes set author_name = '' where author_id = uid;
  update public.bot_knowledge set author_name = '' where author_id = uid;
  update public.store_posts set author_name = '' where created_by = uid;
  update public.divrei_torah set author_name = '' where author_id = uid;
  update public.site_reviews set author_name = '' where user_id = uid;
  update public.feedback set name = '', email = '' where user_id = uid;
  delete from auth.users where id = uid;
  return 'deleted';
end $$;

-- ---------- היסטוריית שינויים (כל שינוי נשמר, אפשר לשחזר מהבק אופיס) ----------
create table if not exists public.audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  table_name text not null,
  op text not null,
  row_id text,
  old_row jsonb,
  new_row jsonb,
  actor uuid,
  actor_name text not null default ''
);
create index if not exists audit_log_at on public.audit_log (at desc);
alter table public.audit_log enable row level security;
drop policy if exists "audit admin read" on public.audit_log;
create policy "audit admin read" on public.audit_log for select using (public.is_admin());
create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare o jsonb; n jsonb; noise text[] := array['views','clicks','confirms','last_seen','updated_at'];
begin
  if tg_op <> 'INSERT' then o := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then n := to_jsonb(new); end if;
  if tg_op = 'UPDATE' and (o - noise) = (n - noise) then return new; end if;
  -- מחירים שהשרת שלנו מעלה כל כמה דקות (מפתח שירות, בלי משתמש) — לא נשמרים בהיסטוריה, אחרת היא מתנפחת ושאילתות נתקעות
  if tg_table_name = 'prices' and auth.uid() is null and coalesce(n->>'origin', o->>'origin', '') <> '' then return coalesce(new, old); end if;
  insert into public.audit_log(table_name, op, row_id, old_row, new_row, actor, actor_name)
  values (tg_table_name, tg_op, coalesce(n->>'id', o->>'id', n->>'key', o->>'key', n->>'user_id', o->>'user_id'), o, n, auth.uid(), public.my_name());
  if random() < 0.002 then delete from public.audit_log where at < now() - interval '365 days'; end if;
  return coalesce(new, old);
end $$;
do $$
declare t text;
begin
  foreach t in array array['site_config','recipes','bot_knowledge','chains','branches','prices','ads','site_updates','staff','store_managers','feedback','store_posts','divrei_torah'] loop
    execute format('drop trigger if exists audit on public.%I', t);
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.audit_trigger()', t);
  end loop;
end $$;

-- ---------- גיבוי: הרשימות של המשפחות (רק לבעלים) ----------
create or replace function public.backup_rooms() returns setof public.rooms
language sql stable security definer set search_path = public as $$
  select * from public.rooms where public.is_owner();
$$;
create or replace function public.restore_room(p_code text, p_owner uuid, p_data jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_owner() then return false; end if;
  if not exists (select 1 from auth.users where id = p_owner) then return false; end if;
  insert into public.rooms(code, owner, data, updated_by, updated_at) values (p_code, p_owner, coalesce(p_data,'{}'::jsonb), 'restore', now())
  on conflict (code) do update set data = excluded.data, updated_by = 'restore', updated_at = now();
  insert into public.room_members(room_code, user_id) values (p_code, p_owner) on conflict do nothing;
  return true;
end $$;

-- ---------- זמן אמת (לסנכרון הרשימות בין המכשירים) ----------
do $$ begin
  alter publication supabase_realtime add table public.rooms;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- ---------- ברירות מחדל ----------
insert into public.site_config(key, value) values
  ('ai', '{"enabled": false, "audience": "admin", "model": "claude-opus-5", "effort": "medium", "dailyLimit": 30, "instructions": ""}'),
  ('bot', '{"welcome": "", "cholentOffer": true, "bannedExtra": []}'),
  ('about', '{"text": ""}'),
  ('announcement', '{"text": "", "on": false}'),
  ('theme', '{}')
on conflict (key) do nothing;

insert into public.chains(name, kind)
select * from (values
  ('נתיב החסד','store'),('בר כל טוב','store'),('רמי לוי','store'),('יש חסד','store'),('אושר עד','store'),
  ('רמי לוי אונליין','online'),('שופרסל אונליין','online'),('יוחננוף אונליין','online')
) v(name, kind)
where not exists (select 1 from public.chains)
on conflict (name) do nothing;

-- סניפים עם רחובות — נאספו מהאינטרנט (Waze / דפי זהב) בספטמבר 2026.
-- הרשימה לא בהכרח מלאה: אפשר להוסיף/לתקן/למחוק סניפים מהבק אופיס.
insert into public.branches(chain, city, address, name)
select * from (values
  ('נתיב החסד','בני ברק','קוטלר 18',''),
  ('נתיב החסד','בני ברק','נויפלד 15',''),
  ('נתיב החסד','בני ברק','גניחובסקי 23',''),
  ('נתיב החסד','בני ברק','הרב קלישר 17','גני גד'),
  ('נתיב החסד','בני ברק','ירמיהו 1',''),
  ('נתיב החסד','בני ברק','חבקוק 25',''),
  ('נתיב החסד','בני ברק','יגאל אלון 12',''),
  ('נתיב החסד','בני ברק','רשב"ם 15',''),
  ('נתיב החסד','ירושלים','משה שאולי','נווה יעקב'),
  ('נתיב החסד','ירושלים','פנים מאירות',''),
  ('נתיב החסד','בית שמש','מרים הנביאה 16',''),
  ('נתיב החסד','בית שמש','נחל שורק 11',''),
  ('נתיב החסד','אלעד','הרי"ף 1',''),
  ('נתיב החסד','אלעד','שמעיה 19',''),
  ('נתיב החסד','אשדוד','רבי אליעזר בן הורקנוס 22',''),
  ('נתיב החסד','אשדוד','רבי אליעזר בן הורקנוס 8',''),
  ('נתיב החסד','אשדוד','הלל 8',''),
  ('נתיב החסד','אשדוד','רשב"י 12',''),
  ('נתיב החסד','מודיעין עילית','נתיבות המשפט 38',''),
  ('נתיב החסד','חיפה','שד'' טרומפלדור 54','נווה שאנן'),
  ('נתיב החסד','נתניה','האר"י 20',''),
  ('נתיב החסד','רחובות','מנוחה ונחלה 7',''),
  ('נתיב החסד','בת ים','הרב ניסנבאום 25',''),
  ('נתיב החסד','חדרה','הגיבורים 52',''),
  ('בר כל טוב','בני ברק','שלמה המלך 6',''),
  ('בר כל טוב','בני ברק','הרב אבו חצירא 20',''),
  ('בר כל טוב','בני ברק','רבי עקיבא 94',''),
  ('בר כל טוב','בני ברק','הרב קוק 5',''),
  ('בר כל טוב','ירושלים','אריה בן אליעזר 47','גילה'),
  ('בר כל טוב','ירושלים','משה שאולי 10','נווה יעקב'),
  ('בר כל טוב','רמת גן','הרב לנדרס 1',''),
  ('בר כל טוב','רחובות','הרב זכריה מדר 27',''),
  ('בר כל טוב','רחובות','מבצע ליטני 8',''),
  ('בר כל טוב','רחובות','כובשי החרמון 10',''),
  ('בר כל טוב','מודיעין עילית','רבי שמעון בר יוחאי 35',''),
  ('בר כל טוב','אלעד','שמעון הצדיק 7',''),
  ('בר כל טוב','צפת','צה"ל 13',''),
  ('בר כל טוב','נתיבות','הרב מזוז',''),
  ('בר כל טוב','אשדוד','רוזובסקי',''),
  ('רמי לוי','ירושלים','הפרסה 3','רב מכר'),
  ('רמי לוי','בני ברק','מבצע קדש 68','איילון'),
  ('רמי לוי','ביתר עילית','החוזה מלובלין 2',''),
  ('רמי לוי','מודיעין','החרט 1',''),
  ('יש חסד','בני ברק','שלמה המלך 12',''),
  ('יש חסד','בני ברק','עזרא 21',''),
  ('יש חסד','בני ברק','השומר 10',''),
  ('יש חסד','בני ברק','אהרונוביץ 10','מרכז רימונים'),
  ('יש חסד','ירושלים','ברכת אברהם 22',''),
  ('אושר עד','בני ברק','הקישון 11',''),
  ('אושר עד','ירושלים','בית הדפוס 29',''),
  ('אושר עד','ירושלים','שמגר 16',''),
  ('אושר עד','בית שמש','הגליל 6',''),
  ('אושר עד','אשדוד','בעלי המלאכה 6',''),
  ('אושר עד','אשדוד','המדע 11','')
) v(chain, city, address, name)
where not exists (select 1 from public.branches)
on conflict do nothing;

-- =====================================================================
--  גרסה 7: חוות דעת על האתר, ניהול משתמשים, עריכת כל תוכן ע"י המנהל
-- =====================================================================

-- ---------- חוות דעת על האתר — 1 עד 5 כוכבים, מתפרסמות רק אחרי אישור מנהל ----------
create table if not exists public.site_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  author_name text not null default '' check (char_length(author_name) <= 40),
  stars int not null check (stars between 1 and 5),
  body text not null default '' check (char_length(body) <= 1500),
  reply text not null default '' check (char_length(reply) <= 1500),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists site_reviews_status on public.site_reviews (status, created_at desc);
-- חוות דעת אחת לכל משתמש (אפשר לערוך אותה — והיא חוזרת לאישור)
create unique index if not exists site_reviews_one_per_user on public.site_reviews (user_id) where user_id is not null;
alter table public.site_reviews enable row level security;
drop policy if exists "reviews read" on public.site_reviews;
drop policy if exists "reviews submit" on public.site_reviews;
drop policy if exists "reviews own edit" on public.site_reviews;
drop policy if exists "reviews own delete" on public.site_reviews;
drop policy if exists "reviews staff" on public.site_reviews;
create policy "reviews read" on public.site_reviews for select using (status = 'approved' or user_id = auth.uid() or public.is_staff());
create policy "reviews submit" on public.site_reviews for insert with check (auth.uid() is not null and user_id = auth.uid());
create policy "reviews own edit" on public.site_reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reviews own delete" on public.site_reviews for delete using (user_id = auth.uid());
create policy "reviews staff" on public.site_reviews for all using (public.is_staff()) with check (public.is_staff());
create or replace function public.site_reviews_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  if public.is_staff() then
    if tg_op = 'INSERT' and coalesce(new.author_name, '') = '' then new.author_name := public.my_name(); end if;
    return new;
  end if;
  -- משתמש רגיל: השם נלקח מהפרופיל, וכל שליחה/עריכה ממתינה לאישור המנהל
  new.author_name := public.my_name();
  new.status := 'pending';
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id; new.created_at := old.created_at; new.reply := old.reply;
  else
    new.user_id := auth.uid(); new.reply := ''; new.updated_at := null;
  end if;
  return new;
end $$;
drop trigger if exists site_reviews_guard on public.site_reviews;
create trigger site_reviews_guard before insert or update on public.site_reviews for each row execute function public.site_reviews_guard();
-- ממוצע הכוכבים (רק מחוות דעת מאושרות)
create or replace function public.site_rating() returns table(avg_stars numeric, total int, s1 int, s2 int, s3 int, s4 int, s5 int)
language sql stable security definer set search_path = public as $$
  select coalesce(round(avg(stars)::numeric, 1), 0), count(*)::int,
         count(*) filter (where stars = 1)::int, count(*) filter (where stars = 2)::int, count(*) filter (where stars = 3)::int,
         count(*) filter (where stars = 4)::int, count(*) filter (where stars = 5)::int
  from public.site_reviews where status = 'approved';
$$;
drop trigger if exists audit on public.site_reviews;
create trigger audit after insert or update or delete on public.site_reviews for each row execute function public.audit_trigger();

-- ---------- ניהול משתמשים מהבק אופיס: רשימה מלאה, עריכת שם, אישור מייל, מחיקה ----------
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update using (public.is_admin()) with check (public.is_admin());

create or replace function public.admin_user_list()
returns table(id uuid, name text, email text, created_at timestamptz, last_seen timestamptz, role text, confirmed boolean, last_sign_in timestamptz, provider text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select u.id, coalesce(p.name, '')::text, coalesce(u.email, '')::text, u.created_at, coalesce(p.last_seen, u.created_at),
         (case when public.yam_owner_match(u.email, u.raw_app_meta_data) and u.email_confirmed_at is not null then 'owner'
               else coalesce(s.role, '') end)::text,
         u.email_confirmed_at is not null, u.last_sign_in_at,
         coalesce(u.raw_app_meta_data->>'provider', 'email')::text
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.staff s on s.user_id = u.id
  order by u.created_at desc
  limit 5000;
end $$;

-- אישור מייל ידני (למשתמש שהמייל לא הגיע אליו). אי אפשר לאשר כך את מיילי הבעלים — כדי שאף אחד לא "יתפוס" בעלות.
create or replace function public.admin_confirm_user(p_user uuid) returns text
language plpgsql security definer set search_path = public, auth as $$
declare em text;
begin
  if not public.is_admin() then return 'forbidden'; end if;
  select lower(email) into em from auth.users where id = p_user;
  if em is null then return 'not_found'; end if;
  if exists (select 1 from auth.users ou where ou.id = p_user and public.yam_owner_match(ou.email, ou.raw_app_meta_data)) then return 'owner'; end if;
  update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = p_user;
  return 'ok';
end $$;

-- מחיקת משתמש ע"י המנהל. את הבעלים אי אפשר למחוק; מנהל נוסף — רק הבעלים יכול למחוק.
create or replace function public.admin_delete_user(p_user uuid) returns text
language plpgsql security definer set search_path = public, auth as $$
declare em text;
begin
  if not public.is_admin() then return 'forbidden'; end if;
  if p_user = auth.uid() then return 'self'; end if;
  select lower(email) into em from auth.users where id = p_user;
  if em is null then return 'not_found'; end if;
  if exists (select 1 from auth.users ou where ou.id = p_user and public.yam_owner_match(ou.email, ou.raw_app_meta_data)) then return 'owner'; end if;
  if exists (select 1 from public.staff where user_id = p_user and role = 'admin') and not public.is_owner() then return 'forbidden'; end if;
  update public.prices set by_name = '' where by_id = p_user;
  update public.recipes set author_name = '' where author_id = p_user;
  update public.bot_knowledge set author_name = '' where author_id = p_user;
  update public.store_posts set author_name = '' where created_by = p_user;
  update public.divrei_torah set author_name = '' where author_id = p_user;
  update public.site_reviews set author_name = '' where user_id = p_user;
  update public.feedback set name = '', email = '' where user_id = p_user;
  delete from auth.users where id = p_user;
  return 'deleted';
end $$;
revoke all on function public.admin_user_list() from public, anon;
revoke all on function public.admin_confirm_user(uuid) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_user_list() to authenticated;
grant execute on function public.admin_confirm_user(uuid) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ---------- שינוי שם של חנות/רשת — מתעדכן בכל מקום (סניפים, מחירים, מבצעים, עוקבים, בעלי סופרים) ----------
create or replace function public.admin_rename_chain(p_old text, p_new text) returns text
language plpgsql security definer set search_path = public as $$
declare n text := left(trim(coalesce(p_new, '')), 40);
begin
  if not public.is_staff() then return 'forbidden'; end if;
  if n = '' then return 'empty'; end if;
  if n = p_old then return 'ok'; end if;
  if exists (select 1 from public.chains where name = n) then return 'exists'; end if;
  perform set_config('app.bypass_price_guard', 'on', true);
  update public.chains set name = n where name = p_old;
  update public.branches set chain = n where chain = p_old;
  update public.prices set chain = n where chain = p_old;
  update public.store_posts set chain = n where chain = p_old;
  delete from public.store_follows f where f.chain = p_old and exists (select 1 from public.store_follows g where g.user_id = f.user_id and g.chain = n);
  update public.store_follows set chain = n where chain = p_old;
  update public.store_managers set chain = n where chain = p_old;
  perform set_config('app.bypass_price_guard', 'off', true);
  return 'ok';
end $$;
revoke all on function public.admin_rename_chain(text, text) from public, anon;
grant execute on function public.admin_rename_chain(text, text) to authenticated;

-- "איזו רשת הכי זולה?" הוסר: השווה כל רשת על מוצרים אחרים ולכן נתן תוצאה לא נכונה. ההשוואה האמיתית היא של הסל של המשתמש.
drop function if exists public.chain_price_ranking(int, text);

-- =====================================================================
--  גרסה 8: מחיר מבצע + "נכון / לא נכון" לכל דיווח, מאגר מוצרים מקובץ (בלי כפילויות),
--  פרופיל עסקי לחנויות + הסתרת חנות, פניות מלקוחות לחנויות, יומן קניות, קטגוריות חנויות חדשות
-- =====================================================================

-- ---------- דיווחי מחיר: "נכון" / "לא נכון" ----------
create index if not exists prices_created on public.prices (created_at desc);
create index if not exists prices_barcode on public.prices (barcode) where barcode is not null;
create table if not exists public.price_flags (
  price_id uuid not null references public.prices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (price_id, user_id)
);
alter table public.price_flags enable row level security;
alter table public.price_confirms add column if not exists created_at timestamptz not null default now();
-- p_vote > 0 = "המחיר נכון", p_vote < 0 = "המחיר לא נכון". אפשר להחליף דעה. על דיווח של עצמך — אי אפשר להצביע.
create or replace function public.vote_price(p_id uuid, p_vote int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c int; w int;
begin
  if auth.uid() is null then return null; end if;
  if not exists (select 1 from public.prices where id = p_id) then return jsonb_build_object('error', 'not_found'); end if;
  if exists (select 1 from public.prices where id = p_id and by_id = auth.uid()) then
    return (select jsonb_build_object('ok', confirms, 'wrong', wrong, 'own', true) from public.prices where id = p_id);
  end if;
  if p_vote > 0 then
    delete from public.price_flags where price_id = p_id and user_id = auth.uid();
    insert into public.price_confirms(price_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  else
    delete from public.price_confirms where price_id = p_id and user_id = auth.uid();
    insert into public.price_flags(price_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  end if;
  select count(*) into c from public.price_confirms where price_id = p_id;
  select count(*) into w from public.price_flags where price_id = p_id;
  perform set_config('app.bypass_price_guard', 'on', true);
  update public.prices set confirms = c, wrong = w where id = p_id;
  perform set_config('app.bypass_price_guard', 'off', true);
  return jsonb_build_object('ok', c, 'wrong', w, 'mine', case when p_vote > 0 then 1 else -1 end);
end $$;
create or replace function public.my_price_votes(p_ids uuid[]) returns table(price_id uuid, vote int)
language sql stable security definer set search_path = public as $$
  select c.price_id, 1 from public.price_confirms c where c.user_id = auth.uid() and c.price_id = any(p_ids)
  union all
  select f.price_id, -1 from public.price_flags f where f.user_id = auth.uid() and f.price_id = any(p_ids);
$$;
revoke all on function public.vote_price(uuid, int) from public, anon;
revoke all on function public.my_price_votes(uuid[]) from public, anon;
grant execute on function public.vote_price(uuid, int) to authenticated;
grant execute on function public.my_price_votes(uuid[]) to authenticated;

-- ---------- מאגר מוצרים (המנהל מעלה קובץ; מוצר זהה לא נכנס פעמיים) ----------
create or replace function public.name_key(t text) returns text
language sql immutable as $$
  select btrim(regexp_replace(regexp_replace(coalesce(t, ''), '[''’`׳"]', '', 'g'), '\s+', ' ', 'g'));
$$;
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  name_key text not null,
  brand text not null default '' check (char_length(brand) <= 40),
  category text not null default '' check (char_length(category) <= 40),
  barcode text check (barcode is null or barcode ~ '^[0-9]{4,20}$'),
  emoji text not null default '' check (char_length(emoji) <= 16),
  unit text not null default '' check (char_length(unit) <= 20),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create unique index if not exists products_barcode_u on public.products (barcode) where barcode is not null;
create unique index if not exists products_name_brand_u on public.products (name_key, lower(brand));
alter table public.products enable row level security;
drop policy if exists "products read" on public.products;
drop policy if exists "products staff" on public.products;
create policy "products read" on public.products for select using (true);
create policy "products staff" on public.products for all using (public.is_staff()) with check (public.is_staff());
create or replace function public.products_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  new.name := btrim(new.name); new.brand := btrim(coalesce(new.brand, '')); new.name_key := public.name_key(new.name);
  if new.barcode = '' then new.barcode := null; end if;
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end $$;
drop trigger if exists products_guard on public.products;
create trigger products_guard before insert or update on public.products for each row execute function public.products_guard();
drop trigger if exists audit on public.products;
create trigger audit after insert or update or delete on public.products for each row execute function public.audit_trigger();
-- ייבוא קובץ: לכל שורה — אם הברקוד כבר קיים או שאותו שם+חברה כבר קיים, משלימים פרטים חסרים במקום להוסיף כפילות
create or replace function public.import_products(p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb; nm text; br text; bc text; cat text; em text; un text; ex uuid; added int := 0; merged int := 0; skipped int := 0;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    nm := left(btrim(coalesce(r->>'name', '')), 80); br := left(btrim(coalesce(r->>'brand', '')), 40);
    bc := nullif(regexp_replace(coalesce(r->>'barcode', ''), '\D', '', 'g'), '');
    if bc is not null and bc !~ '^[0-9]{4,20}$' then bc := null; end if;
    cat := left(btrim(coalesce(r->>'category', '')), 40); em := left(btrim(coalesce(r->>'emoji', '')), 16); un := left(btrim(coalesce(r->>'unit', '')), 20);
    if nm = '' then skipped := skipped + 1; continue; end if;
    ex := null;
    if bc is not null then select id into ex from public.products where barcode = bc; end if;
    if ex is null then select id into ex from public.products where name_key = public.name_key(nm) and lower(brand) = lower(br); end if;
    if ex is not null then
      update public.products set
        barcode = coalesce(barcode, case when bc is not null and not exists (select 1 from public.products where barcode = bc) then bc end),
        category = case when category = '' then cat else category end,
        emoji = case when emoji = '' then em else emoji end,
        unit = case when unit = '' then un else unit end,
        brand = case when brand = '' and br <> '' and not exists (select 1 from public.products p2 where p2.name_key = public.name_key(nm) and lower(p2.brand) = lower(br)) then br else brand end
      where id = ex;
      merged := merged + 1;
    else
      insert into public.products(name, name_key, brand, category, barcode, emoji, unit) values (nm, public.name_key(nm), br, cat, bc, em, un);
      added := added + 1;
    end if;
  end loop;
  return jsonb_build_object('added', added, 'merged', merged, 'skipped', skipped);
end $$;
revoke all on function public.import_products(jsonb) from public, anon;
grant execute on function public.import_products(jsonb) to authenticated;

-- ---------- חנויות: פרופיל עסקי, הסתרה, קטגוריות חדשות ----------
alter table public.chains add column if not exists hidden boolean not null default false;
alter table public.chains add column if not exists about text not null default '' check (char_length(about) <= 2000);
alter table public.chains add column if not exists phone text not null default '' check (char_length(phone) <= 30);
alter table public.chains add column if not exists whatsapp text not null default '' check (char_length(whatsapp) <= 30);
alter table public.chains add column if not exists address text not null default '' check (char_length(address) <= 200);
alter table public.chains add column if not exists hours text not null default '' check (char_length(hours) <= 600);
alter table public.chains drop constraint if exists chains_category_check;
alter table public.chains add constraint chains_category_check
  check (category in ('supermarket','grocery','produce','butcher','bakery','pharm','home','online','nuts','pizza','shawarma','falafel','sweets','supplier','factory','catering','restaurant','vending','other'));
drop policy if exists "chains read" on public.chains;
create policy "chains read" on public.chains for select using (
  (status = 'approved' and not hidden) or created_by = auth.uid() or public.is_staff()
  or exists (select 1 from public.store_managers m where m.user_id = auth.uid() and m.chain = chains.name));
drop policy if exists "posts read" on public.store_posts;
create policy "posts read" on public.store_posts for select using (auth.uid() is not null and (
  ((status = 'approved' and not exists (select 1 from public.chains c where c.name = store_posts.chain and c.hidden)) or created_by = auth.uid() or public.is_staff())));
-- בעל/אחראי החנות (או הצוות) מעדכן את הפרופיל הציבורי של החנות
create or replace function public.store_profile_update(p_chain text, p jsonb) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return 'forbidden'; end if;
  if not (public.is_staff() or exists (select 1 from public.store_managers m where m.user_id = auth.uid() and m.chain = p_chain)) then return 'forbidden'; end if;
  update public.chains set
    about    = case when p ? 'about'    then left(coalesce(p->>'about', ''), 2000) else about end,
    phone    = case when p ? 'phone'    then left(coalesce(p->>'phone', ''), 30) else phone end,
    whatsapp = case when p ? 'whatsapp' then left(coalesce(p->>'whatsapp', ''), 30) else whatsapp end,
    address  = case when p ? 'address'  then left(coalesce(p->>'address', ''), 200) else address end,
    hours    = case when p ? 'hours'    then left(coalesce(p->>'hours', ''), 600) else hours end,
    website  = case when p ? 'website'  then nullif(left(coalesce(p->>'website', ''), 200), '') else website end
  where name = p_chain;
  if not found then return 'not_found'; end if;
  return 'ok';
end $$;
revoke all on function public.store_profile_update(text, jsonb) from public, anon;
grant execute on function public.store_profile_update(text, jsonb) to authenticated;
-- מיקום מדויק לסניפים (לחנויות הכי קרובות)
alter table public.branches add column if not exists lat double precision;
alter table public.branches add column if not exists lng double precision;

-- ---------- פניות מלקוחות לחנויות ----------
create table if not exists public.store_messages (
  id uuid primary key default gen_random_uuid(),
  chain text not null check (char_length(chain) between 1 and 40),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  name text not null default '' check (char_length(name) <= 40),
  phone text not null default '' check (char_length(phone) <= 30),
  body text not null check (char_length(body) between 1 and 2000),
  reply text not null default '' check (char_length(reply) <= 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  replied_at timestamptz
);
create index if not exists store_messages_chain on public.store_messages (chain, created_at desc);
alter table public.store_messages enable row level security;
drop policy if exists "messages send" on public.store_messages;
drop policy if exists "messages read" on public.store_messages;
drop policy if exists "messages answer" on public.store_messages;
drop policy if exists "messages admin delete" on public.store_messages;
create policy "messages send" on public.store_messages for insert with check (auth.uid() is not null and user_id = auth.uid());
create policy "messages read" on public.store_messages for select using (
  user_id = auth.uid() or public.is_admin() or exists (select 1 from public.store_managers m where m.user_id = auth.uid() and m.chain = store_messages.chain));
create policy "messages answer" on public.store_messages for update using (
  public.is_admin() or exists (select 1 from public.store_managers m where m.user_id = auth.uid() and m.chain = store_messages.chain))
  with check (public.is_admin() or exists (select 1 from public.store_managers m where m.user_id = auth.uid() and m.chain = store_messages.chain));
create policy "messages admin delete" on public.store_messages for delete using (public.is_admin());
create or replace function public.store_messages_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid(); new.name := public.my_name(); new.reply := ''; new.is_read := false; new.replied_at := null; new.created_at := now();
  else
    -- החנות רק מסמנת "נקרא" ועונה; את ההודעה עצמה אי אפשר לשנות
    new.chain := old.chain; new.user_id := old.user_id; new.name := old.name; new.phone := old.phone; new.body := old.body; new.created_at := old.created_at;
    if new.reply is distinct from old.reply then new.replied_at := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists store_messages_guard on public.store_messages;
create trigger store_messages_guard before insert or update on public.store_messages for each row execute function public.store_messages_guard();

-- ---------- יומן קניות (מה כל אחד קנה ואיפה) ----------
create table if not exists public.purchases (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product text not null check (char_length(product) between 1 and 80),
  qty text not null default '' check (char_length(qty) <= 20),
  store text not null default '' check (char_length(store) <= 40),
  bought_at timestamptz not null default now()
);
create index if not exists purchases_user on public.purchases (user_id, bought_at desc);
alter table public.purchases enable row level security;
drop policy if exists "purchases own" on public.purchases;
drop policy if exists "purchases admin read" on public.purchases;
create policy "purchases own" on public.purchases for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "purchases admin read" on public.purchases for select using (public.is_admin());

-- =====================================================================
--  גרסה 9: צ'אט עם האתר לכל משתמש ובעל עסק, ובקשות הצטרפות של בעלי עסקים
-- =====================================================================
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,   -- של מי השיחה
  from_staff boolean not null default false,                           -- נכתב ע"י צוות האתר
  author_name text not null default '' check (char_length(author_name) <= 40),
  body text not null check (char_length(body) between 1 and 4000),
  read_by_user boolean not null default false,
  read_by_staff boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists support_messages_user on public.support_messages (user_id, created_at);
alter table public.support_messages enable row level security;
drop policy if exists "support own read" on public.support_messages;
drop policy if exists "support own write" on public.support_messages;
drop policy if exists "support own mark" on public.support_messages;
drop policy if exists "support admin" on public.support_messages;
create policy "support own read"  on public.support_messages for select using (user_id = auth.uid());
create policy "support own write" on public.support_messages for insert with check (user_id = auth.uid() and not from_staff);
create policy "support own mark"  on public.support_messages for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "support admin"     on public.support_messages for all using (public.is_admin()) with check (public.is_admin());
create or replace function public.support_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.author_name := public.my_name(); new.created_at := now();
    if public.is_admin() and new.user_id <> auth.uid() then
      new.from_staff := true; new.read_by_staff := true; new.read_by_user := false;
    else
      new.user_id := auth.uid(); new.from_staff := false; new.read_by_user := true; new.read_by_staff := false;
    end if;
  else
    -- עדכון = רק סימון "נקרא"
    new.user_id := old.user_id; new.from_staff := old.from_staff; new.author_name := old.author_name; new.body := old.body; new.created_at := old.created_at;
    if not public.is_admin() then new.read_by_staff := old.read_by_staff; end if;
  end if;
  return new;
end $$;
drop trigger if exists support_guard on public.support_messages;
create trigger support_guard before insert or update on public.support_messages for each row execute function public.support_guard();
-- רשימת השיחות לבק אופיס
drop function if exists public.support_threads();
create or replace function public.support_threads()
returns table(user_id uuid, name text, email text, last_body text, last_at timestamptz, last_from_staff boolean, unread int, total int)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select m.user_id, coalesce(p.name, '')::text, coalesce(u.email, '')::text,
         (array_agg(m.body order by m.created_at desc))[1], max(m.created_at),
         (array_agg(m.from_staff order by m.created_at desc))[1],
         (count(*) filter (where not m.from_staff and not m.read_by_staff))::int, count(*)::int
  from public.support_messages m left join public.profiles p on p.id = m.user_id left join auth.users u on u.id = m.user_id
  group by m.user_id, p.name, u.email
  order by max(m.created_at) desc limit 500;
end $$;
revoke all on function public.support_threads() from public, anon;
grant execute on function public.support_threads() to authenticated;

create table if not exists public.business_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  name text not null default '' check (char_length(name) <= 60),
  email text not null default '' check (char_length(email) <= 120),
  phone text not null default '' check (char_length(phone) <= 30),
  business text not null check (char_length(business) between 1 and 60),
  branch text not null default '' check (char_length(branch) <= 120),
  category text not null default 'supermarket' check (char_length(category) <= 20),
  role text not null default 'owner' check (role in ('owner','manager')),
  message text not null default '' check (char_length(message) <= 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
alter table public.business_requests enable row level security;
drop policy if exists "bizreq send" on public.business_requests;
drop policy if exists "bizreq own" on public.business_requests;
drop policy if exists "bizreq admin" on public.business_requests;
create policy "bizreq send" on public.business_requests for insert with check (auth.uid() is not null and user_id = auth.uid() and status = 'pending');
create policy "bizreq own" on public.business_requests for select using (user_id = auth.uid());
create policy "bizreq admin" on public.business_requests for all using (public.is_admin()) with check (public.is_admin());
-- אישור התנאים לעסקים (העסק אחראי למחירים שהוא מפרסם) והסכמה לדיוור שיווקי (חוק התקשורת, סעיף 30א — רק מי שסימן בעצמו).
-- הזמן נקבע בשרת, כדי שיהיה תיעוד אמין מתי ניתנה ההסכמה.
alter table public.business_requests add column if not exists terms_ok boolean not null default false;
alter table public.business_requests add column if not exists terms_at timestamptz;
alter table public.business_requests add column if not exists marketing_ok boolean not null default false;
alter table public.business_requests add column if not exists marketing_at timestamptz;
create or replace function public.bizreq_guard() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  new.user_id := auth.uid(); new.status := 'pending';
  new.email := coalesce((select email from auth.users where id = auth.uid()), '');
  new.terms_ok := coalesce(new.terms_ok, false); new.marketing_ok := coalesce(new.marketing_ok, false);
  new.terms_at := case when new.terms_ok then now() end;
  new.marketing_at := case when new.marketing_ok then now() end;
  return new;
end $$;
drop trigger if exists bizreq_guard on public.business_requests;
create trigger bizreq_guard before insert on public.business_requests for each row execute function public.bizreq_guard();

-- =====================================================================
-- גרסה 10: התראות לטלפון/מחשב גם כשהאתר סגור, חסימת משתמשים ודיווחי שפה,
-- מתכונים (תמונה, קטגוריה, דירוג באימוג'י, מעקב), צ'אט עסקי, מוצרים אישיים עם תמונה
-- =====================================================================

-- ---------- מנויי התראות (Web Push) ----------
create table if not exists public.push_subs (
  endpoint text primary key check (char_length(endpoint) between 10 and 1000),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh text not null check (char_length(p256dh) <= 200),
  auth_key text not null check (char_length(auth_key) <= 100),
  ua text not null default '' check (char_length(ua) <= 200),
  created_at timestamptz not null default now(),
  last_ok timestamptz
);
create index if not exists push_subs_user on public.push_subs (user_id);
alter table public.push_subs enable row level security;
drop policy if exists "push own read" on public.push_subs;
drop policy if exists "push own delete" on public.push_subs;
create policy "push own read" on public.push_subs for select using (user_id = auth.uid());
create policy "push own delete" on public.push_subs for delete using (user_id = auth.uid());
-- העדפות: כמה ביום, שעות שקטות, שבת, ועל מה
create table if not exists public.push_prefs (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  max_per_day int not null default 6 check (max_per_day between 1 and 50),
  quiet boolean not null default true,
  shabbat boolean not null default true,
  kinds jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.push_prefs enable row level security;
-- 🔔 נובמבר 2026 (בקשת הבעלים): התראות בכל שעות היממה, רק לא בשבת. ברירת המחדל בלי "לא בלילה",
-- ופעם אחת מכבים את "לא בלילה" לכולם (מי שידליק שוב אחרי זה — updated_at חדש, ולא נדרס בהרצה חוזרת)
alter table public.push_prefs alter column quiet set default false;
update public.push_prefs set quiet = false where quiet and updated_at < '2026-11-12';
drop policy if exists "push prefs own" on public.push_prefs;
create policy "push prefs own" on public.push_prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_ua text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return 'forbidden'; end if;
  if p_endpoint !~ '^https://' then return 'bad'; end if;
  delete from public.push_subs where endpoint = p_endpoint;
  insert into public.push_subs(endpoint, user_id, p256dh, auth_key, ua) values (p_endpoint, auth.uid(), left(p_p256dh, 200), left(p_auth, 100), left(coalesce(p_ua, ''), 200));
  insert into public.push_prefs(user_id) values (auth.uid()) on conflict do nothing;
  return 'ok';
end $$;
revoke all on function public.push_subscribe(text, text, text, text) from public, anon;
grant execute on function public.push_subscribe(text, text, text, text) to authenticated;

-- תור ההתראות (רק השרת קורא/כותב)
create table if not exists public.push_queue (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'info',
  title text not null,
  body text not null default '',
  url text not null default '',
  tag text not null default '',
  status text not null default 'queued' check (status in ('queued','sent','skipped','failed')),
  note text not null default '',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists push_queue_open on public.push_queue (status, created_at);
alter table public.push_queue enable row level security;
-- מפתחות VAPID — נוצרים אוטומטית ע"י פונקציית השרת push (אף אחד לא יכול לקרוא חוץ מהשרת)
create table if not exists public.push_keys (
  id int primary key default 1 check (id = 1),
  public_key text not null,
  private_jwk jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.push_keys enable row level security;

-- "לדפוק בדלת" של פונקציית ההתראות (צריך את התוסף pg_net — נדלק למטה; אם אין — יש גם תזמון כל 10 דקות)
create or replace function public.push_poke() returns void
language plpgsql security definer set search_path = public as $$
begin
  begin
    execute 'select net.http_post(url := $1, body := $2)' using 'https://ygyfodxfbebnkwdcbjrp.supabase.co/functions/v1/push', '{"run":true}'::jsonb;
  exception when others then null;
  end;
end $$;
revoke all on function public.push_poke() from public, anon, authenticated;
create or replace function public.push_enqueue(p_user uuid, p_kind text, p_title text, p_body text, p_url text, p_tag text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  -- מכשיר שיכול לקבל: דפדפן עם Web Push, או טלפון עם האפליקציה (שמושכת את ההתראות דרך app_notices_for)
  if not exists (select 1 from public.push_subs where user_id = p_user)
     and not exists (select 1 from public.app_devices where user_id = p_user) then return; end if;
  -- גם למי שיש רק את האפליקציה יש שורת העדפות (בלי "לא בלילה") — אחרת פונקציית push משתמשת בברירת מחדל ישנה
  insert into public.push_prefs(user_id) values (p_user) on conflict do nothing;
  insert into public.push_queue(user_id, kind, title, body, url, tag)
  values (p_user, p_kind, left(p_title, 120), left(coalesce(p_body, ''), 300), left(coalesce(p_url, ''), 300), left(coalesce(p_tag, ''), 120));
  perform public.push_poke();
end $$;
revoke all on function public.push_enqueue(uuid, text, text, text, text, text) from public, anon, authenticated;
create or replace function public.admin_ids() returns setof uuid
language sql stable security definer set search_path = public, auth as $$
  select u.id from auth.users u where public.yam_owner_match(u.email, u.raw_app_meta_data) and u.email_confirmed_at is not null
  union select s.user_id from public.staff s where s.role = 'admin';
$$;
revoke all on function public.admin_ids() from public, anon, authenticated;

-- ---------- חסימות, השעיות ודיווחי שפה ----------
create table if not exists public.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 60),
  source text not null default 'bot' check (char_length(source) <= 20),
  text text not null check (char_length(text) between 1 and 500),
  handled boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists abuse_reports_user on public.abuse_reports (user_id, created_at desc);
alter table public.abuse_reports enable row level security;
drop policy if exists "abuse report" on public.abuse_reports;
drop policy if exists "abuse admin" on public.abuse_reports;
create policy "abuse report" on public.abuse_reports for insert with check (auth.uid() is not null and user_id = auth.uid());
create policy "abuse admin" on public.abuse_reports for all using (public.is_admin()) with check (public.is_admin());
create or replace function public.abuse_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.user_id := auth.uid(); new.handled := false; new.name := public.my_name();
    -- לא יותר מ-30 דיווחים לשעה למשתמש (שלא יציף)
    if (select count(*) from public.abuse_reports where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 30 then return null; end if;
  end if;
  return new;
end $$;
drop trigger if exists abuse_guard on public.abuse_reports;
create trigger abuse_guard before insert on public.abuse_reports for each row execute function public.abuse_guard();

create table if not exists public.user_bans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  kind text not null check (kind in ('warn','suspend','block')),
  until timestamptz,
  reason text not null default '' check (char_length(reason) <= 500),
  by_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  seen boolean not null default false
);
alter table public.user_bans enable row level security;
drop policy if exists "bans own read" on public.user_bans;
drop policy if exists "bans own seen" on public.user_bans;
drop policy if exists "bans admin" on public.user_bans;
create policy "bans own read" on public.user_bans for select using (user_id = auth.uid());
create policy "bans admin" on public.user_bans for all using (public.is_admin()) with check (public.is_admin());
create or replace function public.ban_seen() returns void
language sql security definer set search_path = public as $$
  update public.user_bans set seen = true where user_id = auth.uid();
$$;
grant execute on function public.ban_seen() to authenticated;
create or replace function public.not_banned() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is null or public.is_admin() or not exists (
    select 1 from public.user_bans b where b.user_id = auth.uid() and b.kind in ('suspend','block') and (b.until is null or b.until > now()));
$$;
grant execute on function public.not_banned() to anon, authenticated;
-- משתמש מושעה/חסום לא יכול לפרסם שום דבר ציבורי (אבל יכול לכתוב לצוות בצ'אט)
do $$
declare t text;
begin
  foreach t in array array['prices','recipes','bot_knowledge','divrei_torah','site_reviews','store_messages','store_posts','price_flags','business_requests','chains','branches','feedback']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "no banned" on public.%I', t);
      execute format('create policy "no banned" on public.%I as restrictive for insert with check (public.not_banned())', t);
    end if;
  end loop;
end $$;

-- ---------- מבצעים: גם לקוחות יכולים לדווח על מבצע בכל חנות (עובר לאישור מנהל) ----------
drop policy if exists "posts write" on public.store_posts;
create policy "posts write" on public.store_posts for insert with check (
  auth.uid() is not null and created_by = auth.uid()
  and (public.is_staff() or kind = 'deal' or exists (select 1 from public.store_managers m where m.user_id = auth.uid() and m.chain = store_posts.chain)));

-- ---------- מתכונים: תמונה, קטגוריה, מקור (יאמי/משתמש), דירוג באימוג'י, מעקב ----------
alter table public.recipes add column if not exists image text not null default ''
  check (char_length(image) <= 400000 and (image = '' or image ~ '^data:image/(jpeg|png|webp);base64,'));
alter table public.recipes add column if not exists category text not null default '' check (char_length(category) <= 30);
alter table public.recipes add column if not exists source text not null default 'user' check (source in ('user','ai'));
alter table public.recipes add column if not exists emojis text[];
alter table public.recipes add column if not exists updated_at timestamptz;
create table if not exists public.recipe_reactions (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);
alter table public.recipe_reactions enable row level security;
drop policy if exists "reactions read" on public.recipe_reactions;
drop policy if exists "reactions own" on public.recipe_reactions;
create policy "reactions read" on public.recipe_reactions for select using (auth.uid() is not null);
create policy "reactions own" on public.recipe_reactions for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.not_banned() and exists (select 1 from public.recipes r where r.id = recipe_id and r.status = 'approved'));
create table if not exists public.recipe_follows (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (char_length(category) between 1 and 30),
  created_at timestamptz not null default now(),
  primary key (user_id, category)
);
alter table public.recipe_follows enable row level security;
drop policy if exists "rfollow own" on public.recipe_follows;
create policy "rfollow own" on public.recipe_follows for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- צ'אט עסקי: נושא ופנייה פתוחה/סגורה ----------
alter table public.support_messages add column if not exists topic text not null default '' check (char_length(topic) <= 30);
create table if not exists public.support_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'open' check (status in ('open','closed')),
  topic text not null default '' check (char_length(topic) <= 30),
  updated_at timestamptz not null default now()
);
alter table public.support_status enable row level security;
drop policy if exists "sstatus own" on public.support_status;
drop policy if exists "sstatus admin" on public.support_status;
create policy "sstatus own" on public.support_status for select using (user_id = auth.uid());
create policy "sstatus admin" on public.support_status for all using (public.is_admin()) with check (public.is_admin());
create or replace function public.support_status_touch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not new.from_staff then
    insert into public.support_status(user_id, status, topic, updated_at) values (new.user_id, 'open', new.topic, now())
    on conflict (user_id) do update set status = 'open', topic = case when excluded.topic <> '' then excluded.topic else support_status.topic end, updated_at = now();
  end if;
  return new;
end $$;
drop trigger if exists support_status_touch on public.support_messages;
create trigger support_status_touch after insert on public.support_messages for each row execute function public.support_status_touch();
drop function if exists public.support_threads();
create or replace function public.support_threads()
returns table(user_id uuid, name text, email text, last_body text, last_at timestamptz, last_from_staff boolean, unread int, total int, status text, topic text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select m.user_id, coalesce(p.name, '')::text, coalesce(u.email, '')::text,
         (array_agg(m.body order by m.created_at desc))[1], max(m.created_at),
         (array_agg(m.from_staff order by m.created_at desc))[1],
         (count(*) filter (where not m.from_staff and not m.read_by_staff))::int, count(*)::int,
         coalesce(st.status, 'open')::text, coalesce(st.topic, '')::text
  from public.support_messages m left join public.profiles p on p.id = m.user_id left join auth.users u on u.id = m.user_id
  left join public.support_status st on st.user_id = m.user_id
  group by m.user_id, p.name, u.email, st.status, st.topic
  order by max(m.created_at) desc limit 500;
end $$;
revoke all on function public.support_threads() from public, anon;
grant execute on function public.support_threads() to authenticated;

-- ---------- המוצרים שלי: עריכה ותמונה — נשמר רק אצל המשתמש ----------
create table if not exists public.my_products (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pkey text not null check (char_length(pkey) between 1 and 80),
  name text not null default '' check (char_length(name) <= 80),
  brand text not null default '' check (char_length(brand) <= 40),
  barcode text not null default '' check (barcode ~ '^[0-9]{0,20}$'),
  emoji text not null default '' check (char_length(emoji) <= 16),
  category text not null default '' check (char_length(category) <= 30),
  image text not null default '' check (char_length(image) <= 200000 and (image = '' or image ~ '^data:image/(jpeg|png|webp);base64,')),
  updated_at timestamptz not null default now(),
  primary key (user_id, pkey)
);
alter table public.my_products enable row level security;
drop policy if exists "myprod own" on public.my_products;
create policy "myprod own" on public.my_products for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- מה נכנס לתור ההתראות ----------
create or replace function public.push_on_support() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  if new.from_staff then
    perform public.push_enqueue(new.user_id, 'chat', '💬 תשובה מצוות רשימת קניות', left(new.body, 200), '/#chat', 'chat:' || new.user_id);
  else
    for a in select public.admin_ids() loop
      if a <> new.user_id then perform public.push_enqueue(a, 'staff', '💬 הודעה חדשה בצ''אט', coalesce(nullif(public.my_name(), ''), 'משתמש') || ': ' || left(new.body, 160), '/#admin-support', 'staffchat:' || new.user_id); end if;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists push_on_support on public.support_messages;
create trigger push_on_support after insert on public.support_messages for each row execute function public.push_on_support();

create or replace function public.push_on_store_reply() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(old.reply, '') = '' and coalesce(new.reply, '') <> '' then
    perform public.push_enqueue(new.user_id, 'store', '🏪 ' || new.chain || ' ענו לך', left(new.reply, 200), '/', 'storereply:' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists push_on_store_reply on public.store_messages;
create trigger push_on_store_reply after update on public.store_messages for each row execute function public.push_on_store_reply();

create or replace function public.push_on_recipe() returns trigger
language plpgsql security definer set search_path = public as $$
declare f record;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'approved' then
      perform public.push_enqueue(new.author_id, 'recipe', '🎉 המתכון שלך פורסם!', new.name || ' — עכשיו כולם יכולים לראות ולדרג', '/#recipe-' || new.id, 'myrecipe:' || new.id);
      for f in select distinct rf.user_id from public.recipe_follows rf
               where (rf.category = '*' or rf.category = new.category) and rf.user_id is distinct from new.author_id loop
        perform public.push_enqueue(f.user_id, 'recipe', '🍲 מתכון חדש' || case when new.category <> '' then ' ב' || new.category else '' end, new.emoji || ' ' || new.name || case when new.author_name <> '' then ' · מאת ' || new.author_name else '' end, '/#recipe-' || new.id, 'newrecipe:' || new.id);
      end loop;
    elsif new.status = 'rejected' then
      perform public.push_enqueue(new.author_id, 'recipe', 'לגבי המתכון ששלחת', new.name || ' — לא פורסם הפעם. אפשר לשאול אותנו בצ''אט 🙂', '/#chat', 'myrecipe:' || new.id);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists push_on_recipe on public.recipes;
create trigger push_on_recipe after update on public.recipes for each row execute function public.push_on_recipe();

create or replace function public.push_on_reaction() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select id, name, author_id into r from public.recipes where id = new.recipe_id;
  if r.author_id is not null and r.author_id <> new.user_id then
    perform public.push_enqueue(r.author_id, 'recipe', new.emoji || ' מישהו דירג את המתכון שלך', r.name, '/#recipe-' || r.id, 'react:' || r.id);
  end if;
  return new;
end $$;
drop trigger if exists push_on_reaction on public.recipe_reactions;
create trigger push_on_reaction after insert on public.recipe_reactions for each row execute function public.push_on_reaction();

create or replace function public.push_on_post() returns trigger
language plpgsql security definer set search_path = public as $$
declare f record;
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    for f in select sf.user_id from public.store_follows sf where sf.chain = new.chain and sf.user_id is distinct from new.created_by loop
      perform public.push_enqueue(f.user_id, 'deal', case when new.kind = 'deal' then '🏷️ מבצע ב' else '📣 חדש ב' end || new.chain, new.title, '/', 'post:' || new.id);
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists push_on_post on public.store_posts;
create trigger push_on_post after insert or update on public.store_posts for each row execute function public.push_on_post();

create or replace function public.push_on_staff_item() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid; t text; b text;
begin
  if tg_table_name = 'business_requests' then
    t := '🏪 בקשת הצטרפות עסק'; b := to_jsonb(new)->>'business' || ' · ' || coalesce(to_jsonb(new)->>'name', '');
  else
    t := '🚫 דיווח על שפה לא נקייה'; b := coalesce(nullif(to_jsonb(new)->>'name', ''), 'משתמש') || ': ' || left(to_jsonb(new)->>'text', 120);
  end if;
  for a in select public.admin_ids() loop
    perform public.push_enqueue(a, 'staff', t, b, '/#admin-' || case tg_table_name when 'business_requests' then 'bizreq' else 'abuse' end, tg_table_name || ':' || coalesce(new.user_id::text, ''));
  end loop;
  return new;
end $$;
drop trigger if exists push_on_staff_item on public.business_requests;
create trigger push_on_staff_item after insert on public.business_requests for each row execute function public.push_on_staff_item();
drop trigger if exists push_on_staff_item on public.abuse_reports;
create trigger push_on_staff_item after insert on public.abuse_reports for each row execute function public.push_on_staff_item();

-- ---------- תוספים: pg_net (שליחה מיידית) + pg_cron (גיבוי כל 10 דקות, וגם שליחה אחרי שעות שקטות/שבת) ----------
do $$ begin create extension if not exists pg_net; exception when others then raise notice 'pg_net: %', sqlerrm; end $$;
do $$ begin create extension if not exists pg_cron; exception when others then raise notice 'pg_cron: %', sqlerrm; end $$;
do $$ begin
  if to_regnamespace('cron') is not null then
    execute $c$select cron.schedule('yam-push', '*/10 * * * *', 'select public.push_poke()')$c$;
  end if;
exception when others then raise notice 'cron schedule: %', sqlerrm; end $$;
-- תזכורת עדינה פעם בשבוע למי שלא נכנס 5 ימים (שהאתר לא יישכח — אבל בלי לחפור)
create or replace function public.push_weekly_nudge() returns int
language plpgsql security definer set search_path = public as $$
declare u record; n int := 0;
begin
  for u in select distinct s.user_id from public.push_subs s join public.profiles p on p.id = s.user_id
           where coalesce(p.last_seen, p.created_at) < now() - interval '5 days'
             and not exists (select 1 from public.push_queue q where q.user_id = s.user_id and q.kind = 'info' and q.tag = 'nudge' and q.created_at > now() - interval '7 days')
  loop
    perform public.push_enqueue(u.user_id, 'info', '🛒 מה צריך לקנות השבוע?', 'הרשימה שלך מחכה — יאמי תעזור להיזכר במה שנגמר ולמצוא איפה הכי זול 💚', '/', 'nudge');
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.push_weekly_nudge() from public, anon, authenticated;
do $$ begin
  if to_regnamespace('cron') is not null then
    execute $c$select cron.schedule('yam-nudge', '15 8 * * 0-4', 'select public.push_weekly_nudge()')$c$;
  end if;
exception when others then raise notice 'cron nudge: %', sqlerrm; end $$;
-- ניקוי תור ישן
delete from public.push_queue where created_at < now() - interval '30 days';

-- ---------- תוסף הכרום / הבק אופיס: גם דיווחי שפה ----------
create or replace function public.staff_events(p_since timestamptz default null)
returns table(kind text, ref text, title text, detail text, who text, created_at timestamptz, pending boolean)
language plpgsql stable security definer set search_path = public as $$
declare adm boolean := public.is_admin(); me uuid := auth.uid(); s timestamptz;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  s := greatest(coalesce(p_since, now() - interval '3 days'), now() - interval '30 days');
  return query
  select * from (
    select 'user'::text, p.id::text, p.name, p.email, ''::text, p.created_at, false
      from public.profiles p where adm and p.created_at > s and p.id <> me
    union all
    select 'feedback', f.id::text, f.name, left(f.message, 400), f.email, f.created_at, not f.is_read
      from public.feedback f where adm and f.created_at > s
    union all
    select 'recipe', r.id::text, case when r.source = 'ai' then '🤖 ' else '' end || r.name, left(r.steps, 300), r.author_name, r.created_at, r.status = 'pending'
      from public.recipes r where r.created_at > s and r.author_id is distinct from me
    union all
    select 'bot', k.id::text, k.question, left(k.answer, 300), k.author_name, k.created_at, k.status = 'pending'
      from public.bot_knowledge k where k.created_at > s and k.author_id is distinct from me
    union all
    select 'chain', c.id::text, c.name, c.kind, coalesce((select pr.name from public.profiles pr where pr.id = c.created_by), ''), c.created_at, c.status = 'pending'
      from public.chains c where c.created_at > s and c.created_by is not null and c.created_by <> me
    union all
    select 'branch', b.id::text, b.chain || ' — ' || b.city, b.address, coalesce((select pr.name from public.profiles pr where pr.id = b.created_by), ''), b.created_at, b.status = 'pending'
      from public.branches b where b.created_at > s and b.created_by is not null and b.created_by <> me
    union all
    select 'price', x.id::text, x.product, x.chain || case when x.branch <> '' then ' · ' || x.branch else '' end || ' · ' || x.price::text || ' ' || x.currency, x.by_name, x.created_at, x.status = 'pending'
      from public.prices x where x.created_at > s and x.by_id is distinct from me
    union all
    select 'post', o.id::text, o.title, o.chain || case when o.body <> '' then ' — ' || left(o.body, 200) else '' end, o.author_name, o.created_at, o.status = 'pending'
      from public.store_posts o where o.created_at > s and o.created_by is distinct from me
    union all
    select 'torah', d.id::text, case when d.title <> '' then d.title else 'פרשת ' || d.parasha end, 'פרשת ' || d.parasha || ' — ' || left(d.body, 250), d.author_name, d.created_at, d.status = 'pending'
      from public.divrei_torah d where d.created_at > s and d.author_id is distinct from me
    union all
    select 'chat', c.id::text, 'הודעה מ' || coalesce(nullif(c.author_name, ''), 'משתמש/ת'), left(c.body, 300), c.author_name, c.created_at, not c.read_by_staff
      from public.support_messages c where adm and not c.from_staff and c.created_at > s and c.user_id is distinct from me
    union all
    select 'bizreq', r.id::text, 'בקשת הצטרפות: ' || r.business, r.name || ' · ' || r.phone || case when r.message <> '' then ' — ' || left(r.message, 200) else '' end, r.name, r.created_at, r.status = 'pending'
      from public.business_requests r where adm and r.created_at > s
    union all
    select 'abuse', a.id::text, 'שפה לא נקייה: ' || coalesce(nullif(a.name, ''), 'משתמש'), left(a.text, 200), a.name, a.created_at, not a.handled
      from public.abuse_reports a where adm and a.created_at > s
    union all
    select 'flag', x.id::text, x.product || ' — דווח כלא נכון', x.chain || ' · ' || x.price::text || ' ' || x.currency || ' · ✅ ' || x.confirms || ' / ❌ ' || x.wrong, x.by_name, (select max(f.created_at) from public.price_flags f where f.price_id = x.id), true
      from public.prices x where x.wrong > 0 and exists (select 1 from public.price_flags f where f.price_id = x.id and f.created_at > s)
    union all
    select 'message', m.id::text, 'פנייה ל' || m.chain || case when m.name <> '' then ' מ' || m.name else '' end, left(m.body, 300), m.name, m.created_at, not m.is_read
      from public.store_messages m where adm and m.created_at > s and m.user_id is distinct from me
    union all
    select 'review', v.id::text, repeat('⭐', v.stars) || ' ' || v.author_name, left(v.body, 300), v.author_name, coalesce(v.updated_at, v.created_at), v.status = 'pending'
      from public.site_reviews v where coalesce(v.updated_at, v.created_at) > s and v.user_id is distinct from me
    union all
    -- 👤 מי נכנס / נרשם — רק משתמשים רשומים (לא אורחים), ורק למי שיש לו הרשאת "מי נכנס" + "התראות"
    select 'visit', v.id::text, coalesce(nullif(p.name, ''), 'משתמש/ת') || ' נכנס/ה לאתר', 'מקור: ' || v.src || case when v.device <> '' then ' · ' || v.device else '' end, coalesce(p.name, ''), v.at, false
      from public.visit_log v left join public.profiles p on p.id = v.user_id
      where v.at > s and v.user_id is not null and v.user_id <> me and public.staff_can('visitors') and public.staff_can('notify')
    union all
    select 'signup', g.user_id::text, coalesce(nullif(p.name, ''), 'משתמש/ת') || ' נרשם/ה לאתר', 'מקור: ' || g.src, coalesce(p.name, ''), g.at, false
      from public.visit_signups g left join public.profiles p on p.id = g.user_id
      where g.at > s and public.staff_can('visitors') and public.staff_can('notify')
    union all
    -- 🐞 תקלה באתר (מיומן השגיאות) — רק למנהלים. ✔ טופל בתוסף מוחק אותה מהיומן
    select 'error', x.id::text, left(x.msg, 120), x.src || case when x.ver <> '' then ' · גרסה ' || x.ver else '' end || case when x.ua <> '' then ' · ' || left(x.ua, 60) else '' end,
           coalesce((select pr.name from public.profiles pr where pr.id = x.user_id), 'אורח/ת'), x.created_at, true
      from public.client_errors x where adm and x.created_at > s
  ) e(kind, ref, title, detail, who, created_at, pending)
  order by e.created_at desc
  limit 300;
end $$;
create or replace function public.staff_pending()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare adm boolean := public.is_admin();
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'recipe',   (select count(*) from public.recipes where status = 'pending'),
    'bot',      (select count(*) from public.bot_knowledge where status = 'pending'),
    'chain',    (select count(*) from public.chains where status = 'pending'),
    'branch',   (select count(*) from public.branches where status = 'pending'),
    'price',    (select count(*) from public.prices where status = 'pending'),
    'post',     (select count(*) from public.store_posts where status = 'pending'),
    'torah',    (select count(*) from public.divrei_torah where status = 'pending'),
    'review',   (select count(*) from public.site_reviews where status = 'pending'),
    'flag',     (select count(*) from public.prices where wrong > 0 and wrong >= confirms),
    'chat',     case when adm then (select count(*) from public.support_messages where not from_staff and not read_by_staff) else 0 end,
    'bizreq',   case when adm then (select count(*) from public.business_requests where status = 'pending') else 0 end,
    'abuse',    case when adm then (select count(*) from public.abuse_reports where not handled) else 0 end,
    'message',  case when adm then (select count(*) from public.store_messages where not is_read) else 0 end,
    'feedback', case when adm then (select count(*) from public.feedback where not is_read) else 0 end,
    'error',    case when adm then (select count(*) from public.client_errors where created_at > now() - interval '30 days') else 0 end);
end $$;

-- =====================================================================
-- גרסה 12: ניהול חנות (מלאי, קופה, להזמין, שיתוף, חיבור לקופה) + מקורות מחירים אוטומטיים
-- =====================================================================
create or replace function public.manages(p_chain text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (select 1 from public.store_managers m where m.user_id = auth.uid() and m.chain = p_chain);
$$;
grant execute on function public.manages(text) to authenticated;
alter table public.chains add column if not exists inventory_public boolean not null default false;
alter table public.chains add column if not exists inventory_show_qty boolean not null default false;
alter table public.chains add column if not exists order_phone text not null default '' check (char_length(order_phone) <= 30);
alter table public.chains add column if not exists order_url text not null default '' check (char_length(order_url) <= 300 and (order_url = '' or order_url ~ '^https?://'));

create table if not exists public.store_inventory (
  id uuid primary key default gen_random_uuid(),
  chain text not null check (char_length(chain) between 1 and 40),
  name text not null check (char_length(name) between 1 and 80),
  barcode text not null default '' check (barcode ~ '^[0-9]{0,20}$'),
  category text not null default '' check (char_length(category) <= 30),
  unit text not null default '' check (char_length(unit) <= 20),
  price numeric(10,2) check (price is null or (price >= 0 and price < 100000)),
  qty numeric(12,2) not null default 0 check (qty > -100000 and qty < 10000000),
  min_qty numeric(12,2) not null default 0 check (min_qty >= 0 and min_qty < 10000000),
  visible boolean not null default true,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (chain, name)
);
create index if not exists store_inventory_bc on public.store_inventory (chain, barcode);
alter table public.store_inventory enable row level security;
drop policy if exists "inv manage" on public.store_inventory;
create policy "inv manage" on public.store_inventory for all using (public.manages(chain)) with check (public.manages(chain) and public.not_banned());
create or replace function public.inv_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists inv_touch on public.store_inventory;
create trigger inv_touch before update on public.store_inventory for each row execute function public.inv_touch();

create table if not exists public.store_sales (
  id bigserial primary key,
  chain text not null check (char_length(chain) between 1 and 40),
  item_id uuid references public.store_inventory(id) on delete set null,
  name text not null default '' check (char_length(name) <= 80),
  barcode text not null default '' check (barcode ~ '^[0-9]{0,20}$'),
  qty numeric(12,2) not null check (qty <> 0 and abs(qty) < 100000),
  price numeric(10,2) check (price is null or (price >= 0 and price < 100000)),
  total numeric(12,2),
  source text not null default 'manual' check (source in ('manual','pos','api','import')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists store_sales_chain on public.store_sales (chain, created_at desc);
alter table public.store_sales enable row level security;
drop policy if exists "sales manage" on public.store_sales;
create policy "sales manage" on public.store_sales for all using (public.manages(chain)) with check (public.manages(chain));
-- כל מכירה מורידה מהמלאי (לפי מזהה, ברקוד או שם)
create or replace function public.sale_apply() returns trigger
language plpgsql security definer set search_path = public as $$
declare it public.store_inventory%rowtype;
begin
  if new.item_id is not null then select * into it from public.store_inventory where id = new.item_id and chain = new.chain;
  elsif new.barcode <> '' then select * into it from public.store_inventory where chain = new.chain and barcode = new.barcode limit 1;
  else select * into it from public.store_inventory where chain = new.chain and lower(name) = lower(new.name) limit 1; end if;
  if found then
    new.item_id := it.id; new.name := it.name; if new.barcode = '' then new.barcode := it.barcode; end if;
    new.price := coalesce(new.price, it.price);
    update public.store_inventory set qty = qty - new.qty, updated_at = now() where id = it.id;
  end if;
  new.total := round(coalesce(new.price, 0) * new.qty, 2);
  return new;
end $$;
drop trigger if exists sale_apply on public.store_sales;
create trigger sale_apply before insert on public.store_sales for each row execute function public.sale_apply();

-- הגדרות שיתוף של החנות (רק בעל/אחראי החנות או הצוות)
create or replace function public.store_inventory_settings(p_chain text, p_public boolean, p_show_qty boolean, p_phone text, p_url text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not public.manages(p_chain) then return 'forbidden'; end if;
  if coalesce(p_url, '') <> '' and p_url !~ '^https?://' then return 'bad_url'; end if;
  update public.chains set inventory_public = coalesce(p_public, false), inventory_show_qty = coalesce(p_show_qty, false),
    order_phone = left(coalesce(p_phone, ''), 30), order_url = left(coalesce(p_url, ''), 300) where name = p_chain;
  return 'ok';
end $$;
grant execute on function public.store_inventory_settings(text, boolean, boolean, text, text) to authenticated;
-- דף ציבורי של החנות (כשבעל החנות בחר לשתף) — גם בלי להתחבר
create or replace function public.store_public(p_chain text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c record;
begin
  select * into c from public.chains where name = p_chain and status = 'approved' and not hidden and inventory_public;
  if not found then return null; end if;
  return jsonb_build_object('chain', c.name, 'phone', c.order_phone, 'url', c.order_url, 'whatsapp', c.whatsapp, 'about', c.about, 'address', c.address, 'hours', c.hours,
    'show_qty', c.inventory_show_qty, 'updated_at', (select max(i.updated_at) from public.store_inventory i where i.chain = c.name),
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'category', i.category, 'unit', i.unit, 'price', i.price, 'in_stock', i.qty > 0,
                       'qty', case when c.inventory_show_qty then i.qty else null end) order by i.category, i.name)
                       from public.store_inventory i where i.chain = c.name and i.visible), '[]'::jsonb));
end $$;
grant execute on function public.store_public(text) to anon, authenticated;
-- מפתח לחיבור הקופה (POS) — מוצג פעם אחת, נשמר רק כ"טביעת אצבע"
create table if not exists public.store_api_keys (
  chain text primary key,
  key_hash text not null,
  created_at timestamptz not null default now(),
  last_used timestamptz
);
alter table public.store_api_keys enable row level security;
create or replace function public.store_api_key_new(p_chain text) returns text
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if not public.manages(p_chain) then raise exception 'forbidden' using errcode = '42501'; end if;
  k := 'yam_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.store_api_keys(chain, key_hash) values (p_chain, encode(sha256(convert_to(k, 'UTF8')), 'hex'))
  on conflict (chain) do update set key_hash = excluded.key_hash, created_at = now(), last_used = null;
  return k;
end $$;
revoke all on function public.store_api_key_new(text) from public, anon;
grant execute on function public.store_api_key_new(text) to authenticated;
create or replace function public.store_api_key_info(p_chain text) returns table(created_at timestamptz, last_used timestamptz)
language sql stable security definer set search_path = public as $$
  select k.created_at, k.last_used from public.store_api_keys k where k.chain = p_chain and public.manages(p_chain);
$$;
grant execute on function public.store_api_key_info(text) to authenticated;

-- ---------- מקורות מחירים: קישור לאתר/קובץ מחירים, מתעדכן אוטומטית ----------
create table if not exists public.price_sources (
  id uuid primary key default gen_random_uuid(),
  url text not null check (char_length(url) <= 1000 and url ~ '^https?://'),
  chain text not null check (char_length(chain) between 1 and 40),
  branch text not null default '' check (char_length(branch) <= 120),
  every_hours int not null default 12 check (every_hours between 1 and 168),
  active boolean not null default true,
  last_run timestamptz,
  last_status text not null default '' check (char_length(last_status) <= 500),
  last_count int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.price_sources enable row level security;
drop policy if exists "sources admin" on public.price_sources;
create policy "sources admin" on public.price_sources for all using (public.is_admin()) with check (public.is_admin());
alter table public.prices add column if not exists source_id uuid references public.price_sources(id) on delete cascade;
create index if not exists prices_source on public.prices (source_id);
create or replace function public.prices_sync_poke() returns void
language plpgsql security definer set search_path = public as $$
begin
  begin
    execute 'select net.http_post(url := $1, body := $2)' using 'https://ygyfodxfbebnkwdcbjrp.supabase.co/functions/v1/prices-sync', '{"run":true}'::jsonb;
  exception when others then null;
  end;
end $$;
revoke all on function public.prices_sync_poke() from public, anon, authenticated;
do $$ begin
  if to_regnamespace('cron') is not null then
    execute $c$select cron.schedule('yam-prices', '7 * * * *', 'select public.prices_sync_poke()')$c$;
  end if;
exception when others then raise notice 'cron prices: %', sqlerrm; end $$;

-- =====================================================================
-- גרסה 13: עסקים — לקוח או בעל עסק בכניסה, פרופיל עסקי מלא (גם מפעלים וספקים למוסדות),
-- הזמנות מלקוחות, סנכרון מלאי מאתר ההזמנות של העסק, ותמונת מצב לכל העסקים בבק אופיס
-- =====================================================================
-- סוג חשבון: לקוח / בעל עסק (הבחירה בכניסה). נקודות מוניטין — רק המנהל משנה.
alter table public.profiles add column if not exists account_type text not null default 'customer' check (account_type in ('customer','business'));
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  new.email := coalesce((select email from auth.users where id = new.id), '');
  new.name := left(coalesce(new.name, ''), 40);
  if not public.is_admin() then
    if tg_op = 'INSERT' then new.rep_bonus := 0; else new.rep_bonus := old.rep_bonus; end if;
  end if;
  return new;
end $$;

-- פרופיל עסקי
alter table public.chains add column if not exists audience text not null default '' check (char_length(audience) <= 300);
alter table public.chains add column if not exists min_order numeric(10,2) check (min_order is null or (min_order >= 0 and min_order < 1000000));
alter table public.chains add column if not exists delivery_areas text not null default '' check (char_length(delivery_areas) <= 300);
alter table public.chains add column if not exists ordering_enabled boolean not null default false;
alter table public.chains add column if not exists show_prices boolean not null default true;
alter table public.chains add column if not exists biz_active boolean not null default true;
alter table public.business_requests add column if not exists audience text not null default '' check (char_length(audience) <= 300);
alter table public.business_requests add column if not exists address text not null default '' check (char_length(address) <= 200);
-- עדכון פרופיל + הגדרות שיתוף והזמנות (בעל/אחראי העסק, או המנהל)
create or replace function public.store_settings(p_chain text, p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare u text := coalesce(p->>'order_url', '');
begin
  if not public.manages(p_chain) then return 'forbidden'; end if;
  if u <> '' and u !~ '^https?://' then return 'bad_url'; end if;
  update public.chains set
    category = case when p ? 'category' and (p->>'category') in ('supermarket','grocery','produce','butcher','bakery','pharm','home','online','nuts','pizza','shawarma','falafel','sweets','supplier','factory','catering','restaurant','vending','other') then p->>'category' else category end,
    about = case when p ? 'about' then left(p->>'about', 2000) else about end,
    audience = case when p ? 'audience' then left(p->>'audience', 300) else audience end,
    address = case when p ? 'address' then left(p->>'address', 200) else address end,
    hours = case when p ? 'hours' then left(p->>'hours', 600) else hours end,
    phone = case when p ? 'phone' then left(p->>'phone', 30) else phone end,
    whatsapp = case when p ? 'whatsapp' then left(p->>'whatsapp', 30) else whatsapp end,
    website = case when p ? 'website' and coalesce(p->>'website','') ~ '^(https?://.*)?$' then nullif(left(p->>'website', 300), '') else website end,
    delivery_areas = case when p ? 'delivery_areas' then left(p->>'delivery_areas', 300) else delivery_areas end,
    min_order = case when p ? 'min_order' then nullif(p->>'min_order', '')::numeric else min_order end,
    order_phone = case when p ? 'order_phone' then left(p->>'order_phone', 30) else order_phone end,
    order_url = case when p ? 'order_url' then left(u, 300) else order_url end,
    inventory_public = case when p ? 'inventory_public' then (p->>'inventory_public')::boolean else inventory_public end,
    inventory_show_qty = case when p ? 'inventory_show_qty' then (p->>'inventory_show_qty')::boolean else inventory_show_qty end,
    show_prices = case when p ? 'show_prices' then (p->>'show_prices')::boolean else show_prices end,
    ordering_enabled = case when p ? 'ordering_enabled' then (p->>'ordering_enabled')::boolean else ordering_enabled end
  where name = p_chain;
  return 'ok';
exception when others then return 'error: ' || sqlerrm;
end $$;
grant execute on function public.store_settings(text, jsonb) to authenticated;
-- דף ציבורי של העסק: פרופיל + מלאי (רק מה שהעסק בחר להראות)
create or replace function public.store_public(p_chain text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c record;
begin
  select * into c from public.chains where name = p_chain and status = 'approved' and not hidden and biz_active and (inventory_public or ordering_enabled);
  if not found then return null; end if;
  return jsonb_build_object('chain', c.name, 'category', c.category, 'phone', coalesce(nullif(c.order_phone, ''), c.phone), 'url', coalesce(nullif(c.order_url, ''), c.website, ''),
    'whatsapp', c.whatsapp, 'about', c.about, 'audience', c.audience, 'address', c.address, 'hours', c.hours, 'delivery_areas', c.delivery_areas, 'min_order', c.min_order,
    'ordering', c.ordering_enabled, 'show_prices', c.show_prices, 'show_qty', c.inventory_show_qty,
    'updated_at', (select max(i.updated_at) from public.store_inventory i where i.chain = c.name),
    'items', case when c.inventory_public or c.ordering_enabled then coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'category', i.category, 'unit', i.unit,
                       'price', case when c.show_prices then i.price else null end, 'in_stock', i.qty > 0,
                       'qty', case when c.inventory_show_qty then i.qty else null end) order by i.category, i.name)
                       from public.store_inventory i where i.chain = c.name and i.visible), '[]'::jsonb) else '[]'::jsonb end);
end $$;
grant execute on function public.store_public(text) to anon, authenticated;
-- מדריך עסקים ציבורי (רק עסקים שבחרו להופיע)
drop function if exists public.biz_directory();
create or replace function public.biz_directory() returns table(chain text, category text, about text, audience text, address text, delivery_areas text, ordering boolean, items int)
language sql stable security definer set search_path = public as $$
  select c.name, c.category, left(c.about, 200), c.audience, c.address, c.delivery_areas, c.ordering_enabled,
         (select count(*)::int from public.store_inventory i where i.chain = c.name and i.visible)
  from public.chains c where c.status = 'approved' and not c.hidden and c.biz_active and (c.inventory_public or c.ordering_enabled)
  order by c.name;
$$;
grant execute on function public.biz_directory() to anon, authenticated;

-- ---------- הזמנות מלקוחות ----------
create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  chain text not null check (char_length(chain) between 1 and 40),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  phone text not null check (char_length(phone) between 6 and 30),
  address text not null default '' check (char_length(address) <= 200),
  note text not null default '' check (char_length(note) <= 1000),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 300),
  total numeric(12,2),
  status text not null default 'new' check (status in ('new','confirmed','ready','delivered','cancelled')),
  status_note text not null default '' check (char_length(status_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists store_orders_chain on public.store_orders (chain, created_at desc);
create index if not exists store_orders_user on public.store_orders (user_id, created_at desc);
alter table public.store_orders enable row level security;
drop policy if exists "orders place" on public.store_orders;
drop policy if exists "orders read" on public.store_orders;
drop policy if exists "orders manage" on public.store_orders;
drop policy if exists "orders cancel own" on public.store_orders;
create policy "orders place" on public.store_orders for insert with check (
  auth.uid() is not null and user_id = auth.uid() and status = 'new' and public.not_banned()
  and exists (select 1 from public.chains c where c.name = chain and c.ordering_enabled and c.biz_active and c.status = 'approved' and not c.hidden));
create policy "orders read" on public.store_orders for select using (user_id = auth.uid() or public.manages(chain));
create policy "orders manage" on public.store_orders for update using (public.manages(chain)) with check (public.manages(chain));
create policy "orders cancel own" on public.store_orders for update using (user_id = auth.uid() and status = 'new') with check (user_id = auth.uid() and status in ('new','cancelled'));
create or replace function public.orders_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare t numeric := 0; it jsonb; inv record;
begin
  if tg_op = 'INSERT' then
    -- המחירים נלקחים מהמלאי של העסק (לא ממה שהלקוח שלח)
    for it in select * from jsonb_array_elements(new.items) loop
      select price into inv from public.store_inventory where chain = new.chain and (id::text = it->>'id' or lower(name) = lower(it->>'name')) limit 1;
      t := t + coalesce(inv.price, 0) * greatest(0, coalesce((it->>'qty')::numeric, 1));
    end loop;
    new.total := round(t, 2);
    if (select count(*) from public.store_orders where user_id = new.user_id and created_at > now() - interval '1 hour') >= 10 then
      raise exception 'too many orders' using errcode = '42501'; end if;
  else
    new.updated_at := now(); new.items := old.items; new.total := old.total; new.chain := old.chain; new.user_id := old.user_id; new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists orders_guard on public.store_orders;
create trigger orders_guard before insert or update on public.store_orders for each row execute function public.orders_guard();
create or replace function public.push_on_order() returns trigger
language plpgsql security definer set search_path = public as $$
declare m uuid;
  st text := case new.status when 'confirmed' then 'אושרה ✅' when 'ready' then 'מוכנה 📦' when 'delivered' then 'נמסרה 🚚' when 'cancelled' then 'בוטלה' else 'התקבלה' end;
begin
  if tg_op = 'INSERT' then
    for m in select sm.user_id from public.store_managers sm where sm.chain = new.chain loop
      perform public.push_enqueue(m, 'store', '🛍️ הזמנה חדשה מ' || new.name, jsonb_array_length(new.items) || ' מוצרים' || case when new.total > 0 then ' · ' || new.total || ' ₪' else '' end, '/', 'order:' || new.id);
    end loop;
  elsif new.status is distinct from old.status and new.user_id is not null then
    perform public.push_enqueue(new.user_id, 'store', '🛍️ ההזמנה מ' || new.chain || ' ' || st, coalesce(nullif(new.status_note, ''), ''), '/', 'orderst:' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists push_on_order on public.store_orders;
create trigger push_on_order after insert or update on public.store_orders for each row execute function public.push_on_order();

-- ---------- סנכרון מאתר ההזמנות של העסק: גם בעל העסק מוסיף קישור, והמלאי מתעדכן לבד ----------
alter table public.price_sources add column if not exists target text not null default 'prices' check (target in ('prices','inventory','both'));
drop policy if exists "sources admin" on public.price_sources;
drop policy if exists "sources owner" on public.price_sources;
create policy "sources admin" on public.price_sources for all using (public.is_admin()) with check (public.is_admin());
create policy "sources owner" on public.price_sources for all using (public.manages(chain)) with check (public.manages(chain) and target in ('inventory','both'));

-- ---------- בק אופיס: תמונת מצב של כל העסקים ----------
create or replace function public.biz_overview() returns table(chain text, category text, status text, hidden boolean, biz_active boolean, inventory_public boolean, ordering boolean,
  managers int, manager_emails text, items int, low_items int, orders_30d int, open_orders int, sales_30d numeric, sources int, last_update timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select c.name, c.category, c.status, c.hidden, c.biz_active, c.inventory_public, c.ordering_enabled,
    (select count(*)::int from public.store_managers m where m.chain = c.name),
    coalesce((select string_agg(u.email, ', ') from public.store_managers m join auth.users u on u.id = m.user_id where m.chain = c.name), '')::text,
    (select count(*)::int from public.store_inventory i where i.chain = c.name),
    (select count(*)::int from public.store_inventory i where i.chain = c.name and i.qty <= i.min_qty),
    (select count(*)::int from public.store_orders o where o.chain = c.name and o.created_at > now() - interval '30 days'),
    (select count(*)::int from public.store_orders o where o.chain = c.name and o.status in ('new','confirmed','ready')),
    coalesce((select sum(s.total) from public.store_sales s where s.chain = c.name and s.created_at > now() - interval '30 days'), 0),
    (select count(*)::int from public.price_sources p where p.chain = c.name),
    (select max(i.updated_at) from public.store_inventory i where i.chain = c.name)
  from public.chains c
  where exists (select 1 from public.store_managers m where m.chain = c.name) or exists (select 1 from public.store_inventory i where i.chain = c.name)
     or c.inventory_public or c.ordering_enabled
  order by c.name;
end $$;
revoke all on function public.biz_overview() from public, anon;
grant execute on function public.biz_overview() to authenticated;
create or replace function public.biz_set_active(p_chain text, p_active boolean) returns void
language sql security definer set search_path = public as $$
  update public.chains set biz_active = p_active where name = p_chain and public.is_admin();
$$;
grant execute on function public.biz_set_active(text, boolean) to authenticated;

-- =====================================================================
-- גרסה 14: לוגו לעסק, תמונות למוצרים, פרסום אוטומטי של מחירי העסק בהשוואה, התראות לבעלי עסקים,
-- מחיקת עסק מהבק אופיס
-- =====================================================================
alter table public.chains add column if not exists logo text not null default ''
  check (char_length(logo) <= 200000 and (logo = '' or logo ~ '^data:image/(jpeg|png|webp);base64,'));
alter table public.chains add column if not exists publish_prices boolean not null default false;
alter table public.store_inventory add column if not exists image text not null default ''
  check (char_length(image) <= 200000 and (image = '' or image ~ '^data:image/(jpeg|png|webp);base64,'));
alter table public.products add column if not exists image text not null default ''
  check (char_length(image) <= 200000 and (image = '' or image ~ '^data:image/(jpeg|png|webp);base64,'));

-- הגדרות העסק: גם לוגו ופרסום מחירים
create or replace function public.store_settings(p_chain text, p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare u text := coalesce(p->>'order_url', '');
begin
  if not public.manages(p_chain) then return 'forbidden'; end if;
  if u <> '' and u !~ '^https?://' then return 'bad_url'; end if;
  if p ? 'logo' and coalesce(p->>'logo', '') <> '' and (p->>'logo' !~ '^data:image/(jpeg|png|webp);base64,' or char_length(p->>'logo') > 200000) then return 'bad_logo'; end if;
  update public.chains set
    category = case when p ? 'category' and (p->>'category') in ('supermarket','grocery','produce','butcher','bakery','pharm','home','online','nuts','pizza','shawarma','falafel','sweets','supplier','factory','catering','restaurant','vending','other') then p->>'category' else category end,
    about = case when p ? 'about' then left(p->>'about', 2000) else about end,
    audience = case when p ? 'audience' then left(p->>'audience', 300) else audience end,
    address = case when p ? 'address' then left(p->>'address', 200) else address end,
    hours = case when p ? 'hours' then left(p->>'hours', 600) else hours end,
    phone = case when p ? 'phone' then left(p->>'phone', 30) else phone end,
    whatsapp = case when p ? 'whatsapp' then left(p->>'whatsapp', 30) else whatsapp end,
    website = case when p ? 'website' and coalesce(p->>'website','') ~ '^(https?://.*)?$' then nullif(left(p->>'website', 300), '') else website end,
    delivery_areas = case when p ? 'delivery_areas' then left(p->>'delivery_areas', 300) else delivery_areas end,
    min_order = case when p ? 'min_order' then nullif(p->>'min_order', '')::numeric else min_order end,
    order_phone = case when p ? 'order_phone' then left(p->>'order_phone', 30) else order_phone end,
    order_url = case when p ? 'order_url' then left(u, 300) else order_url end,
    logo = case when p ? 'logo' then coalesce(p->>'logo', '') else logo end,
    inventory_public = case when p ? 'inventory_public' then (p->>'inventory_public')::boolean else inventory_public end,
    inventory_show_qty = case when p ? 'inventory_show_qty' then (p->>'inventory_show_qty')::boolean else inventory_show_qty end,
    show_prices = case when p ? 'show_prices' then (p->>'show_prices')::boolean else show_prices end,
    publish_prices = case when p ? 'publish_prices' then (p->>'publish_prices')::boolean else publish_prices end,
    ordering_enabled = case when p ? 'ordering_enabled' then (p->>'ordering_enabled')::boolean else ordering_enabled end
  where name = p_chain;
  return 'ok';
exception when others then return 'error: ' || sqlerrm;
end $$;
grant execute on function public.store_settings(text, jsonb) to authenticated;

-- מחירי העסק מתפרסמים אוטומטית בהשוואת המחירים (אם העסק בחר "לפרסם מחירים" ו"להראות מחירים")
alter table public.prices add column if not exists inv_id uuid references public.store_inventory(id) on delete cascade;
create index if not exists prices_inv on public.prices (inv_id);
create or replace function public.inv_publish() returns trigger
language plpgsql security definer set search_path = public as $$
declare c record; ok boolean;
begin
  select publish_prices, show_prices, biz_active, status, hidden into c from public.chains where name = new.chain;
  ok := found;
  delete from public.prices where inv_id = new.id;
  if ok and c.publish_prices and c.show_prices and c.biz_active and c.status = 'approved' and not c.hidden
     and new.visible and new.price is not null and new.price > 0 then
    perform set_config('app.bypass_price_guard', 'on', true);
    insert into public.prices(product, product_key, chain, branch, price, currency, barcode, status, verified, by_id, by_name, inv_id)
    values (left(new.name, 60), regexp_replace(regexp_replace(left(new.name, 60), '[''’`׳"]', '', 'g'), '\s+', ' ', 'g'), new.chain, '', new.price, 'ILS',
            case when new.barcode ~ '^[0-9]{4,20}$' then new.barcode else null end, 'approved', true, null, new.chain, new.id);
    perform set_config('app.bypass_price_guard', 'off', true);
  end if;
  return new;
end $$;
drop trigger if exists inv_publish on public.store_inventory;
create trigger inv_publish after insert or update of name, price, barcode, visible on public.store_inventory for each row execute function public.inv_publish();
-- כשמשנים את ההגדרה — מפרסמים / מסירים את כל המחירים של העסק בבת אחת
create or replace function public.chain_publish_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.publish_prices is distinct from old.publish_prices or new.show_prices is distinct from old.show_prices
     or new.biz_active is distinct from old.biz_active or new.hidden is distinct from old.hidden then
    update public.store_inventory set price = price where chain = new.name;
  end if;
  return new;
end $$;
drop trigger if exists chain_publish_sync on public.chains;
create trigger chain_publish_sync after update on public.chains for each row execute function public.chain_publish_sync();

-- דף ציבורי ומדריך: גם לוגו ותמונות מוצרים
create or replace function public.store_public(p_chain text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c record;
begin
  select * into c from public.chains where name = p_chain and status = 'approved' and not hidden and biz_active and (inventory_public or ordering_enabled);
  if not found then return null; end if;
  return jsonb_build_object('chain', c.name, 'category', c.category, 'logo', c.logo, 'phone', coalesce(nullif(c.order_phone, ''), c.phone), 'url', coalesce(nullif(c.order_url, ''), c.website, ''),
    'whatsapp', c.whatsapp, 'about', c.about, 'audience', c.audience, 'address', c.address, 'hours', c.hours, 'delivery_areas', c.delivery_areas, 'min_order', c.min_order,
    'ordering', c.ordering_enabled, 'show_prices', c.show_prices, 'show_qty', c.inventory_show_qty,
    'updated_at', (select max(i.updated_at) from public.store_inventory i where i.chain = c.name),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'category', i.category, 'unit', i.unit, 'image', i.image,
                       'price', case when c.show_prices then i.price else null end, 'in_stock', i.qty > 0,
                       'qty', case when c.inventory_show_qty then i.qty else null end) order by i.category, i.name)
                       from public.store_inventory i where i.chain = c.name and i.visible), '[]'::jsonb));
end $$;
grant execute on function public.store_public(text) to anon, authenticated;
drop function if exists public.biz_directory();
create or replace function public.biz_directory() returns table(chain text, category text, about text, audience text, address text, delivery_areas text, ordering boolean, items int, logo text)
language sql stable security definer set search_path = public as $$
  select c.name, c.category, left(c.about, 200), c.audience, c.address, c.delivery_areas, c.ordering_enabled,
         (select count(*)::int from public.store_inventory i where i.chain = c.name and i.visible), c.logo
  from public.chains c where c.status = 'approved' and not c.hidden and c.biz_active and (c.inventory_public or c.ordering_enabled)
  order by c.name;
$$;
grant execute on function public.biz_directory() to anon, authenticated;

-- התראות לבעלי העסק: פנייה מלקוח, מוצר שירד מתחת למינימום, מבצע שאושר
create or replace function public.push_to_managers(p_chain text, p_kind text, p_title text, p_body text, p_tag text) returns void
language plpgsql security definer set search_path = public as $$
declare m uuid;
begin
  for m in select sm.user_id from public.store_managers sm where sm.chain = p_chain loop
    perform public.push_enqueue(m, p_kind, p_title, p_body, '/#biz', p_tag);
  end loop;
end $$;
revoke all on function public.push_to_managers(text, text, text, text, text) from public, anon, authenticated;
create or replace function public.push_on_store_msg() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.push_to_managers(new.chain, 'store', '💬 פנייה חדשה מ' || coalesce(nullif(new.name, ''), 'לקוח'), left(new.body, 200), 'storemsg:' || new.chain);
  return new;
end $$;
drop trigger if exists push_on_store_msg on public.store_messages;
create trigger push_on_store_msg after insert on public.store_messages for each row execute function public.push_on_store_msg();
create or replace function public.push_on_low_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.min_qty > 0 and new.qty <= new.min_qty and old.qty > old.min_qty then
    perform public.push_to_managers(new.chain, 'store', '📋 צריך להזמין: ' || new.name, 'נשארו ' || trim(to_char(new.qty, 'FM999999990.##')) || ' (מינימום ' || trim(to_char(new.min_qty, 'FM999999990.##')) || ')', 'low:' || new.chain);
  end if;
  return new;
end $$;
drop trigger if exists push_on_low_stock on public.store_inventory;
create trigger push_on_low_stock after update of qty on public.store_inventory for each row execute function public.push_on_low_stock();
create or replace function public.push_on_post_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status = 'approved' and old.status is distinct from 'approved' and new.created_by is not null then
    perform public.push_enqueue(new.created_by, 'store', '✅ המבצע שלך פורסם', new.title, '/', 'postok:' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists push_on_post_status on public.store_posts;
create trigger push_on_post_status after update on public.store_posts for each row execute function public.push_on_post_status();

-- מחיקת עסק (רק המנהל) — כולל המלאי, ההזמנות, המכירות, הסנכרונים, המנהלים, הסניפים והמחירים שלו
create or replace function public.biz_delete(p_chain text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then return 'forbidden'; end if;
  delete from public.store_orders where chain = p_chain;
  delete from public.store_sales where chain = p_chain;
  delete from public.store_inventory where chain = p_chain;
  delete from public.price_sources where chain = p_chain;
  delete from public.store_api_keys where chain = p_chain;
  delete from public.store_managers where chain = p_chain;
  delete from public.store_messages where chain = p_chain;
  delete from public.store_posts where chain = p_chain;
  delete from public.prices where chain = p_chain;
  delete from public.branches where chain = p_chain;
  delete from public.store_follows where chain = p_chain;
  delete from public.chains where name = p_chain;
  return 'ok';
end $$;
revoke all on function public.biz_delete(text) from public, anon;
grant execute on function public.biz_delete(text) to authenticated;

-- ================= גרסה 15: משתמשים משניים עם הרשאות =================
-- המשתמש הראשי מזמין בקישור + סיסמה חד פעמית, בוחר מה המשני רואה ומה מותר לו לעשות, ויכול להסיר אותו בכל רגע.
create extension if not exists pgcrypto with schema extensions;
alter table public.room_members add column if not exists role text not null default 'full';
alter table public.room_members add column if not exists name text not null default '';
alter table public.room_members add column if not exists perms jsonb not null default '{}'::jsonb;
alter table public.room_members add column if not exists invited_by uuid;
do $$ begin
  alter table public.room_members add constraint room_members_role_chk check (role in ('full','secondary'));
exception when duplicate_object then null; end $$;
alter table public.profiles add column if not exists max_secondary int;

create table if not exists public.room_invites (
  token text primary key,
  room_code text not null references public.rooms(code) on delete cascade,
  otp_hash text not null,
  perms jsonb not null default '{}'::jsonb,
  label text not null default '',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  attempts int not null default 0,
  used_at timestamptz,
  used_by uuid
);
alter table public.room_invites enable row level security;
-- אין גישה ישירה לטבלה — רק דרך הפונקציות למטה
revoke all on public.room_invites from anon, authenticated;

-- חבר מלא (בעלים / בן משפחה עם קוד) — רואה וכותב הכל ישירות
create or replace function public.is_room_full(p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.room_members where room_code = p_code and user_id = auth.uid() and role = 'full');
$$;
drop policy if exists "rooms member read" on public.rooms;
drop policy if exists "rooms member write" on public.rooms;
create policy "rooms member read"  on public.rooms for select using (public.is_room_full(code));
create policy "rooms member write" on public.rooms for update using (public.is_room_full(code)) with check (public.is_room_full(code));

-- אילו חלקים בנתונים שייכים לכל הרשאה
create or replace function public.room_section_keys(p_section text) returns text[]
language sql immutable as $$
  select case p_section
    when 'lists'   then array['lists','plans','stats','templates']
    when 'history' then array['history']
    when 'home'    then array['pantry','customPantry','stock','missingHome','homeMod']
    when 'recipes' then array['customRecipes']
    else array[]::text[] end;
$$;
-- ברירת מחדל להרשאות של משתמש משני
create or replace function public.room_default_perms() returns jsonb
language sql immutable as $$
  select '{"view":{"lists":true,"history":true,"home":true,"recipes":true},"act":{"add":true,"check":true,"delete":false,"finish":true,"home_edit":true}}'::jsonb;
$$;
create or replace function public.room_clean_perms(p jsonb) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'view', jsonb_build_object(
      'lists',   coalesce((p->'view'->>'lists')::boolean, true),
      'history', coalesce((p->'view'->>'history')::boolean, true),
      'home',    coalesce((p->'view'->>'home')::boolean, true),
      'recipes', coalesce((p->'view'->>'recipes')::boolean, true)),
    'act', jsonb_build_object(
      'add',       coalesce((p->'act'->>'add')::boolean, true),
      'check',     coalesce((p->'act'->>'check')::boolean, true),
      'delete',    coalesce((p->'act'->>'delete')::boolean, false),
      'finish',    coalesce((p->'act'->>'finish')::boolean, true),
      'home_edit', coalesce((p->'act'->>'home_edit')::boolean, true)));
$$;

-- כמה משתמשים משניים מותר (null = בלי הגבלה). המנהל קובע לכל משתמש או לכולם (site_config 'secondary')
create or replace function public.secondary_limit(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select max_secondary from public.profiles where id = p_user),
                  nullif((select value->>'max' from public.site_config where key = 'secondary'), '')::int);
$$;

-- יצירת הזמנה: מחזיר קישור (token) וסיסמה חד פעמית (נשמרת רק מוצפנת)
create or replace function public.room_invite_create(p_perms jsonb, p_label text default '') returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare c text; lim int; used int; tok text; otp text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select code into c from public.rooms where owner = auth.uid() order by updated_at limit 1;
  if c is null then raise exception 'no room'; end if;
  lim := public.secondary_limit(auth.uid());
  select count(*) into used from public.room_members where room_code = c and role = 'secondary';
  used := used + (select count(*) from public.room_invites where room_code = c and used_at is null and expires_at > now());
  if lim is not null and used >= lim then return jsonb_build_object('error', 'limit', 'limit', lim); end if;
  tok := encode(gen_random_bytes(18), 'hex');
  otp := lpad((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000)::text, 6, '0');
  insert into public.room_invites(token, room_code, otp_hash, perms, label, created_by)
  values (tok, c, encode(digest(otp || ':' || tok, 'sha256'), 'hex'), public.room_clean_perms(coalesce(p_perms, '{}'::jsonb)), left(coalesce(p_label, ''), 40), auth.uid());
  return jsonb_build_object('token', tok, 'otp', otp, 'expires_at', now() + interval '7 days');
end $$;

-- מה כתוב בהזמנה (לפני שמצטרפים) — רק שם המזמין, בלי נתונים
create or replace function public.room_invite_info(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('owner', coalesce(nullif(p.name, ''), 'משתמש'), 'valid', i.used_at is null and i.expires_at > now() and i.attempts < 5)
  from public.room_invites i join public.rooms r on r.code = i.room_code left join public.profiles p on p.id = r.owner
  where i.token = p_token;
$$;

-- הצטרפות של המשתמש המשני: שם + הסיסמה החד פעמית
create or replace function public.room_invite_accept(p_token text, p_otp text, p_name text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare i public.room_invites; owner uuid;
begin
  if auth.uid() is null then return jsonb_build_object('error', 'login'); end if;
  select * into i from public.room_invites where token = p_token for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if i.used_at is not null then return jsonb_build_object('error', 'used'); end if;
  if i.expires_at < now() or i.attempts >= 5 then return jsonb_build_object('error', 'expired'); end if;
  if encode(digest(trim(coalesce(p_otp, '')) || ':' || i.token, 'sha256'), 'hex') <> i.otp_hash then
    update public.room_invites set attempts = attempts + 1 where token = p_token;
    return jsonb_build_object('error', 'bad_otp', 'left', 4 - i.attempts);
  end if;
  select r.owner into owner from public.rooms r where r.code = i.room_code;
  if owner = auth.uid() then return jsonb_build_object('error', 'self'); end if;
  insert into public.room_members(room_code, user_id, role, name, perms, invited_by)
  values (i.room_code, auth.uid(), 'secondary', left(coalesce(nullif(trim(p_name), ''), 'משתמש משני'), 40), i.perms, i.created_by)
  on conflict (room_code, user_id) do update set role = 'secondary', name = excluded.name, perms = excluded.perms;
  update public.room_invites set used_at = now(), used_by = auth.uid() where token = p_token;
  perform public.push_enqueue(owner, 'info', '👥 ' || left(coalesce(nullif(trim(p_name), ''), 'משתמש משני'), 40) || ' הצטרף/ה', 'משתמש משני חדש התחבר לחשבון שלך', '/', 'member:' || i.room_code);
  return jsonb_build_object('ok', true, 'code', i.room_code);
end $$;

-- איך אני מחובר לחדר (בעלים / מלא / משני + הרשאות)
create or replace function public.room_access(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('role', case when r.owner = auth.uid() then 'owner' else m.role end, 'name', m.name,
                            'perms', case when m.role = 'secondary' then m.perms else null end,
                            'owner_name', (select coalesce(nullif(p.name, ''), 'משתמש') from public.profiles p where p.id = r.owner))
  from public.rooms r join public.room_members m on m.room_code = r.code and m.user_id = auth.uid()
  where r.code = upper(trim(p_code));
$$;

-- משתמש משני קורא רק את החלקים שמותר לו לראות
create or replace function public.room_get(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m public.room_members; d jsonb; out jsonb := '{}'::jsonb; s text; k text;
begin
  select * into m from public.room_members where room_code = upper(trim(p_code)) and user_id = auth.uid();
  if not found then return null; end if;
  select data into d from public.rooms where code = m.room_code;
  if m.role <> 'secondary' then return d; end if;
  foreach s in array array['lists','history','home','recipes'] loop
    if coalesce((m.perms->'view'->>s)::boolean, true) then
      foreach k in array public.room_section_keys(s) loop
        if d ? k then out := out || jsonb_build_object(k, d->k); end if;
      end loop;
    end if;
  end loop;
  return out;
end $$;

-- משתמש משני שומר — רק החלקים שמותר לו לשנות, השאר נשאר כמו שהיה
create or replace function public.room_put(p_code text, p_data jsonb, p_by text) returns boolean
language plpgsql security definer set search_path = public as $$
declare m public.room_members; d jsonb; s text; k text; can boolean;
begin
  select * into m from public.room_members where room_code = upper(trim(p_code)) and user_id = auth.uid();
  if not found or m.role <> 'secondary' then return false; end if;
  select data into d from public.rooms where code = m.room_code for update;
  foreach s in array array['lists','history','home'] loop
    can := coalesce((m.perms->'view'->>s)::boolean, true) and case s
      when 'lists'   then coalesce((m.perms->'act'->>'add')::boolean, true) or coalesce((m.perms->'act'->>'check')::boolean, true) or coalesce((m.perms->'act'->>'delete')::boolean, false) or coalesce((m.perms->'act'->>'finish')::boolean, true)
      when 'history' then coalesce((m.perms->'act'->>'finish')::boolean, true)
      when 'home'    then coalesce((m.perms->'act'->>'home_edit')::boolean, true)
      else false end;
    if can then
      foreach k in array public.room_section_keys(s) loop
        if p_data ? k then d := d || jsonb_build_object(k, p_data->k); end if;
      end loop;
    end if;
  end loop;
  update public.rooms set data = d, updated_by = left(coalesce(p_by, ''), 60), updated_at = now() where code = m.room_code;
  return true;
end $$;

-- המשתמש הראשי: רשימת המשתמשים, עדכון הרשאות, הסרה, ביטול הזמנות
create or replace function public.room_members_list() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'name', coalesce(nullif(m.name, ''), p.name, ''), 'role', m.role, 'perms', m.perms, 'joined_at', m.joined_at) order by m.joined_at)
       from public.room_members m left join public.profiles p on p.id = m.user_id
       where m.room_code = r.code and m.user_id <> r.owner), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('token', i.token, 'label', i.label, 'created_at', i.created_at, 'expires_at', i.expires_at) order by i.created_at desc)
       from public.room_invites i where i.room_code = r.code and i.used_at is null and i.expires_at > now() and i.attempts < 5), '[]'::jsonb),
    'limit', public.secondary_limit(auth.uid()))
  from public.rooms r where r.owner = auth.uid() order by r.updated_at limit 1;
$$;
create or replace function public.room_member_update(p_user uuid, p_perms jsonb, p_name text default null) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.room_members m set perms = public.room_clean_perms(p_perms), role = 'secondary', name = coalesce(left(nullif(trim(p_name), ''), 40), m.name)
  where m.user_id = p_user and m.room_code in (select code from public.rooms where owner = auth.uid()) and m.user_id <> auth.uid();
  return found;
end $$;
create or replace function public.room_member_remove(p_user uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  delete from public.room_members m
  where m.user_id = p_user and m.room_code in (select code from public.rooms where owner = auth.uid()) and m.user_id <> auth.uid();
  return found;
end $$;
create or replace function public.room_invite_cancel(p_token text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  delete from public.room_invites where token = p_token and room_code in (select code from public.rooms where owner = auth.uid());
  return found;
end $$;

-- בק אופיס: כמה משתמשים משניים יש לכל אחד + הגבלה
create or replace function public.admin_secondary_overview() returns jsonb
language sql stable security definer set search_path = public, auth as $$
  select case when not public.is_admin() then null else coalesce((
    select jsonb_agg(x order by x->>'count' desc) from (
      select jsonb_build_object('user_id', r.owner, 'name', coalesce(p.name, ''), 'email', u.email,
        'count', (select count(*) from public.room_members m where m.room_code = r.code and m.role = 'secondary'),
        'full', (select count(*) from public.room_members m where m.room_code = r.code and m.role = 'full' and m.user_id <> r.owner),
        'limit', p.max_secondary) as x
      from public.rooms r left join public.profiles p on p.id = r.owner left join auth.users u on u.id = r.owner
      where exists (select 1 from public.room_members m where m.room_code = r.code and m.user_id <> r.owner)
         or p.max_secondary is not null) t), '[]'::jsonb) end;
$$;
create or replace function public.admin_set_secondary_limit(p_user uuid, p_limit int) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then return false; end if;
  update public.profiles set max_secondary = case when p_limit is null or p_limit < 0 then null else p_limit end where id = p_user;
  return found;
end $$;

revoke all on function public.room_invite_create(jsonb, text) from public, anon;
revoke all on function public.room_invite_accept(text, text, text) from public, anon;
revoke all on function public.room_get(text) from public, anon;
revoke all on function public.room_put(text, jsonb, text) from public, anon;
revoke all on function public.room_members_list() from public, anon;
revoke all on function public.room_member_update(uuid, jsonb, text) from public, anon;
revoke all on function public.room_member_remove(uuid) from public, anon;
revoke all on function public.room_invite_cancel(text) from public, anon;
revoke all on function public.admin_secondary_overview() from public, anon;
revoke all on function public.admin_set_secondary_limit(uuid, int) from public, anon;
grant execute on function public.room_invite_create(jsonb, text), public.room_invite_accept(text, text, text), public.room_get(text), public.room_put(text, jsonb, text),
  public.room_members_list(), public.room_member_update(uuid, jsonb, text), public.room_member_remove(uuid), public.room_invite_cancel(text),
  public.admin_secondary_overview(), public.admin_set_secondary_limit(uuid, int), public.room_access(text), public.room_invite_info(text) to authenticated;

-- ================= גרסה 16: הקשחת הרשמה, כניסה ואיפוס קוד (בצד השרת) =================
-- כל ההגנות עובדות ברקע. ההרשמה והכניסה עם מייל+קוד עוברות דרך הפונקציה auth-guard (Edge Function).
-- הקודים נשמרים ע"י Supabase Auth כ-bcrypt בלבד (auth.users.encrypted_password) — אף פעם לא כטקסט גלוי.
create extension if not exists pgcrypto with schema extensions;

-- סוד פנימי לחתימות (נוצר פעם אחת, אף משתמש לא יכול לקרוא אותו — רק הפונקציה בשרת)
create table if not exists public.auth_secret (
  id int primary key default 1 check (id = 1),
  pepper text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  guard_seen_at timestamptz
);
insert into public.auth_secret(id) values (1) on conflict (id) do nothing;
alter table public.auth_secret enable row level security;
revoke all on public.auth_secret from anon, authenticated;

-- יומן אבטחה: הרשמה, כניסה (מוצלחת/כושלת), בקשת איפוס, שינוי קוד — עם IP, דפדפן ושעה
create table if not exists public.auth_events (
  id bigserial primary key,
  kind text not null check (kind in ('signup','signup_blocked','login','login_fail','login_locked','google_login','reset_request','reset_blocked','password_changed')),
  email text not null default '',
  user_id uuid references auth.users(id) on delete set null,
  ip text not null default '',
  ua text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists auth_events_email on public.auth_events (email, kind, created_at desc);
create index if not exists auth_events_ip on public.auth_events (ip, kind, created_at desc);
create index if not exists auth_events_user on public.auth_events (user_id, created_at desc);
alter table public.auth_events enable row level security;
revoke all on public.auth_events from anon, authenticated;
drop policy if exists "auth events admin read" on public.auth_events;
create policy "auth events admin read" on public.auth_events for select using (public.is_admin());
grant select on public.auth_events to authenticated;

-- קישורי איפוס שכבר נוצלו (כדי שקישור לא יעבוד פעם שנייה)
create table if not exists public.auth_reset_used (
  session_id text primary key,
  used_at timestamptz not null default now()
);
alter table public.auth_reset_used enable row level security;
revoke all on public.auth_reset_used from anon, authenticated;

-- דומיינים שאסור להירשם איתם (לא אמיתיים / מיילים זמניים)
create or replace function public.auth_email_blocked(p_email text) returns boolean
language plpgsql immutable as $$
declare d text := lower(split_part(coalesce(p_email, ''), '@', 2));
begin
  if d = '' or position('.' in d) = 0 then return true; end if;
  if d ~ '(^|\.)(example\.(com|org|net)|test|invalid|localhost|local|example)$' then return true; end if;
  if d ~ '(^|\.)(aminavin\.com|mailinator\.[a-z.]+|10minutemail\.[a-z.]+|10minemail\.com|guerrillamail\.[a-z.]+|guerrillamailblock\.com|sharklasers\.com|grr\.la|temp-mail\.[a-z.]+|tempmail\.[a-z.]+|tempmailo\.com|tempail\.com|tmpmail\.(org|net)|tmails\.net|yopmail\.[a-z.]+|throwawaymail\.com|trashmail\.[a-z.]+|getnada\.com|nada\.email|dispostable\.com|maildrop\.cc|mailnesia\.com|mintemail\.com|mohmal\.com|emailondeck\.com|fakeinbox\.com|fakemail\.net|spamgourmet\.com|mytemp\.email|tempr\.email|discard\.email|mailcatch\.com|moakt\.(com|cc)|burnermail\.io|inboxkitten\.com|emailfake\.com|email-fake\.com|1secmail\.(com|org|net)|dropmail\.me|10mail\.org|33mail\.com|spambox\.us|mailpoof\.com|tempinbox\.com|anonbox\.net|byom\.de|cuvox\.de|dayrep\.com|einrot\.com|fleckens\.hu|gustr\.com|jourrapide\.com|rhyta\.com|superrito\.com|teleworm\.us|armyspy\.com|mailtemp\.net|luxusmail\.org|minuteinbox\.com|tempmailaddress\.com|crazymailing\.com|harakirimail\.com|mailforspam\.com|spam4\.me|trash-mail\.com|wegwerfmail\.(de|net|org)|zetmail\.com)$' then return true; end if;
  return false;
end $$;
grant execute on function public.auth_email_blocked(text) to anon, authenticated;

-- הגנה במסד הנתונים: הרשמה עם מייל+קוד מתקבלת רק דרך האתר (הפונקציה auth-guard).
-- מי שמנסה לעקוף ולהירשם ישירות מול השרת — נחסם. כניסה עם גוגל לא מושפעת.
-- ההגנה נדלקת לבד בפעם הראשונה שהפונקציה auth-guard רצה (כדי לא לחסום הרשמות לפני שהיא הועלתה).
create or replace function public.auth_users_guard() returns trigger
language plpgsql security definer set search_path = public, extensions, auth as $$
declare prov text := coalesce(new.raw_app_meta_data->>'provider', 'email'); s public.auth_secret; mark text;
begin
  mark := coalesce(new.raw_user_meta_data->>'guard', '');
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'guard' - 'role' - 'is_admin' - 'staff';
  if coalesce(new.is_anonymous, false) or prov not in ('email', 'phone') then return new; end if;
  select * into s from public.auth_secret where id = 1;
  if s.guard_seen_at is null then return new; end if;
  if public.auth_email_blocked(new.email) then raise exception 'signup_blocked_domain'; end if;
  if exists (select 1 from auth.users ou where lower(ou.email) = lower(coalesce(new.email, '')) and ou.id is distinct from new.id and public.yam_owner_match(ou.email, ou.raw_app_meta_data)) then raise exception 'signup_blocked_owner'; end if;
  if mark = '' or mark <> encode(extensions.hmac(lower(coalesce(new.email, '')), s.pepper, 'sha256'), 'hex') then
    raise exception 'signup_via_site_only';
  end if;
  return new;
end $$;
drop trigger if exists auth_users_guard on auth.users;
create trigger auth_users_guard before insert on auth.users for each row execute function public.auth_users_guard();

-- הגדרות האבטחה (אפשר לשנות מהבק אופיס ← 🔐 אבטחה)
insert into public.site_config(key, value) values
  ('security', '{"signup_per_ip_hour":3,"login_fail_max":5,"login_window_min":15,"reset_per_email_hour":3,"reset_link_min":30,"ip_allow":[]}'::jsonb)
on conflict (key) do nothing;
drop policy if exists "config read" on public.site_config;
create policy "config read" on public.site_config for select using (key not in ('ai','security') or public.is_admin());

-- בק אופיס: פרטי ההרשמה והכניסה האחרונה של כל משתמש (IP, דפדפן, שעה)
create or replace function public.admin_user_security() returns table(user_id uuid, signup_ip text, signup_ua text, signup_at timestamptz, login_ip text, login_ua text, login_at timestamptz, fails_24h int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select u.id,
    s.ip, s.ua, s.created_at,
    l.ip, l.ua, l.created_at,
    (select count(*)::int from public.auth_events f where f.kind = 'login_fail' and f.email = lower(u.email) and f.created_at > now() - interval '24 hours')
  from auth.users u
  left join lateral (select e.ip, e.ua, e.created_at from public.auth_events e where e.user_id = u.id and e.kind = 'signup' order by e.created_at desc limit 1) s on true
  left join lateral (select e.ip, e.ua, e.created_at from public.auth_events e where e.user_id = u.id and e.kind in ('login','google_login','signup') order by e.created_at desc limit 1) l on true;
end $$;
revoke all on function public.admin_user_security() from public, anon;
grant execute on function public.admin_user_security() to authenticated;

-- הרשאות: משתמש לא יכול לתת לעצמו תפקיד או הרשאות (גם לא דרך הפרופיל)
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  new.email := coalesce((select email from auth.users where id = new.id), '');
  new.name := left(coalesce(new.name, ''), 40);
  if not public.is_admin() then
    if tg_op = 'INSERT' then new.rep_bonus := 0; new.max_secondary := null; new.account_type := 'customer';
    else new.rep_bonus := old.rep_bonus; new.max_secondary := old.max_secondary; end if;
  end if;
  return new;
end $$;

-- ================= גרסה 16: מונה מחוברים, דברי תורה עם תגובות, יומן פעילות, מכונות אוטומטיות =================
-- כמה מחוברים עכשיו וכמה נרשמו — רק מספרים, בלי פרטים
create or replace function public.site_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('online', (select count(*) from public.profiles where last_seen > now() - interval '5 minutes'),
                            'users', (select count(*) from public.profiles));
$$;
grant execute on function public.site_stats() to anon, authenticated;

-- תגובות על דבר תורה: 👍 אהבתי / 👎 פחות
create table if not exists public.torah_reactions (
  dt_id uuid not null references public.divrei_torah(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (dt_id, user_id)
);
alter table public.torah_reactions enable row level security;
drop policy if exists "tr self" on public.torah_reactions;
create policy "tr self" on public.torah_reactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create or replace function public.torah_list(p_limit int default 30) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) from (
    select jsonb_build_object('id', d.id, 'parasha', d.parasha, 'title', d.title, 'body', d.body, 'source_name', d.source_name, 'author_name', d.author_name, 'created_at', d.created_at,
      'up', (select count(*) from public.torah_reactions r where r.dt_id = d.id and r.value = 1),
      'down', (select count(*) from public.torah_reactions r where r.dt_id = d.id and r.value = -1),
      'mine', (select r.value from public.torah_reactions r where r.dt_id = d.id and r.user_id = auth.uid())) as x
    from public.divrei_torah d where d.status = 'approved' and auth.uid() is not null
    order by d.created_at desc limit least(greatest(coalesce(p_limit, 30), 1), 100)) t;
$$;
grant execute on function public.torah_list(int) to authenticated;

-- יומן פעילות: המנהל רואה מה כל אחד עושה באתר (פעולות עיקריות בלבד)
create table if not exists public.activity_log (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null default '',
  action text not null check (char_length(action) between 1 and 40),
  detail text not null default '' check (char_length(detail) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists activity_log_time on public.activity_log (created_at desc);
create index if not exists activity_log_user on public.activity_log (user_id, created_at desc);
alter table public.activity_log enable row level security;
drop policy if exists "activity admin read" on public.activity_log;
create policy "activity admin read" on public.activity_log for select using (public.is_admin());
revoke insert, update, delete on public.activity_log from anon, authenticated;
create or replace function public.log_activity(p_action text, p_detail text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  -- לא יותר מ-120 רישומים לדקה למשתמש (שלא יציפו את היומן)
  if (select count(*) from public.activity_log where user_id = auth.uid() and created_at > now() - interval '1 minute') >= 120 then return; end if;
  insert into public.activity_log(user_id, name, action, detail)
  values (auth.uid(), coalesce((select name from public.profiles where id = auth.uid()), ''), left(coalesce(p_action, ''), 40), left(coalesce(p_detail, ''), 300));
end $$;
revoke all on function public.log_activity(text, text) from public, anon;
grant execute on function public.log_activity(text, text) to authenticated;
delete from public.activity_log where created_at < now() - interval '180 days';
delete from public.auth_events where created_at < now() - interval '365 days';

-- מכונות אוטומטיות לעסקים: פחיות, חטיפים, קפה ועוד — תאים, מלאי, מילוי ומכירות
create table if not exists public.biz_machines (
  id uuid primary key default gen_random_uuid(),
  chain text not null check (char_length(chain) between 1 and 40),
  name text not null check (char_length(name) between 1 and 60),
  kind text not null default 'snacks' check (kind in ('cans','snacks','coffee','water','ice','toys','other')),
  location text not null default '' check (char_length(location) <= 120),
  slots jsonb not null default '[]'::jsonb,
  cash numeric(12,2) not null default 0,
  notes text not null default '' check (char_length(notes) <= 500),
  last_refill timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists biz_machines_chain on public.biz_machines (chain);
alter table public.biz_machines enable row level security;
drop policy if exists "machines manage" on public.biz_machines;
create policy "machines manage" on public.biz_machines for all using (public.manages(chain) or public.is_admin()) with check (public.manages(chain) or public.is_admin());
create table if not exists public.biz_machine_log (
  id bigserial primary key,
  machine_id uuid not null references public.biz_machines(id) on delete cascade,
  chain text not null,
  kind text not null check (kind in ('refill','sale','cash','fix')),
  detail jsonb not null default '{}'::jsonb,
  by_name text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists biz_machine_log_m on public.biz_machine_log (machine_id, created_at desc);
alter table public.biz_machine_log enable row level security;
drop policy if exists "machine log manage" on public.biz_machine_log;
create policy "machine log manage" on public.biz_machine_log for all using (public.manages(chain) or public.is_admin()) with check (public.manages(chain) or public.is_admin());

-- ================= גרסה 16.1: הודעה מהמנהל לכל המשתמשים (או רק ללקוחות / רק לבעלי עסקים) =================
-- ההודעה מגיעה לכל אחד לצ'אט "צוות רשימת קניות" + התראה לטלפון (לפי ההגדרות של כל משתמש)
create or replace function public.admin_broadcast(p_body text, p_target text default 'all') returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; r record; body text := left(trim(coalesce(p_body, '')), 4000);
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if body = '' then return 0; end if;
  for r in select p.id from public.profiles p
           where p.id <> auth.uid()
             and (p_target = 'all' or (p_target = 'business' and p.account_type = 'business') or (p_target = 'customers' and p.account_type <> 'business'))
  loop
    insert into public.support_messages(user_id, body, topic) values (r.id, body, 'broadcast');
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.admin_broadcast(text, text) from public, anon;
grant execute on function public.admin_broadcast(text, text) to authenticated;

-- ================= גרסה 16.3: בעלי מכונות אוטומטיות — סוג עסק, וחיבור למסופון של המכונה (זמן אמת) =================
alter table public.biz_machines add column if not exists external_id text not null default '' check (char_length(external_id) <= 60);
alter table public.biz_machines add column if not exists last_seen timestamptz;
alter table public.biz_machines add column if not exists status text not null default '' check (char_length(status) <= 20);
alter table public.biz_machines add column if not exists status_msg text not null default '' check (char_length(status_msg) <= 200);
create unique index if not exists biz_machines_ext on public.biz_machines (chain, external_id) where external_id <> '';
-- התראה לבעל העסק כשמוצר במכונה עומד להיגמר או כשהמסופון מדווח על תקלה
create or replace function public.push_on_machine() returns trigger
language plpgsql security definer set search_path = public as $$
declare s jsonb; o jsonb; i int;
begin
  if new.status = 'error' and old.status is distinct from 'error' then
    perform public.push_to_managers(new.chain, 'store', '🎰 תקלה במכונה: ' || new.name, coalesce(nullif(new.status_msg, ''), 'המסופון דיווח על תקלה'), 'machine:' || new.id);
  end if;
  for i in 0 .. coalesce(jsonb_array_length(new.slots), 0) - 1 loop
    s := new.slots->i; o := old.slots->i;
    if coalesce(s->>'product', '') <> '' and coalesce((s->>'cap')::numeric, 0) > 0
       and coalesce((s->>'qty')::numeric, 0) <= greatest(1, round(coalesce((s->>'cap')::numeric, 0) * 0.2))
       and coalesce((o->>'qty')::numeric, 999) > greatest(1, round(coalesce((s->>'cap')::numeric, 0) * 0.2)) then
      perform public.push_to_managers(new.chain, 'store', '🎰 ' || (s->>'product') || ' עומד להיגמר', new.name || ' · תא ' || coalesce(s->>'code', '') || ' · נשארו ' || coalesce(s->>'qty', '0'), 'machinelow:' || new.id);
    end if;
  end loop;
  return new;
exception when others then return new;
end $$;
drop trigger if exists push_on_machine on public.biz_machines;
create trigger push_on_machine after update on public.biz_machines for each row execute function public.push_on_machine();
do $$ begin
  alter publication supabase_realtime add table public.biz_machines;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- =====================================================================
-- גרסה 16.6: אישור / דחייה ישר מהתוסף לכרום (הלוגיקה בשרת — מתעדכנת בלי להחליף תוסף)
-- =====================================================================
create or replace function public.staff_decide(p_kind text, p_ref text, p_ok boolean)
returns text language plpgsql security definer set search_path = public as $$
declare adm boolean := public.is_admin(); n int := 0;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_kind in ('feedback','chat','message','abuse','error') and not adm then raise exception 'forbidden' using errcode = '42501'; end if;
  case p_kind
    when 'recipe' then update public.recipes set status = case when p_ok then 'approved' else 'rejected' end where id::text = p_ref;
    when 'bot'    then update public.bot_knowledge set status = case when p_ok then 'approved' else 'rejected' end where id::text = p_ref;
    when 'review' then update public.site_reviews set status = case when p_ok then 'approved' else 'rejected' end where id::text = p_ref;
    when 'chain'  then if p_ok then update public.chains set status = 'approved' where id::text = p_ref; else delete from public.chains where id::text = p_ref and status = 'pending'; end if;
    when 'branch' then if p_ok then update public.branches set status = 'approved' where id::text = p_ref; else delete from public.branches where id::text = p_ref and status = 'pending'; end if;
    when 'price'  then if p_ok then update public.prices set status = 'approved' where id::text = p_ref; else delete from public.prices where id::text = p_ref; end if;
    when 'post'   then if p_ok then update public.store_posts set status = 'approved' where id::text = p_ref; else delete from public.store_posts where id::text = p_ref; end if;
    when 'torah'  then if p_ok then update public.divrei_torah set status = 'approved' where id::text = p_ref; else delete from public.divrei_torah where id::text = p_ref; end if;
    -- מחיר שדווח כלא נכון: ✔ = המחיר נכון (מנקים את הדיווחים) · ✖ = המחיר באמת לא נכון (מוחקים אותו)
    when 'flag'   then if p_ok then delete from public.price_flags where price_id::text = p_ref; update public.prices set wrong = 0 where id::text = p_ref;
                       else delete from public.prices where id::text = p_ref; end if;
    when 'feedback' then if p_ok then update public.feedback set is_read = true where id::text = p_ref; else delete from public.feedback where id::text = p_ref; end if;
    when 'chat'    then update public.support_messages set read_by_staff = true where id::text = p_ref;
    when 'message' then update public.store_messages set is_read = true where id::text = p_ref;
    when 'abuse'   then update public.abuse_reports set handled = true where id::text = p_ref;
    when 'error'   then delete from public.client_errors where id::text = p_ref;
    else raise exception 'אי אפשר לטפל בזה מהתוסף — פותחים את הבק אופיס' using errcode = '22023';
  end case;
  get diagnostics n = row_count;
  return case when n > 0 then 'ok' else 'gone' end;
end $$;
revoke all on function public.staff_decide(text, text, boolean) from public, anon;
grant execute on function public.staff_decide(text, text, boolean) to authenticated;

-- כל מה שממתין עכשיו (עד 30 יום אחורה), לרשימת "לאישור" בתוסף
create or replace function public.staff_pending_items()
returns table(kind text, ref text, title text, detail text, who text, created_at timestamptz, pending boolean)
language sql stable security definer set search_path = public as $$
  select * from public.staff_events(now() - interval '30 days') e where e.pending order by e.created_at desc limit 150;
$$;
revoke all on function public.staff_pending_items() from public, anon;
grant execute on function public.staff_pending_items() to authenticated;

-- =====================================================================
-- גרסה 18: מחיר רגיל למבצעים, חנויות ביגוד (נשים / גברים / חתונה) והמלצות לקוחות
-- =====================================================================
-- מחיר רגיל (לפני המבצע) — כדי לחשב בדיוק כמה חוסכים
alter table public.prices add column if not exists regular_price numeric(10,2)
  check (regular_price is null or (regular_price > 0 and regular_price < 100000));

-- חנויות ביגוד: מופרדות משאר החנויות, לפי נשים / גברים ותתי־קטגוריות
create table if not exists public.clothing_shops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  gender text not null default 'women' check (gender in ('women','men','both')),
  subs text[] not null default '{}',
  wedding boolean not null default false,
  city text not null default '' check (char_length(city) <= 40),
  address text not null default '' check (char_length(address) <= 120),
  phone text not null default '' check (char_length(phone) <= 30),
  website text not null default '' check (char_length(website) <= 200),
  about text not null default '' check (char_length(about) <= 600),
  status text not null default 'pending' check (status in ('pending','approved')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.clothing_shops enable row level security;
drop policy if exists "cshops read" on public.clothing_shops;
drop policy if exists "cshops add" on public.clothing_shops;
drop policy if exists "cshops staff" on public.clothing_shops;
create policy "cshops read" on public.clothing_shops for select using (status = 'approved' or created_by = auth.uid() or public.is_staff());
create policy "cshops add" on public.clothing_shops for insert with check (auth.uid() is not null and created_by = auth.uid() and (status = 'pending' or public.is_staff()));
create policy "cshops staff" on public.clothing_shops for update using (public.is_staff()) with check (public.is_staff());
drop policy if exists "cshops del" on public.clothing_shops;
create policy "cshops del" on public.clothing_shops for delete using (public.is_staff());

-- המלצות לקוחות: איפה לקנות (store) או מה לקנות (item — לרשימת החתונה)
create table if not exists public.store_recs (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('women','men','wedding')),
  sub text not null default '' check (char_length(sub) <= 30),
  kind text not null default 'store' check (kind in ('store','item')),
  shop text not null default '' check (char_length(shop) <= 60),
  city text not null default '' check (char_length(city) <= 40),
  body text not null check (char_length(body) between 2 and 1000),
  stars int check (stars between 1 and 5),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  by_name text not null default '' check (char_length(by_name) <= 40),
  status text not null default 'pending' check (status in ('pending','approved')),
  created_at timestamptz not null default now()
);
create index if not exists store_recs_sec on public.store_recs (section, sub, status);
alter table public.store_recs enable row level security;
drop policy if exists "recs read" on public.store_recs;
drop policy if exists "recs add" on public.store_recs;
drop policy if exists "recs staff" on public.store_recs;
drop policy if exists "recs del" on public.store_recs;
create policy "recs read" on public.store_recs for select using (status = 'approved' or user_id = auth.uid() or public.is_staff());
create policy "recs add" on public.store_recs for insert with check (auth.uid() is not null and user_id = auth.uid() and (status = 'pending' or public.is_staff()));
create policy "recs staff" on public.store_recs for update using (public.is_staff()) with check (public.is_staff());
create policy "recs del" on public.store_recs for delete using (user_id = auth.uid() or public.is_staff());

-- =====================================================================
-- גרסה 18.1: בקשות לקטגוריה, "נכון / לא נכון" על חנויות והמלצות, "האתר ממליץ", יומן תקלות
-- =====================================================================
alter table public.clothing_shops add column if not exists featured boolean not null default false;
alter table public.store_recs add column if not exists official boolean not null default false;
-- סוגים: store = איפה לקנות · item = מוצר לרשימת החתונה · category = בקשה לקטגוריה חדשה
alter table public.store_recs drop constraint if exists store_recs_kind_check;
alter table public.store_recs add constraint store_recs_kind_check check (kind in ('store','item','category'));
-- רק הצוות מסמן "האתר ממליץ"
drop policy if exists "recs add" on public.store_recs;
create policy "recs add" on public.store_recs for insert with check (auth.uid() is not null and user_id = auth.uid() and ((status = 'pending' and not official) or public.is_staff()));
drop policy if exists "cshops add" on public.clothing_shops;
create policy "cshops add" on public.clothing_shops for insert with check (auth.uid() is not null and created_by = auth.uid() and ((status = 'pending' and not featured) or public.is_staff()));

-- ✅ נכון / ❌ לא נכון על חנות או המלצה (עם סיבה) — המנהל רואה ומטפל
create table if not exists public.cloth_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  by_name text not null default '' check (char_length(by_name) <= 40),
  target text not null check (target in ('shop','rec')),
  target_id uuid not null,
  vote smallint not null check (vote in (1,-1)),
  reason text not null default '' check (char_length(reason) <= 300),
  handled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, target, target_id)
);
alter table public.cloth_votes enable row level security;
drop policy if exists "cvotes read" on public.cloth_votes;
drop policy if exists "cvotes add" on public.cloth_votes;
drop policy if exists "cvotes upd" on public.cloth_votes;
drop policy if exists "cvotes del" on public.cloth_votes;
create policy "cvotes read" on public.cloth_votes for select using (auth.uid() is not null);
create policy "cvotes add" on public.cloth_votes for insert with check (user_id = auth.uid() and not handled);
create policy "cvotes upd" on public.cloth_votes for update using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());
create policy "cvotes del" on public.cloth_votes for delete using (user_id = auth.uid() or public.is_staff());

-- 🐞 יומן תקלות: כשמשהו נשבר אצל משתמש — נרשם כאן, והמנהל רואה בבק אופיס
create table if not exists public.client_errors (
  id bigserial primary key,
  user_id uuid,
  msg text not null default '' check (char_length(msg) <= 500),
  src text not null default '' check (char_length(src) <= 300),
  ua text not null default '' check (char_length(ua) <= 200),
  ver text not null default '' check (char_length(ver) <= 12),
  created_at timestamptz not null default now()
);
create index if not exists client_errors_time on public.client_errors (created_at desc);
alter table public.client_errors enable row level security;
drop policy if exists "errors admin" on public.client_errors;
create policy "errors admin" on public.client_errors for select using (public.is_admin());
drop policy if exists "errors admin del" on public.client_errors;
create policy "errors admin del" on public.client_errors for delete using (public.is_admin());
revoke insert, update on public.client_errors from anon, authenticated;
-- נובמבר 2026: גם גרסת האפליקציה, דגם הטלפון ומזהה המכשיר האנונימי — כדי לראות אם תקלה קורית רק בגרסה / בדגם מסוים
alter table public.client_errors add column if not exists app_ver text not null default '' check (char_length(app_ver) <= 12);
alter table public.client_errors add column if not exists device text not null default '' check (char_length(device) <= 60);
alter table public.client_errors add column if not exists dev text not null default '' check (char_length(dev) <= 36);
-- (הפונקציה log_client_error — למטה, בחלק "v19: security fixes")
delete from public.client_errors where created_at < now() - interval '60 days';

-- =====================================================================
-- ===== v19: security fixes (תיקוני אבטחה) =====
-- הכל כאן ניתן להרצה חוזרת. הגדרות מאוחרות גוברות על מוקדמות.
-- אילוצים חדשים נוספים כ-NOT VALID (שורות ישנות לא נבדקות בהוספה), ולפני כן מנקים נתונים לא תקינים
-- כדי שעדכון עתידי של שורה ישנה לא ייכשל.
-- =====================================================================

-- ---------- 1+2. תמונות וקישורים: תבנית מעוגנת מלאה (מונע הזרקת HTML דרך data:/https:) ----------
-- תמונה: data:image/(jpeg|png|webp);base64,<base64 בלבד> ; קישור: https?://<בלי רווחים / מרכאות / <>>
update public.recipes set image = '' where image <> '' and image !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$';
update public.my_products set image = '' where image <> '' and image !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$';
update public.store_inventory set image = '' where image <> '' and image !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$';
update public.products set image = '' where image <> '' and image !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$';
update public.chains set logo = '' where logo <> '' and logo !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$';
update public.store_posts set image = '' where image <> ''
  and image !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' and image !~ '^https://[^\s"''<>]+$';
update public.ads set image = '' where image <> ''
  and image !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' and image !~ '^https://[^\s"''<>]+$';
-- קישורים: אם חסר רק https:// — משלימים; אחרת מנקים
update public.chains set website = case
    when btrim(website) ~ '^https?://[^\s"''<>]+$' then btrim(website)
    when btrim(website) ~ '^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(/[^\s"''<>]*)?$' then left('https://' || btrim(website), 300)
    else null end
  where website is not null and website <> '' and website !~ '^https?://[^\s"''<>]+$';
update public.chains set order_url = case
    when btrim(order_url) ~ '^https?://[^\s"''<>]+$' then btrim(order_url)
    when btrim(order_url) ~ '^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(/[^\s"''<>]*)?$' and char_length(btrim(order_url)) <= 290 then 'https://' || btrim(order_url)
    else '' end
  where order_url <> '' and order_url !~ '^https?://[^\s"''<>]+$';
update public.clothing_shops set website = case
    when btrim(website) ~ '^https?://[^\s"''<>]+$' then btrim(website)
    when btrim(website) ~ '^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(/[^\s"''<>]*)?$' and char_length(btrim(website)) <= 190 then 'https://' || btrim(website)
    else '' end
  where website <> '' and website !~ '^https?://[^\s"''<>]+$';
update public.ads set link_url = '' where link_url <> '' and link_url !~* '^https?://[^\s"''<>]+$';

alter table public.recipes drop constraint if exists recipes_image_check;
alter table public.recipes add constraint recipes_image_check
  check (char_length(image) <= 400000 and (image = '' or image ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')) not valid;
alter table public.my_products drop constraint if exists my_products_image_check;
alter table public.my_products add constraint my_products_image_check
  check (char_length(image) <= 200000 and (image = '' or image ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')) not valid;
alter table public.store_inventory drop constraint if exists store_inventory_image_check;
alter table public.store_inventory add constraint store_inventory_image_check
  check (char_length(image) <= 200000 and (image = '' or image ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')) not valid;
alter table public.products drop constraint if exists products_image_check;
alter table public.products add constraint products_image_check
  check (char_length(image) <= 200000 and (image = '' or image ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')) not valid;
alter table public.chains drop constraint if exists chains_logo_check;
alter table public.chains add constraint chains_logo_check
  check (char_length(logo) <= 200000 and (logo = '' or logo ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')) not valid;
alter table public.store_posts drop constraint if exists store_posts_image_check;
alter table public.store_posts add constraint store_posts_image_check
  check (char_length(image) <= 1500000 and (image = '' or image ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' or image ~ '^https://[^\s"''<>]+$')) not valid;
alter table public.ads drop constraint if exists ads_image_check;
alter table public.ads add constraint ads_image_check
  check (char_length(image) <= 1500000 and (image = '' or image ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' or image ~ '^https://[^\s"''<>]+$')) not valid;
alter table public.ads drop constraint if exists ads_link_url_check;
alter table public.ads add constraint ads_link_url_check
  check (link_url = '' or (char_length(link_url) <= 1000 and link_url ~* '^https?://[^\s"''<>]+$')) not valid;
-- פרסומת קבועה בצד (side), ופרסומת בלי תמונה: אימוג'י על רקע צבעוני (theme)
alter table public.ads add column if not exists emoji text not null default '';
alter table public.ads add column if not exists theme text not null default '';
alter table public.ads drop constraint if exists ads_placement_check;
alter table public.ads add constraint ads_placement_check check (placement in ('popup','banner','side')) not valid;
alter table public.ads drop constraint if exists ads_emoji_check;
alter table public.ads add constraint ads_emoji_check check (char_length(emoji) <= 8 and emoji !~ '[<>"''&\s]') not valid;
alter table public.ads drop constraint if exists ads_theme_check;
alter table public.ads add constraint ads_theme_check check (theme in ('','green','blue','gold','purple','red','teal')) not valid;
alter table public.chains drop constraint if exists chains_order_url_check;
alter table public.chains add constraint chains_order_url_check
  check (char_length(order_url) <= 300 and (order_url = '' or order_url ~ '^https?://[^\s"''<>]+$')) not valid;
alter table public.chains drop constraint if exists chains_website_check;
alter table public.chains add constraint chains_website_check
  check (website is null or website = '' or (char_length(website) <= 300 and website ~ '^https?://[^\s"''<>]+$')) not valid;
alter table public.clothing_shops drop constraint if exists clothing_shops_website_check;
alter table public.clothing_shops add constraint clothing_shops_website_check
  check (char_length(website) <= 200 and (website = '' or website ~ '^https?://[^\s"''<>]+$')) not valid;

-- הגדרות העסק: לוגו וקישורים נבדקים בתבנית המלאה (מחזיר bad_logo / bad_url)
create or replace function public.store_settings(p_chain text, p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare u text := btrim(coalesce(p->>'order_url', '')); w text := btrim(coalesce(p->>'website', ''));
begin
  if not public.manages(p_chain) then return 'forbidden'; end if;
  if u <> '' and (u !~ '^https?://[^\s"''<>]+$' or char_length(u) > 300) then return 'bad_url'; end if;
  if p ? 'website' and w <> '' and (w !~ '^https?://[^\s"''<>]+$' or char_length(w) > 300) then return 'bad_url'; end if;
  if p ? 'logo' and coalesce(p->>'logo', '') <> '' and (p->>'logo' !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' or char_length(p->>'logo') > 200000) then return 'bad_logo'; end if;
  update public.chains set
    category = case when p ? 'category' and (p->>'category') in ('supermarket','grocery','produce','butcher','bakery','pharm','home','online','nuts','pizza','shawarma','falafel','sweets','supplier','factory','catering','restaurant','vending','other') then p->>'category' else category end,
    about = case when p ? 'about' then left(p->>'about', 2000) else about end,
    audience = case when p ? 'audience' then left(p->>'audience', 300) else audience end,
    address = case when p ? 'address' then left(p->>'address', 200) else address end,
    hours = case when p ? 'hours' then left(p->>'hours', 600) else hours end,
    phone = case when p ? 'phone' then left(p->>'phone', 30) else phone end,
    whatsapp = case when p ? 'whatsapp' then left(p->>'whatsapp', 30) else whatsapp end,
    website = case when p ? 'website' then nullif(w, '') else website end,
    delivery_areas = case when p ? 'delivery_areas' then left(p->>'delivery_areas', 300) else delivery_areas end,
    min_order = case when p ? 'min_order' then nullif(p->>'min_order', '')::numeric else min_order end,
    order_phone = case when p ? 'order_phone' then left(p->>'order_phone', 30) else order_phone end,
    order_url = case when p ? 'order_url' then u else order_url end,
    logo = case when p ? 'logo' then coalesce(p->>'logo', '') else logo end,
    inventory_public = case when p ? 'inventory_public' then (p->>'inventory_public')::boolean else inventory_public end,
    inventory_show_qty = case when p ? 'inventory_show_qty' then (p->>'inventory_show_qty')::boolean else inventory_show_qty end,
    show_prices = case when p ? 'show_prices' then (p->>'show_prices')::boolean else show_prices end,
    publish_prices = case when p ? 'publish_prices' then (p->>'publish_prices')::boolean else publish_prices end,
    ordering_enabled = case when p ? 'ordering_enabled' then (p->>'ordering_enabled')::boolean else ordering_enabled end
  where name = p_chain;
  return 'ok';
exception when others then return 'error: ' || sqlerrm;
end $$;
revoke all on function public.store_settings(text, jsonb) from public, anon;
grant execute on function public.store_settings(text, jsonb) to authenticated;

create or replace function public.store_profile_update(p_chain text, p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare w text := btrim(coalesce(p->>'website', ''));
begin
  if auth.uid() is null then return 'forbidden'; end if;
  if not (public.is_staff() or exists (select 1 from public.store_managers m where m.user_id = auth.uid() and m.chain = p_chain)) then return 'forbidden'; end if;
  if p ? 'website' and w <> '' and (w !~ '^https?://[^\s"''<>]+$' or char_length(w) > 200) then return 'bad_url'; end if;
  update public.chains set
    about    = case when p ? 'about'    then left(coalesce(p->>'about', ''), 2000) else about end,
    phone    = case when p ? 'phone'    then left(coalesce(p->>'phone', ''), 30) else phone end,
    whatsapp = case when p ? 'whatsapp' then left(coalesce(p->>'whatsapp', ''), 30) else whatsapp end,
    address  = case when p ? 'address'  then left(coalesce(p->>'address', ''), 200) else address end,
    hours    = case when p ? 'hours'    then left(coalesce(p->>'hours', ''), 600) else hours end,
    website  = case when p ? 'website'  then nullif(w, '') else website end
  where name = p_chain;
  if not found then return 'not_found'; end if;
  return 'ok';
end $$;
revoke all on function public.store_profile_update(text, jsonb) from public, anon;
grant execute on function public.store_profile_update(text, jsonb) to authenticated;

create or replace function public.store_inventory_settings(p_chain text, p_public boolean, p_show_qty boolean, p_phone text, p_url text) returns text
language plpgsql security definer set search_path = public as $$
declare u text := btrim(coalesce(p_url, ''));
begin
  if not public.manages(p_chain) then return 'forbidden'; end if;
  if u <> '' and (u !~ '^https?://[^\s"''<>]+$' or char_length(u) > 300) then return 'bad_url'; end if;
  update public.chains set inventory_public = coalesce(p_public, false), inventory_show_qty = coalesce(p_show_qty, false),
    order_phone = left(coalesce(p_phone, ''), 30), order_url = u where name = p_chain;
  return 'ok';
end $$;
revoke all on function public.store_inventory_settings(text, boolean, boolean, text, text) from public, anon;
grant execute on function public.store_inventory_settings(text, boolean, boolean, text, text) to authenticated;

-- ---------- 3. חדרים: חסימה אחרי הסרה/עזיבה, הגבלת ניסיונות, קודים ארוכים, החלפת קוד ----------
create table if not exists public.room_bans (
  room_code text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_code, user_id)
);
alter table public.room_bans enable row level security;
revoke all on public.room_bans from anon, authenticated;
create table if not exists public.room_join_fails (
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists room_join_fails_user on public.room_join_fails (user_id, at desc);
alter table public.room_join_fails enable row level security;
revoke all on public.room_join_fails from anon, authenticated;

-- קוד חדש: YAM + 16 תווים אקראיים (קודים ישנים ממשיכים לעבוד)
create or replace function public.ensure_my_room() returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select code into c from public.rooms where owner = auth.uid() order by updated_at limit 1;
  if c is null then
    loop
      c := 'YAM' || upper(encode(extensions.gen_random_bytes(8), 'hex'));
      exit when not exists (select 1 from public.rooms where code = c);
    end loop;
    insert into public.rooms(code, owner) values (c, auth.uid());
  end if;
  insert into public.room_members(room_code, user_id) values (c, auth.uid()) on conflict do nothing;
  return c;
end $$;

-- הצטרפות עם קוד: חסום מי שהוסר / עזב כמשתמש משני; לכל היותר 20 ניסיונות כושלים בשעה
create or replace function public.join_room(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare c text := upper(trim(coalesce(p_code, ''))); uid uuid := auth.uid();
begin
  if uid is null then return false; end if;
  if (select count(*) from public.room_join_fails where user_id = uid and at > now() - interval '1 hour') >= 20 then return false; end if;
  if random() < 0.01 then delete from public.room_join_fails where at < now() - interval '1 day'; end if;
  if exists (select 1 from public.room_members where room_code = c and user_id = uid) then return true; end if;
  if not exists (select 1 from public.rooms where code = c)
     or exists (select 1 from public.room_bans where room_code = c and user_id = uid) then
    insert into public.room_join_fails(user_id) values (uid);
    return false;
  end if;
  insert into public.room_members(room_code, user_id) values (c, uid) on conflict do nothing;
  return true;
end $$;

-- עזיבה: משתמש משני שעוזב לא יכול לחזור עם הקוד (רק בהזמנה חדשה)
create or replace function public.leave_room(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare c text := upper(trim(coalesce(p_code, ''))); r text;
begin
  if auth.uid() is null then return; end if;
  if exists (select 1 from public.rooms where code = c and owner = auth.uid()) then return; end if;
  delete from public.room_members where room_code = c and user_id = auth.uid() returning role into r;
  if r = 'secondary' then
    insert into public.room_bans(room_code, user_id) values (c, auth.uid()) on conflict do nothing;
  end if;
end $$;

create or replace function public.room_member_remove(p_user uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with del as (
    delete from public.room_members m
    where m.user_id = p_user and m.room_code in (select code from public.rooms where owner = auth.uid()) and m.user_id <> auth.uid()
    returning m.room_code
  ), ins as (
    insert into public.room_bans(room_code, user_id) select room_code, p_user from del on conflict do nothing returning 1
  ) select count(*) into n from del;
  return n > 0;
end $$;

create or replace function public.room_invite_accept(p_token text, p_otp text, p_name text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare i public.room_invites; owner uuid;
begin
  if auth.uid() is null then return jsonb_build_object('error', 'login'); end if;
  select * into i from public.room_invites where token = p_token for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if i.used_at is not null then return jsonb_build_object('error', 'used'); end if;
  if i.expires_at < now() or i.attempts >= 5 then return jsonb_build_object('error', 'expired'); end if;
  if encode(digest(trim(coalesce(p_otp, '')) || ':' || i.token, 'sha256'), 'hex') <> i.otp_hash then
    update public.room_invites set attempts = attempts + 1 where token = p_token;
    return jsonb_build_object('error', 'bad_otp', 'left', 4 - i.attempts);
  end if;
  select r.owner into owner from public.rooms r where r.code = i.room_code;
  if owner = auth.uid() then return jsonb_build_object('error', 'self'); end if;
  delete from public.room_bans where room_code = i.room_code and user_id = auth.uid();
  insert into public.room_members(room_code, user_id, role, name, perms, invited_by)
  values (i.room_code, auth.uid(), 'secondary', left(coalesce(nullif(trim(p_name), ''), 'משתמש משני'), 40), i.perms, i.created_by)
  on conflict (room_code, user_id) do update set role = 'secondary', name = excluded.name, perms = excluded.perms;
  update public.room_invites set used_at = now(), used_by = auth.uid() where token = p_token;
  perform public.push_enqueue(owner, 'info', '👥 ' || left(coalesce(nullif(trim(p_name), ''), 'משתמש משני'), 40) || ' הצטרף/ה', 'משתמש משני חדש התחבר לחשבון שלך', '/', 'member:' || i.room_code);
  return jsonb_build_object('ok', true, 'code', i.room_code);
end $$;

-- החלפת קוד החדר (רק הבעלים). כל החברים, ההזמנות והחסימות עוברים לקוד החדש.
create or replace function public.room_rotate_code(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare r public.rooms; c text;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into r from public.rooms where code = upper(trim(coalesce(p_code, ''))) and owner = auth.uid() for update;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  loop
    c := 'YAM' || upper(encode(extensions.gen_random_bytes(8), 'hex'));
    exit when not exists (select 1 from public.rooms where code = c);
  end loop;
  insert into public.rooms(code, owner, data, updated_by, updated_at) values (c, r.owner, r.data, r.updated_by, r.updated_at);
  update public.room_members set room_code = c where room_code = r.code;
  update public.room_invites set room_code = c where room_code = r.code;
  update public.room_bans set room_code = c where room_code = r.code;
  delete from public.rooms where code = r.code;
  return c;
end $$;

-- החדרים שלי (גם אחרי שהבעלים החליף קוד)
create or replace function public.my_rooms() returns table(code text, owner uuid, role text)
language sql stable security definer set search_path = public as $$
  select r.code, r.owner, (case when r.owner = auth.uid() then 'owner' else m.role end)::text
  from public.room_members m join public.rooms r on r.code = m.room_code
  where m.user_id = auth.uid()
  order by (r.owner = auth.uid()) desc, m.joined_at;
$$;
revoke all on function public.room_rotate_code(text) from public, anon;
revoke all on function public.my_rooms() from public, anon;
revoke all on function public.join_room(text) from public, anon;
revoke all on function public.leave_room(text) from public, anon;
revoke all on function public.ensure_my_room() from public, anon;
revoke all on function public.room_member_remove(uuid) from public, anon;
revoke all on function public.room_invite_accept(text, text, text) from public, anon;
grant execute on function public.room_rotate_code(text), public.my_rooms(), public.join_room(text), public.leave_room(text),
  public.ensure_my_room(), public.room_member_remove(uuid), public.room_invite_accept(text, text, text) to authenticated;

-- ---------- 4+5. room_put: הרשאות לכל פעולה + גודל מקסימלי לנתוני החדר ----------
-- (גודל דחוס בטבלה; רשימות+היסטוריה רגילות רחוקות מאוד מזה)
do $$ begin
  alter table public.rooms add constraint rooms_data_size_chk check (pg_column_size(data) < 2000000) not valid;
exception when duplicate_object then null; end $$;

-- ממזג את הרשימות של משתמש משני לפי ההרשאות שלו: מה שאסור — מוחזר למצב הקודם.
-- מחזיר {"lists": [...], "viol": true/false}
create or replace function public.room_merge_lists(p_old jsonb, p_new jsonb, p_add boolean, p_check boolean, p_del boolean, p_fin boolean, p_finished text[])
returns jsonb language plpgsql immutable set search_path = public as $$
declare res jsonb := '[]'::jsonb; viol boolean := false; nl jsonb; ol jsonb; ni jsonb; oi jsonb; items jsonb; newids text[]; olds jsonb;
begin
  olds := case when jsonb_typeof(p_old) = 'array' then p_old else '[]'::jsonb end;
  if jsonb_typeof(p_new) is distinct from 'array' then
    return jsonb_build_object('lists', olds, 'viol', true);
  end if;
  for nl in select x from jsonb_array_elements(p_new) x loop
    if jsonb_typeof(nl) is distinct from 'object' then viol := true; continue; end if;
    select x into ol from jsonb_array_elements(olds) x where x->>'id' = nl->>'id' limit 1;
    if ol is null then
      if not p_add then viol := true; continue; end if;   -- רשימה חדשה בלי הרשאת "להוסיף"
      res := res || jsonb_build_array(nl); continue;
    end if;
    items := '[]'::jsonb;
    for ni in select x from jsonb_array_elements(case when jsonb_typeof(nl->'items') = 'array' then nl->'items' else '[]'::jsonb end) x loop
      oi := null;
      select x into oi from jsonb_array_elements(case when jsonb_typeof(ol->'items') = 'array' then ol->'items' else '[]'::jsonb end) x
        where x->>'id' = ni->>'id' limit 1;
      if oi is null then
        if not p_add then viol := true; continue; end if;  -- מוצר חדש בלי הרשאת "להוסיף"
      elsif not p_check and coalesce(ni->'done', 'false'::jsonb) is distinct from coalesce(oi->'done', 'false'::jsonb) then
        viol := true;                                       -- סימון "נקנה" בלי הרשאה
        ni := (ni - 'done' - 'doneBy') || jsonb_strip_nulls(jsonb_build_object('done', oi->'done', 'doneBy', oi->'doneBy'));
      end if;
      items := items || jsonb_build_array(ni);
    end loop;
    select coalesce(array_agg(x->>'id'), '{}') into newids from jsonb_array_elements(items) x;
    for oi in select x from jsonb_array_elements(case when jsonb_typeof(ol->'items') = 'array' then ol->'items' else '[]'::jsonb end) x loop
      if not (oi->>'id' = any(newids)) then
        -- מחיקה מותרת רק עם הרשאת "למחוק", או "לסיים קנייה" למוצר שסומן / שעבר להיסטוריה
        if not (p_del or (p_fin and (coalesce((oi->>'done')::boolean, false) or (oi->>'n') = any(coalesce(p_finished, '{}'))))) then
          viol := true; items := items || jsonb_build_array(oi);
        end if;
      end if;
    end loop;
    res := res || jsonb_build_array(nl || jsonb_build_object('items', items));
  end loop;
  -- רשימה שנמחקה כולה — רק עם הרשאת "למחוק"
  for ol in select x from jsonb_array_elements(olds) x loop
    if not exists (select 1 from jsonb_array_elements(p_new) y where y->>'id' = ol->>'id') and not p_del then
      viol := true; res := res || jsonb_build_array(ol);
    end if;
  end loop;
  return jsonb_build_object('lists', res, 'viol', viol);
end $$;
revoke all on function public.room_merge_lists(jsonb, jsonb, boolean, boolean, boolean, boolean, text[]) from public, anon, authenticated;

-- משתמש משני שומר: כל פעולה נבדקת מול ההרשאות (להוסיף / לסמן / למחוק / לסיים קנייה / לעדכן את הבית).
-- מה שאסור לא נשמר (חוזר לערך הקודם) והפונקציה מחזירה false; אם הכל מותר — true.
create or replace function public.room_put(p_code text, p_data jsonb, p_by text) returns boolean
language plpgsql security definer set search_path = public as $$
declare m public.room_members; d jsonb; k text; viol boolean := false; mg jsonb; fin_names text[] := '{}';
  v_lists boolean; v_hist boolean; v_home boolean; a_add boolean; a_check boolean; a_del boolean; a_fin boolean; a_home boolean;
begin
  select * into m from public.room_members where room_code = upper(trim(p_code)) and user_id = auth.uid();
  if not found or m.role <> 'secondary' then return false; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then return false; end if;
  if octet_length(p_data::text) > 6000000 then raise exception 'הרשימה גדולה מדי לשמירה' using errcode = '54000'; end if;
  v_lists := coalesce((m.perms->'view'->>'lists')::boolean, true);
  v_hist  := coalesce((m.perms->'view'->>'history')::boolean, true);
  v_home  := coalesce((m.perms->'view'->>'home')::boolean, true);
  a_add   := coalesce((m.perms->'act'->>'add')::boolean, true);
  a_check := coalesce((m.perms->'act'->>'check')::boolean, true);
  a_del   := coalesce((m.perms->'act'->>'delete')::boolean, false);
  a_fin   := coalesce((m.perms->'act'->>'finish')::boolean, true);
  a_home  := coalesce((m.perms->'act'->>'home_edit')::boolean, true);
  select data into d from public.rooms where code = m.room_code for update;
  d := coalesce(d, '{}'::jsonb);
  -- היסטוריה: רק עם "לסיים קנייה" (וצפייה בהיסטוריה). רושמים אילו מוצרים נכנסו עכשיו להיסטוריה.
  if p_data ? 'history' then
    if v_hist and a_fin and jsonb_typeof(p_data->'history') = 'array' then
      select coalesce(array_agg(it->>'n'), '{}') into fin_names
      from jsonb_array_elements(p_data->'history') h, jsonb_array_elements(case when jsonb_typeof(h->'items') = 'array' then h->'items' else '[]'::jsonb end) it
      where not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(d->'history') = 'array' then d->'history' else '[]'::jsonb end) oh where oh->'ts' = h->'ts');
      d := d || jsonb_build_object('history', p_data->'history');
    elsif (p_data->'history') is distinct from (d->'history') then viol := true;
    end if;
  end if;
  -- רשימות
  if v_lists and (a_add or a_check or a_del or a_fin) then
    if p_data ? 'lists' then
      mg := public.room_merge_lists(d->'lists', p_data->'lists', a_add, a_check, a_del, a_fin, fin_names);
      d := d || jsonb_build_object('lists', mg->'lists');
      if (mg->>'viol')::boolean then viol := true; end if;
    end if;
    foreach k in array array['plans','stats','templates'] loop
      if p_data ? k then d := d || jsonb_build_object(k, p_data->k); end if;
    end loop;
  elsif p_data ? 'lists' and (p_data->'lists') is distinct from (d->'lists') then viol := true;
  end if;
  -- הבית שלי
  if v_home and a_home then
    foreach k in array public.room_section_keys('home') loop
      if p_data ? k then d := d || jsonb_build_object(k, p_data->k); end if;
    end loop;
  end if;
  begin
    update public.rooms set data = d, updated_by = left(coalesce(p_by, ''), 60), updated_at = now() where code = m.room_code;
  exception when check_violation then
    raise exception 'הרשימה גדולה מדי לשמירה' using errcode = '54000';
  end;
  return not viol;
end $$;
revoke all on function public.room_put(text, jsonb, text) from public, anon;
grant execute on function public.room_put(text, jsonb, text) to authenticated;

-- ---------- 6. manages(): רק מנהלי האתר ובעלי/אחראי העסק עצמו (לא צוות פיקוח) ----------
-- צוות פיקוח ממשיך לאשר/לדחות מבצעים, מחירים, מתכונים וכו' דרך is_staff() (המדיניות שלהם לא משתמשת ב-manages).
create or replace function public.manages(p_chain text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from public.store_managers m where m.user_id = auth.uid() and m.chain = p_chain);
$$;
revoke all on function public.manages(text) from public, anon;
grant execute on function public.manages(text) to authenticated;

-- ---------- 7. מקורות מחירים: מי יצר, https בלבד, ומחירים אוטומטיים רק למי שמותר ----------
alter table public.price_sources add column if not exists created_by uuid default auth.uid();
-- by_admin: true = נוצר ע"י מנהל האתר (מחירים מאושרים מיד); false = ע"י בעל עסק (פונקציית הסנכרון בודקת auto_approve);
-- null = שורה ישנה. השורות הישנות: 'prices' יכול היה ליצור רק מנהל → true; השאר → false.
alter table public.price_sources add column if not exists by_admin boolean;
update public.price_sources set by_admin = (target = 'prices') where by_admin is null;
create or replace function public.price_sources_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.url is distinct from old.url then
    new.url := btrim(coalesce(new.url, ''));
    if char_length(new.url) > 500 or new.url !~ '^https://[^\s"''<>]+$' then
      raise exception 'הקישור חייב להתחיל ב-https:// (עד 500 תווים, בלי רווחים)' using errcode = '22023';
    end if;
  end if;
  if tg_op = 'INSERT' then
    if auth.uid() is not null then new.created_by := auth.uid(); new.by_admin := public.is_admin();
    else new.by_admin := coalesce(new.by_admin, true); end if;   -- שרת / לוח הבקרה
  else
    new.created_by := old.created_by;
    if auth.uid() is not null and not public.is_admin() then new.by_admin := old.by_admin; end if;
  end if;
  return new;
end $$;
drop trigger if exists price_sources_guard on public.price_sources;
create trigger price_sources_guard before insert or update on public.price_sources for each row execute function public.price_sources_guard();
drop policy if exists "sources owner" on public.price_sources;
create policy "sources owner" on public.price_sources for all using (public.manages(chain)) with check (
  public.manages(chain) and public.not_banned() and (target = 'inventory' or public.is_admin()
    or (target = 'both' and exists (select 1 from public.store_managers m where m.user_id = auth.uid() and m.chain = price_sources.chain and m.auto_approve))));

-- ---------- 8a. התראות: רק שירותי Push אמיתיים, עד 10 מכשירים למשתמש ----------
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_ua text) returns text
language plpgsql security definer set search_path = public as $$
declare host text := lower(substring(coalesce(p_endpoint, '') from '^https://([^/:?#@]+)(?::443)?(?:[/?#]|$)'));
begin
  if auth.uid() is null then return 'forbidden'; end if;
  if host is null or char_length(p_endpoint) > 1000
     or host !~ '(^|\.)(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|notify\.windows\.com|web\.push\.apple\.com|push\.apple\.com)$'
     or p_endpoint ~ '[\s"''<>]' then return 'bad'; end if;
  delete from public.push_subs where endpoint = p_endpoint;
  insert into public.push_subs(endpoint, user_id, p256dh, auth_key, ua) values (p_endpoint, auth.uid(), left(p_p256dh, 200), left(p_auth, 100), left(coalesce(p_ua, ''), 200));
  delete from public.push_subs where user_id = auth.uid() and endpoint in (
    select endpoint from public.push_subs where user_id = auth.uid() order by created_at desc, endpoint offset 10);
  insert into public.push_prefs(user_id) values (auth.uid()) on conflict do nothing;
  return 'ok';
end $$;
revoke all on function public.push_subscribe(text, text, text, text) from public, anon;
grant execute on function public.push_subscribe(text, text, text, text) to authenticated;

-- ---------- 8b. הגבלת קצב (לכל משתמש, לשעה) ----------
-- tg_argv: [0] עמודת המשתמש, [1] מקסימום לשעה, [2] הודעה (לא חובה). צוות האתר ושרתים — בלי הגבלה.
create or replace function public.rate_limit_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare col text := tg_argv[0]; lim int := tg_argv[1]::int; n int;
begin
  if auth.uid() is null then return new; end if;
  if current_setting('app.bypass_price_guard', true) = 'on' then return new; end if;
  if public.is_staff() then return new; end if;
  execute format('select count(*) from (select 1 from %I.%I where %I = $1 and created_at > now() - interval ''1 hour'' limit %s) t',
                 tg_table_schema, tg_table_name, col, lim) into n using auth.uid();
  if n >= lim then
    raise exception '%', coalesce(nullif(tg_argv[2], ''), 'יותר מדי הודעות — נסו שוב בעוד שעה') using errcode = 'P0001', hint = 'rate_limit';
  end if;
  return new;
end $$;
create index if not exists store_messages_user on public.store_messages (user_id, created_at desc);
create index if not exists business_requests_user on public.business_requests (user_id, created_at desc);
create index if not exists store_posts_by on public.store_posts (created_by, created_at desc);
create index if not exists recipes_author on public.recipes (author_id, created_at desc);
create index if not exists store_recs_user on public.store_recs (user_id, created_at desc);
create index if not exists clothing_shops_by on public.clothing_shops (created_by, created_at desc);
create index if not exists feedback_user on public.feedback (user_id, created_at desc);
create index if not exists prices_by_time on public.prices (by_id, created_at desc);
do $$
declare r record;
begin
  for r in select * from (values
    ('support_messages','user_id','30','יותר מדי הודעות — נסו שוב בעוד שעה'),
    ('store_messages','user_id','30','יותר מדי הודעות — נסו שוב בעוד שעה'),
    ('business_requests','user_id','5','יותר מדי בקשות — נסו שוב בעוד שעה'),
    ('store_posts','created_by','20','יותר מדי פרסומים — נסו שוב בעוד שעה'),
    ('recipes','author_id','20','יותר מדי מתכונים — נסו שוב בעוד שעה'),
    ('store_recs','user_id','20','יותר מדי המלצות — נסו שוב בעוד שעה'),
    ('clothing_shops','created_by','20','יותר מדי חנויות — נסו שוב בעוד שעה'),
    ('feedback','user_id','20','יותר מדי הודעות — נסו שוב בעוד שעה'),
    ('prices','by_id','200','יותר מדי דיווחי מחיר — נסו שוב בעוד שעה')
  ) v(t, col, lim, msg) loop
    execute format('drop trigger if exists rate_limit on public.%I', r.t);
    execute format('create trigger rate_limit before insert on public.%I for each row execute function public.rate_limit_guard(%L, %L, %L)', r.t, r.col, r.lim, r.msg);
  end loop;
end $$;
-- המוצרים שלי: עד 1000 מוצרים למשתמש (עדכון מוצר קיים — תמיד מותר)
create or replace function public.my_products_cap() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if exists (select 1 from public.my_products where user_id = new.user_id and pkey = new.pkey) then return new; end if;
  if (select count(*) from (select 1 from public.my_products where user_id = auth.uid() limit 1000) t) >= 1000 then
    raise exception 'הגעתם למקסימום של 1000 מוצרים אישיים' using errcode = 'P0001', hint = 'rate_limit';
  end if;
  return new;
end $$;
drop trigger if exists my_products_cap on public.my_products;
create trigger my_products_cap before insert on public.my_products for each row execute function public.my_products_cap();

-- ---------- 8c. התראה על דירוג מתכון: לא יותר מאחת לחצי שעה לאותו מתכון ----------
create or replace function public.push_on_reaction() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  select id, name, author_id into r from public.recipes where id = new.recipe_id;
  if r.author_id is not null and r.author_id <> new.user_id
     and not exists (select 1 from public.push_queue q where q.user_id = r.author_id and q.tag = 'react:' || r.id and q.created_at > now() - interval '30 minutes') then
    perform public.push_enqueue(r.author_id, 'recipe', new.emoji || ' מישהו דירג את המתכון שלך', r.name, '/#recipe-' || r.id, 'react:' || r.id);
  end if;
  return new;
end $$;
create index if not exists push_queue_user_tag on public.push_queue (user_id, tag, created_at desc);

-- ---------- 9. מפתח סודי לקריאות המתוזמנות לפונקציות השרת ----------
alter table public.auth_secret add column if not exists cron_key text not null default encode(extensions.gen_random_bytes(24), 'hex');
revoke all on public.auth_secret from anon, authenticated;
create or replace function public.push_poke() returns void
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  select cron_key into k from public.auth_secret where id = 1;
  begin
    execute 'select net.http_post(url := $1, body := $2, headers := $3)'
      using 'https://ygyfodxfbebnkwdcbjrp.supabase.co/functions/v1/push', '{"run":true}'::jsonb,
            jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', coalesce(k, ''));
  exception when others then null;
  end;
end $$;
revoke all on function public.push_poke() from public, anon, authenticated;
create or replace function public.prices_sync_poke() returns void
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  select cron_key into k from public.auth_secret where id = 1;
  begin
    execute 'select net.http_post(url := $1, body := $2, headers := $3)'
      using 'https://ygyfodxfbebnkwdcbjrp.supabase.co/functions/v1/prices-sync', '{"run":true}'::jsonb,
            jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', coalesce(k, ''));
  exception when others then null;
  end;
end $$;
revoke all on function public.prices_sync_poke() from public, anon, authenticated;

-- ---------- 10. מכסת בינה מלאכותית — ספירה אטומית (רק לשרת) ----------
create or replace function public.ai_usage_take(p_user uuid) returns int
language sql security definer set search_path = public as $$
  insert into public.ai_usage(user_id, day, count) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count;
$$;
revoke all on function public.ai_usage_take(uuid) from public, anon, authenticated;
grant execute on function public.ai_usage_take(uuid) to service_role;

-- ---------- 11. חסומים/מושעים: גם בטבלאות החדשות, גם בעריכה, וגם בהצבעה על מחירים ----------
-- (support_messages נשאר פתוח — כדי שאפשר יהיה לערער מול הצוות)
do $$
declare t text;
begin
  foreach t in array array['prices','recipes','bot_knowledge','divrei_torah','site_reviews','store_messages','store_posts','price_flags','business_requests','chains','branches','feedback',
                           'store_recs','clothing_shops','cloth_votes','torah_reactions','recipe_reactions','price_sources','store_orders']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "no banned" on public.%I', t);
      execute format('create policy "no banned" on public.%I as restrictive for insert with check (public.not_banned())', t);
    end if;
  end loop;
  foreach t in array array['prices','store_posts','site_reviews','cloth_votes','torah_reactions','recipe_reactions','divrei_torah']
  loop
    execute format('drop policy if exists "no banned update" on public.%I', t);
    execute format('create policy "no banned update" on public.%I as restrictive for update using (public.not_banned()) with check (public.not_banned())', t);
  end loop;
end $$;

create or replace function public.confirm_price(p_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null or not public.not_banned() then return null; end if;
  if exists (select 1 from public.prices where id = p_id and by_id = auth.uid()) then
    return (select confirms from public.prices where id = p_id);
  end if;
  insert into public.price_confirms(price_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  if found then
    perform set_config('app.bypass_price_guard', 'on', true);
    update public.prices set confirms = confirms + 1 where id = p_id;
    perform set_config('app.bypass_price_guard', 'off', true);
  end if;
  select confirms into n from public.prices where id = p_id;
  return n;
end $$;
create or replace function public.vote_price(p_id uuid, p_vote int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c int; w int;
begin
  if auth.uid() is null then return null; end if;
  if not public.not_banned() then return jsonb_build_object('error', 'banned'); end if;
  if not exists (select 1 from public.prices where id = p_id) then return jsonb_build_object('error', 'not_found'); end if;
  if exists (select 1 from public.prices where id = p_id and by_id = auth.uid()) then
    return (select jsonb_build_object('ok', confirms, 'wrong', wrong, 'own', true) from public.prices where id = p_id);
  end if;
  if p_vote > 0 then
    delete from public.price_flags where price_id = p_id and user_id = auth.uid();
    insert into public.price_confirms(price_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  else
    delete from public.price_confirms where price_id = p_id and user_id = auth.uid();
    insert into public.price_flags(price_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  end if;
  select count(*) into c from public.price_confirms where price_id = p_id;
  select count(*) into w from public.price_flags where price_id = p_id;
  perform set_config('app.bypass_price_guard', 'on', true);
  update public.prices set confirms = c, wrong = w where id = p_id;
  perform set_config('app.bypass_price_guard', 'off', true);
  return jsonb_build_object('ok', c, 'wrong', w, 'mine', case when p_vote > 0 then 1 else -1 end);
end $$;
revoke all on function public.confirm_price(uuid) from public, anon;
revoke all on function public.vote_price(uuid, int) from public, anon;
grant execute on function public.confirm_price(uuid), public.vote_price(uuid, int) to authenticated;

-- ---------- 12. מחיר שנערך (מחיר/מוצר/סניף/מטבע) — האישורים וה"לא נכון" מתאפסים ----------
create or replace function public.prices_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare sm public.store_managers%rowtype;
begin
  if current_setting('app.bypass_price_guard', true) = 'on' then return new; end if;
  if auth.uid() is null then return new; end if; -- עריכה ישירה מלוח הבקרה של Supabase
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if public.is_staff() then return new; end if;
    new.confirms := old.confirms; new.wrong := old.wrong; new.by_id := old.by_id; new.created_at := old.created_at; new.chain := old.chain;
    if new.price is distinct from old.price or new.product is distinct from old.product or new.product_key is distinct from old.product_key
       or new.branch is distinct from old.branch or new.currency is distinct from old.currency or new.barcode is distinct from old.barcode then
      new.confirms := 0; new.wrong := 0;
      delete from public.price_confirms where price_id = old.id;
      delete from public.price_flags where price_id = old.id;
    end if;
  else
    if public.is_staff() then return new; end if;
    new.confirms := 0; new.wrong := 0; new.by_id := auth.uid(); new.updated_at := null;
  end if;
  select * into sm from public.store_managers
   where user_id = auth.uid() and chain = new.chain and (branch = '' or branch = new.branch);
  if found then
    new.verified := true;
    new.status := case when sm.auto_approve then 'approved' else 'pending' end;
  else
    new.verified := false;
    new.status := 'approved';
  end if;
  return new;
end $$;

-- ---------- 13. ביגוד: השם נלקח מהפרופיל; הצבעות — כל אחד רואה רק את שלו, והסיכומים דרך פונקציה ----------
create or replace function public.cloth_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_staff() then return new; end if;
  new.by_name := left(public.my_name(), 40);
  if tg_table_name = 'cloth_votes' then
    if tg_op = 'INSERT' then new.handled := false; new.user_id := auth.uid();
    else new.handled := old.handled; new.user_id := old.user_id; new.target := old.target; new.target_id := old.target_id; new.created_at := old.created_at;
    end if;
  elsif tg_table_name = 'store_recs' then
    if tg_op = 'INSERT' then new.user_id := auth.uid(); new.official := false; new.status := 'pending';
    else new.user_id := old.user_id; new.official := old.official; new.status := old.status; end if;
  end if;
  return new;
end $$;
drop trigger if exists cloth_guard on public.store_recs;
create trigger cloth_guard before insert or update on public.store_recs for each row execute function public.cloth_guard();
drop trigger if exists cloth_guard on public.cloth_votes;
create trigger cloth_guard before insert or update on public.cloth_votes for each row execute function public.cloth_guard();
drop policy if exists "cvotes read" on public.cloth_votes;
create policy "cvotes read" on public.cloth_votes for select using (user_id = auth.uid() or public.is_staff());
create or replace function public.cloth_vote_counts() returns table(target text, target_id uuid, vote smallint, n bigint)
language sql stable security definer set search_path = public as $$
  select v.target, v.target_id, v.vote, count(*) from public.cloth_votes v group by v.target, v.target_id, v.vote;
$$;
revoke all on function public.cloth_vote_counts() from public;
grant execute on function public.cloth_vote_counts() to anon, authenticated;

-- ---------- 15. פרסומות: צפייה/לחיצה נספרת פעם אחת ליום לכל משתמש ----------
create table if not exists public.ad_event_seen (
  ad_id uuid not null references public.ads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('view','click')),
  day date not null default current_date,
  primary key (ad_id, user_id, kind, day)
);
alter table public.ad_event_seen enable row level security;
revoke all on public.ad_event_seen from anon, authenticated;
create or replace function public.ad_event(p_id uuid, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_kind not in ('view','click') then return; end if;
  if not exists (select 1 from public.ads where id = p_id) then return; end if;
  insert into public.ad_event_seen(ad_id, user_id, kind, day) values (p_id, auth.uid(), p_kind, current_date) on conflict do nothing;
  if not found then return; end if;
  update public.ads set views = views + (case when p_kind = 'view' then 1 else 0 end),
                        clicks = clicks + (case when p_kind = 'click' then 1 else 0 end)
  where id = p_id;
  if random() < 0.01 then delete from public.ad_event_seen where day < current_date - 7; end if;
end $$;
revoke all on function public.ad_event(uuid, text) from public, anon;
grant execute on function public.ad_event(uuid, text) to authenticated;

-- ---------- 16. גודל מקסימלי לשדות JSON / מערכים שמשתמשים כותבים ----------
update public.recipes set emoji = left(emoji, 16) where char_length(emoji) > 16;
do $$ begin
  alter table public.store_orders add constraint store_orders_items_size_chk check (pg_column_size(items) < 64000) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.recipes add constraint recipes_arrays_size_chk
    check (char_length(emoji) <= 16 and pg_column_size(req) < 50000 and pg_column_size(opt) < 50000 and coalesce(pg_column_size(emojis), 0) < 4000) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.clothing_shops add constraint clothing_shops_subs_size_chk check (pg_column_size(subs) < 4000) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.push_prefs add constraint push_prefs_kinds_size_chk check (pg_column_size(kinds) < 4000) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.biz_machines add constraint biz_machines_slots_size_chk check (pg_column_size(slots) < 200000) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.biz_machine_log add constraint biz_machine_log_detail_size_chk check (pg_column_size(detail) < 20000) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.prices add constraint prices_product_key_len_chk check (char_length(product_key) <= 200) not valid;
exception when duplicate_object then null; end $$;

-- סימוני "נמחק" (tomb) נשמרים יחד עם הרשימות — כך מחיקה של בן משפחה עם הרשאה מוגבלת לא חוזרת ממכשיר אחר
create or replace function public.room_section_keys(p_section text) returns text[]
language sql immutable as $$
  select case p_section
    when 'lists'   then array['lists','plans','stats','templates','tomb']
    when 'history' then array['history']
    when 'home'    then array['pantry','customPantry','stock','missingHome','homeMod']
    when 'recipes' then array['customRecipes']
    else array[]::text[] end;
$$;

-- אימות מייל בהרשמה: האם יש חשבון עם המייל הזה, והאם הוא אומת (רק לפונקציה בשרת — לא למשתמשים)
create or replace function public.auth_user_state(p_email text) returns table(id uuid, confirmed boolean)
language sql stable security definer set search_path = public, auth as $$
  select u.id, (u.email_confirmed_at is not null) from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
$$;
revoke all on function public.auth_user_state(text) from public, anon, authenticated;
grant execute on function public.auth_user_state(text) to service_role;

-- =====================================================================
-- ===== v20: security fixes (תיקוני אבטחה — סבב 2) =====
-- הכל כאן ניתן להרצה חוזרת. הגדרות כאן גוברות על כל מה שמעל.
-- =====================================================================

-- ---------- 1. משתמש משני לא מקבל את קוד החדר האמיתי — רק כינוי (alias) אישי ----------
-- הכינוי עובד רק עבורו (room_get / room_put / room_access / leave_room), ואי אפשר להצטרף איתו לחדר.
alter table public.room_members add column if not exists alias text default ('S' || upper(encode(extensions.gen_random_bytes(8), 'hex')));
alter table public.room_members alter column alias set default ('S' || upper(encode(extensions.gen_random_bytes(8), 'hex')));
update public.room_members set alias = 'S' || upper(encode(extensions.gen_random_bytes(8), 'hex')) where alias is null;
alter table public.room_members alter column alias set not null;
create unique index if not exists room_members_alias_u on public.room_members (alias);
-- משתמש משני לא קורא את השורה שלו ישירות (יש בה את הקוד האמיתי)
drop policy if exists "members self read" on public.room_members;
create policy "members self read" on public.room_members for select using (user_id = auth.uid() and role <> 'secondary');

-- החברות שלי לפי קוד: קוד אמיתי — רק לבעלים/חבר מלא; כינוי — רק של המשתמש עצמו
create or replace function public.room_member_of(p_code text) returns setof public.room_members
language sql stable security definer set search_path = public as $$
  select m.* from public.room_members m
  where m.user_id = auth.uid() and upper(trim(coalesce(p_code, ''))) <> ''
    and ((m.room_code = upper(trim(p_code)) and m.role <> 'secondary') or m.alias = upper(trim(p_code)))
  limit 1;
$$;
revoke all on function public.room_member_of(text) from public, anon, authenticated;

create or replace function public.room_access(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m public.room_members; r public.rooms;
begin
  select * into m from public.room_member_of(p_code);
  if not found then return null; end if;
  select * into r from public.rooms where code = m.room_code;
  if not found then return null; end if;
  return jsonb_build_object('role', case when r.owner = auth.uid() then 'owner' else m.role end, 'name', m.name,
                            'perms', case when m.role = 'secondary' then m.perms else null end,
                            'owner_name', (select coalesce(nullif(p.name, ''), 'משתמש') from public.profiles p where p.id = r.owner));
end $$;

create or replace function public.room_get(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m public.room_members; d jsonb; out jsonb := '{}'::jsonb; s text; k text;
begin
  select * into m from public.room_member_of(p_code);
  if not found then return null; end if;
  select data into d from public.rooms where code = m.room_code;
  if m.role <> 'secondary' then return d; end if;
  -- כולל tomb (חלק מ-lists): {"items":{id: epoch_ms}, "lists":{id: epoch_ms}}
  foreach s in array array['lists','history','home','recipes'] loop
    if coalesce((m.perms->'view'->>s)::boolean, true) then
      foreach k in array public.room_section_keys(s) loop
        if d ? k then out := out || jsonb_build_object(k, d->k); end if;
      end loop;
    end if;
  end loop;
  return out;
end $$;

-- החדרים שלי: משתמש משני מקבל את הכינוי שלו במקום הקוד
create or replace function public.my_rooms() returns table(code text, owner uuid, role text)
language sql stable security definer set search_path = public as $$
  select (case when m.role = 'secondary' and r.owner <> auth.uid() then m.alias else r.code end)::text, r.owner,
         (case when r.owner = auth.uid() then 'owner' else m.role end)::text
  from public.room_members m join public.rooms r on r.code = m.room_code
  where m.user_id = auth.uid()
  order by (r.owner = auth.uid()) desc, m.joined_at;
$$;

-- הצטרפות עם קוד: כינוי לא מצרף אף אחד (רק "כבר חבר" למי שהכינוי שלו). נעילה נגד מרוץ במונה הכישלונות.
create or replace function public.join_room(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare c text := upper(trim(coalesce(p_code, ''))); uid uuid := auth.uid();
begin
  if uid is null then return false; end if;
  perform pg_advisory_xact_lock(hashtext('room_join:' || uid::text));
  if (select count(*) from public.room_join_fails where user_id = uid and at > now() - interval '1 hour') >= 20 then return false; end if;
  if random() < 0.01 then delete from public.room_join_fails where at < now() - interval '1 day'; end if;
  if c <> '' and exists (select 1 from public.room_members where user_id = uid and (room_code = c or alias = c)) then return true; end if;
  if not exists (select 1 from public.rooms where code = c)
     or exists (select 1 from public.room_bans where room_code = c and user_id = uid) then
    insert into public.room_join_fails(user_id) values (uid);
    return false;
  end if;
  insert into public.room_members(room_code, user_id) values (c, uid) on conflict do nothing;
  return true;
end $$;

-- עזיבה: לפי הקוד או הכינוי של המשתמש עצמו
create or replace function public.leave_room(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare c text := upper(trim(coalesce(p_code, ''))); m public.room_members;
begin
  if auth.uid() is null or c = '' then return; end if;
  select * into m from public.room_members where user_id = auth.uid() and (room_code = c or alias = c) limit 1;
  if not found then return; end if;
  if exists (select 1 from public.rooms where code = m.room_code and owner = auth.uid()) then return; end if;
  delete from public.room_members where room_code = m.room_code and user_id = auth.uid();
  if m.role = 'secondary' then
    insert into public.room_bans(room_code, user_id) values (m.room_code, auth.uid()) on conflict do nothing;
  end if;
end $$;

-- הסרת חבר: חסימה, ואם הוא היה חבר מלא (מכיר את הקוד) — הקוד מתחלף אוטומטית
-- (הבעלים והחברים המלאים מוצאים את הקוד החדש דרך ensure_my_room / my_rooms; משתמשים משניים ממשיכים עם הכינוי)
create or replace function public.room_member_remove(p_user uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare codes text[]; roles text[]; i int;
begin
  if auth.uid() is null or p_user is null or p_user = auth.uid() then return false; end if;
  with del as (
    delete from public.room_members m
    where m.user_id = p_user and m.room_code in (select code from public.rooms where owner = auth.uid())
    returning m.room_code, m.role
  ) select array_agg(room_code), array_agg(role) into codes, roles from del;
  if codes is null then return false; end if;
  for i in 1 .. array_length(codes, 1) loop
    insert into public.room_bans(room_code, user_id) values (codes[i], p_user) on conflict do nothing;
    if roles[i] = 'full' then perform public.room_rotate_code(codes[i]); end if;
  end loop;
  return true;
end $$;

-- ---------- 8. הזמנות: נעילת החדר לפני ספירה + בדיקה חוזרת של המגבלה בקבלה ----------
create or replace function public.room_invite_create(p_perms jsonb, p_label text default '') returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare c text; lim int; used int; tok text; otp text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select code into c from public.rooms where owner = auth.uid() order by updated_at limit 1 for update;
  if c is null then raise exception 'no room'; end if;
  lim := public.secondary_limit(auth.uid());
  select count(*) into used from public.room_members where room_code = c and role = 'secondary';
  used := used + (select count(*) from public.room_invites where room_code = c and used_at is null and expires_at > now());
  if lim is not null and used >= lim then return jsonb_build_object('error', 'limit', 'limit', lim); end if;
  tok := encode(gen_random_bytes(18), 'hex');
  otp := lpad((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000)::text, 6, '0');
  insert into public.room_invites(token, room_code, otp_hash, perms, label, created_by)
  values (tok, c, encode(digest(otp || ':' || tok, 'sha256'), 'hex'), public.room_clean_perms(coalesce(p_perms, '{}'::jsonb)), left(coalesce(p_label, ''), 40), auth.uid());
  return jsonb_build_object('token', tok, 'otp', otp, 'expires_at', now() + interval '7 days');
end $$;

-- קבלת הזמנה: מחזיר את הכינוי (לא את הקוד האמיתי) ב-code
create or replace function public.room_invite_accept(p_token text, p_otp text, p_name text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare i public.room_invites; owner uuid; lim int; al text;
begin
  if auth.uid() is null then return jsonb_build_object('error', 'login'); end if;
  select * into i from public.room_invites where token = p_token for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if i.used_at is not null then return jsonb_build_object('error', 'used'); end if;
  if i.expires_at < now() or i.attempts >= 5 then return jsonb_build_object('error', 'expired'); end if;
  if encode(digest(trim(coalesce(p_otp, '')) || ':' || i.token, 'sha256'), 'hex') <> i.otp_hash then
    update public.room_invites set attempts = attempts + 1 where token = p_token;
    return jsonb_build_object('error', 'bad_otp', 'left', 4 - i.attempts);
  end if;
  select r.owner into owner from public.rooms r where r.code = i.room_code for update;
  if owner = auth.uid() then return jsonb_build_object('error', 'self'); end if;
  lim := public.secondary_limit(owner);
  if lim is not null and (select count(*) from public.room_members where room_code = i.room_code and role = 'secondary' and user_id <> auth.uid()) >= lim then
    return jsonb_build_object('error', 'limit', 'limit', lim);
  end if;
  delete from public.room_bans where room_code = i.room_code and user_id = auth.uid();
  insert into public.room_members(room_code, user_id, role, name, perms, invited_by)
  values (i.room_code, auth.uid(), 'secondary', left(coalesce(nullif(trim(p_name), ''), 'משתמש משני'), 40), i.perms, i.created_by)
  on conflict (room_code, user_id) do update set role = 'secondary', name = excluded.name, perms = excluded.perms
  returning alias into al;
  update public.room_invites set used_at = now(), used_by = auth.uid() where token = p_token;
  perform public.push_enqueue(owner, 'info', '👥 ' || left(coalesce(nullif(trim(p_name), ''), 'משתמש משני'), 40) || ' הצטרף/ה', 'משתמש משני חדש התחבר לחשבון שלך', '/', 'member:' || i.room_code);
  return jsonb_build_object('ok', true, 'code', al);
end $$;
revoke all on function public.room_access(text) from public, anon;
revoke all on function public.room_get(text) from public, anon;
revoke all on function public.my_rooms() from public, anon;
revoke all on function public.join_room(text) from public, anon;
revoke all on function public.leave_room(text) from public, anon;
revoke all on function public.room_member_remove(uuid) from public, anon;
revoke all on function public.room_invite_create(jsonb, text) from public, anon;
revoke all on function public.room_invite_accept(text, text, text) from public, anon;
grant execute on function public.room_access(text), public.room_get(text), public.my_rooms(), public.join_room(text), public.leave_room(text),
  public.room_member_remove(uuid), public.room_invite_create(jsonb, text), public.room_invite_accept(text, text, text) to authenticated;

-- ---------- 2+3. ניקוי נתוני החדר בצד השרת + סימוני מחיקה (tomb) עם זמן שרת ----------
-- tomb = {"items":{id: epoch_ms}, "lists":{id: epoch_ms}} — רק מספרים, לא יותר מיום קדימה, עד 30 יום אחורה, עד 2000 לכל סוג
create or replace function public.room_tomb_kind(m jsonb) returns jsonb
language sql stable as $$
  select coalesce(jsonb_object_agg(e.key, e.num), '{}'::jsonb) from (
    select key, num from (
      select key, case when jsonb_typeof(value) = 'number' then value::numeric end num
      from jsonb_each(case when jsonb_typeof(m) = 'object' then m else '{}'::jsonb end)) x
    where num is not null and key ~ '^[\w-]{1,64}$' and num > 0
      and num >= extract(epoch from now()) * 1000 - 30 * 86400000::numeric
      and num <= extract(epoch from now()) * 1000 + 86400000::numeric
    order by num desc limit 2000) e;
$$;
create or replace function public.room_tomb_clean(t jsonb) returns jsonb
language sql stable as $$
  select jsonb_build_object('items', public.room_tomb_kind(t->'items'), 'lists', public.room_tomb_kind(t->'lists'));
$$;
-- איחוד שני tomb (לכל מזהה — הזמן המאוחר)
create or replace function public.room_tomb_union(a jsonb, b jsonb) returns jsonb
language sql stable as $$
  select public.room_tomb_clean(jsonb_build_object(k1, x1, k2, x2)) from (
    select 'items' k1, (select coalesce(jsonb_object_agg(key, mx), '{}'::jsonb) from (
        select key, max(value::numeric) mx from (
          select * from jsonb_each(case when jsonb_typeof(a->'items') = 'object' then a->'items' else '{}'::jsonb end)
          union all select * from jsonb_each(case when jsonb_typeof(b->'items') = 'object' then b->'items' else '{}'::jsonb end)) u
        where jsonb_typeof(value) = 'number' group by key) g) x1,
      'lists' k2, (select coalesce(jsonb_object_agg(key, mx), '{}'::jsonb) from (
        select key, max(value::numeric) mx from (
          select * from jsonb_each(case when jsonb_typeof(a->'lists') = 'object' then a->'lists' else '{}'::jsonb end)
          union all select * from jsonb_each(case when jsonb_typeof(b->'lists') = 'object' then b->'lists' else '{}'::jsonb end)) u
        where jsonb_typeof(value) = 'number' group by key) g) x2) s;
$$;
-- זמן (ts / created) מחוץ לטווח [0, עכשיו + p_future_ms] → עכשיו
create or replace function public.room_fix_ts(o jsonb, k text, p_now bigint, p_max bigint) returns jsonb
language sql immutable as $$
  select case when jsonb_typeof(o) is distinct from 'object' or not (o ? k) then o
              when jsonb_typeof(o->k) = 'number' then
                case when (o->k)::numeric between 0 and p_max then o else o || jsonb_build_object(k, p_now) end
              else o || jsonb_build_object(k, p_now) end;
$$;
create or replace function public.room_clean(p jsonb, p_future_ms bigint default 86400000) returns jsonb
language plpgsql stable set search_path = public as $$
declare d jsonb := p; nowms bigint := (extract(epoch from now()) * 1000)::bigint; mx bigint; arr jsonb; l jsonb; items jsonb; k text;
begin
  if d is null or jsonb_typeof(d) <> 'object' then return d; end if;
  mx := nowms + p_future_ms;
  if jsonb_typeof(d->'lists') = 'array' then
    arr := '[]'::jsonb;
    for l in select v from jsonb_array_elements(d->'lists') v loop
      if jsonb_typeof(l) = 'object' then
        l := public.room_fix_ts(l, 'created', nowms, mx);
        if jsonb_typeof(l->'items') = 'array' then
          select coalesce(jsonb_agg(public.room_fix_ts(v, 'ts', nowms, mx) order by o), '[]'::jsonb) into items
          from jsonb_array_elements(l->'items') with ordinality t(v, o);
          l := l || jsonb_build_object('items', items);
        end if;
      end if;
      arr := arr || jsonb_build_array(l);
    end loop;
    d := d || jsonb_build_object('lists', arr);
  end if;
  if jsonb_typeof(d->'history') = 'array' then
    select coalesce(jsonb_agg(public.room_fix_ts(v, 'ts', nowms, mx) order by o), '[]'::jsonb) into arr
    from jsonb_array_elements(d->'history') with ordinality t(v, o);
    d := d || jsonb_build_object('history', arr);
  end if;
  -- רשימות שמות: רק מחרוזות עד 80 תווים
  foreach k in array array['customPantry','missingHome'] loop
    if d ? k then
      select coalesce(jsonb_agg(v order by o), '[]'::jsonb) into arr
      from jsonb_array_elements(case when jsonb_typeof(d->k) = 'array' then d->k else '[]'::jsonb end) with ordinality t(v, o)
      where jsonb_typeof(v) = 'string' and char_length(v #>> '{}') <= 80;
      d := d || jsonb_build_object(k, arr);
    end if;
  end loop;
  -- תבניות / ידע: רק אובייקטים
  foreach k in array array['templates','knowledge'] loop
    if d ? k then
      select coalesce(jsonb_agg(v order by o), '[]'::jsonb) into arr
      from jsonb_array_elements(case when jsonb_typeof(d->k) = 'array' then d->k else '[]'::jsonb end) with ordinality t(v, o)
      where jsonb_typeof(v) = 'object';
      d := d || jsonb_build_object(k, arr);
    end if;
  end loop;
  if d ? 'tomb' then d := d || jsonb_build_object('tomb', public.room_tomb_clean(d->'tomb')); end if;
  return d;
end $$;
-- כל כתיבה לנתוני החדר (גם ישירה של בעלים / חבר מלא): ניקוי, וסימוני מחיקה ישנים לא הולכים לאיבוד
create or replace function public.rooms_data_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.data is not distinct from old.data then return new; end if;
  new.data := public.room_clean(coalesce(new.data, '{}'::jsonb), 86400000);
  if tg_op = 'UPDATE' and jsonb_typeof(old.data->'tomb') = 'object' then
    new.data := new.data || jsonb_build_object('tomb', public.room_tomb_union(old.data->'tomb', new.data->'tomb'));
  end if;
  return new;
end $$;
drop trigger if exists rooms_data_guard on public.rooms;
create trigger rooms_data_guard before insert or update of data on public.rooms for each row execute function public.rooms_data_guard();

-- ---------- 4. מיזוג רשימות של משתמש משני ----------
-- מחיקה של מוצר שלא סומן — רק עם "למחוק"; שם מהיסטוריה חדשה מתיר מחיקה רק למי שגם מותר לו לסמן
-- (כלומר רק מה שהוא יכול לעשות ממילא בסימון + סיום). בלי "למחוק": אי אפשר לשנות שם, ואי אפשר להחזיר זמן לאחור.
create or replace function public.room_merge_lists(p_old jsonb, p_new jsonb, p_add boolean, p_check boolean, p_del boolean, p_fin boolean, p_finished text[])
returns jsonb language plpgsql immutable set search_path = public as $$
declare res jsonb := '[]'::jsonb; viol boolean := false; nl jsonb; ol jsonb; ni jsonb; oi jsonb; items jsonb; newids text[]; olds jsonb;
begin
  olds := case when jsonb_typeof(p_old) = 'array' then p_old else '[]'::jsonb end;
  if jsonb_typeof(p_new) is distinct from 'array' then
    return jsonb_build_object('lists', olds, 'viol', true);
  end if;
  for nl in select x from jsonb_array_elements(p_new) x loop
    if jsonb_typeof(nl) is distinct from 'object' then viol := true; continue; end if;
    ol := null;
    select x into ol from jsonb_array_elements(olds) x where x->>'id' = nl->>'id' limit 1;
    if ol is null then
      if not p_add then viol := true; continue; end if;
      res := res || jsonb_build_array(nl); continue;
    end if;
    items := '[]'::jsonb;
    for ni in select x from jsonb_array_elements(case when jsonb_typeof(nl->'items') = 'array' then nl->'items' else '[]'::jsonb end) x loop
      oi := null;
      select x into oi from jsonb_array_elements(case when jsonb_typeof(ol->'items') = 'array' then ol->'items' else '[]'::jsonb end) x
        where x->>'id' = ni->>'id' limit 1;
      if oi is null then
        if not p_add then viol := true; continue; end if;
      else
        if not p_check and coalesce(ni->'done', 'false'::jsonb) is distinct from coalesce(oi->'done', 'false'::jsonb) then
          viol := true;
          ni := (ni - 'done' - 'doneBy') || jsonb_strip_nulls(jsonb_build_object('done', oi->'done', 'doneBy', oi->'doneBy'));
        end if;
        if not p_del then
          if (ni->'n') is distinct from (oi->'n') then
            viol := true;
            ni := (ni - 'n' - 'e' - 'c') || jsonb_strip_nulls(jsonb_build_object('n', oi->'n', 'e', oi->'e', 'c', oi->'c'));
          end if;
          if jsonb_typeof(oi->'ts') = 'number'
             and (jsonb_typeof(ni->'ts') is distinct from 'number' or (ni->'ts')::numeric < (oi->'ts')::numeric) then
            ni := ni || jsonb_build_object('ts', oi->'ts');
          end if;
        end if;
      end if;
      items := items || jsonb_build_array(ni);
    end loop;
    select coalesce(array_agg(x->>'id'), '{}') into newids from jsonb_array_elements(items) x;
    for oi in select x from jsonb_array_elements(case when jsonb_typeof(ol->'items') = 'array' then ol->'items' else '[]'::jsonb end) x loop
      if not (coalesce(oi->>'id', '') = any(newids)) then
        if not (p_del or (p_fin and (oi->'done' = 'true'::jsonb or (p_check and (oi->>'n') = any(coalesce(p_finished, '{}')))))) then
          viol := true; items := items || jsonb_build_array(oi);
        end if;
      end if;
    end loop;
    res := res || jsonb_build_array(nl || jsonb_build_object('items', items));
  end loop;
  for ol in select x from jsonb_array_elements(olds) x loop
    if not exists (select 1 from jsonb_array_elements(p_new) y where y->>'id' = ol->>'id') and not p_del then
      viol := true; res := res || jsonb_build_array(ol);
    end if;
  end loop;
  return jsonb_build_object('lists', res, 'viol', viol);
end $$;
revoke all on function public.room_merge_lists(jsonb, jsonb, boolean, boolean, boolean, boolean, text[]) from public, anon, authenticated;

-- משתמש משני שומר: לפי כינוי, ניקוי בצד השרת, tomb של הלקוח לא נלקח — השרת רושם בעצמו מה נמחק
create or replace function public.room_put(p_code text, p_data jsonb, p_by text) returns boolean
language plpgsql security definer set search_path = public as $$
declare m public.room_members; d jsonb; k text; viol boolean := false; mg jsonb; fin_names text[] := '{}';
  v_lists boolean; v_hist boolean; v_home boolean; a_add boolean; a_check boolean; a_del boolean; a_fin boolean; a_home boolean;
  old_lists jsonb; rl jsonb; ri jsonb; nowms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  select * into m from public.room_member_of(p_code);
  if not found or m.role <> 'secondary' then return false; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then return false; end if;
  if octet_length(p_data::text) > 6000000 then raise exception 'הרשימה גדולה מדי לשמירה' using errcode = '54000'; end if;
  p_data := public.room_clean(p_data - 'tomb', 60000);
  v_lists := coalesce((m.perms->'view'->>'lists')::boolean, true);
  v_hist  := coalesce((m.perms->'view'->>'history')::boolean, true);
  v_home  := coalesce((m.perms->'view'->>'home')::boolean, true);
  a_add   := coalesce((m.perms->'act'->>'add')::boolean, true);
  a_check := coalesce((m.perms->'act'->>'check')::boolean, true);
  a_del   := coalesce((m.perms->'act'->>'delete')::boolean, false);
  a_fin   := coalesce((m.perms->'act'->>'finish')::boolean, true);
  a_home  := coalesce((m.perms->'act'->>'home_edit')::boolean, true);
  select data into d from public.rooms where code = m.room_code for update;
  d := coalesce(d, '{}'::jsonb);
  if p_data ? 'history' then
    if v_hist and a_fin and jsonb_typeof(p_data->'history') = 'array' then
      select coalesce(array_agg(it->>'n'), '{}') into fin_names
      from jsonb_array_elements(p_data->'history') h, jsonb_array_elements(case when jsonb_typeof(h->'items') = 'array' then h->'items' else '[]'::jsonb end) it
      where not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(d->'history') = 'array' then d->'history' else '[]'::jsonb end) oh where oh->'ts' = h->'ts');
      d := d || jsonb_build_object('history', p_data->'history');
    elsif (p_data->'history') is distinct from (d->'history') then viol := true;
    end if;
  end if;
  if v_lists and (a_add or a_check or a_del or a_fin) then
    if p_data ? 'lists' then
      old_lists := case when jsonb_typeof(d->'lists') = 'array' then d->'lists' else '[]'::jsonb end;
      mg := public.room_merge_lists(old_lists, p_data->'lists', a_add, a_check, a_del, a_fin, fin_names);
      d := d || jsonb_build_object('lists', mg->'lists');
      if (mg->>'viol')::boolean then viol := true; end if;
      -- סימוני מחיקה (זמן שרת) לרשימות ולמוצרים שבאמת ירדו
      select coalesce(jsonb_object_agg(x.id, nowms), '{}'::jsonb) into rl from (
        select ol->>'id' id from jsonb_array_elements(old_lists) ol
        where ol->>'id' is not null
          and not exists (select 1 from jsonb_array_elements(mg->'lists') nl where nl->>'id' = ol->>'id')) x;
      select coalesce(jsonb_object_agg(x.id, nowms), '{}'::jsonb) into ri from (
        select distinct oi->>'id' id
        from jsonb_array_elements(old_lists) ol, jsonb_array_elements(case when jsonb_typeof(ol->'items') = 'array' then ol->'items' else '[]'::jsonb end) oi
        where oi->>'id' is not null
          and not exists (select 1 from jsonb_array_elements(mg->'lists') nl,
                            jsonb_array_elements(case when jsonb_typeof(nl->'items') = 'array' then nl->'items' else '[]'::jsonb end) ni
                          where ni->>'id' = oi->>'id')) x;
      if rl <> '{}'::jsonb or ri <> '{}'::jsonb then
        d := d || jsonb_build_object('tomb', public.room_tomb_union(d->'tomb', jsonb_build_object('items', ri, 'lists', rl)));
      end if;
    end if;
    foreach k in array array['plans','stats','templates'] loop
      if p_data ? k then d := d || jsonb_build_object(k, p_data->k); end if;
    end loop;
  elsif p_data ? 'lists' and (p_data->'lists') is distinct from (d->'lists') then viol := true;
  end if;
  if v_home and a_home then
    foreach k in array public.room_section_keys('home') loop
      if p_data ? k then d := d || jsonb_build_object(k, p_data->k); end if;
    end loop;
  end if;
  begin
    update public.rooms set data = d, updated_by = left(coalesce(p_by, ''), 60), updated_at = now() where code = m.room_code;
  exception when check_violation then
    raise exception 'הרשימה גדולה מדי לשמירה' using errcode = '54000';
  end;
  return not viol;
end $$;
revoke all on function public.room_put(text, jsonb, text) from public, anon;
grant execute on function public.room_put(text, jsonb, text) to authenticated;

-- ---------- 5. חנות שמשתמש רגיל מוסיף: רק שם, סוג, קטגוריה ואתר — כל השאר כבוי/ריק עד אישור ----------
create or replace function public.chains_insert_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_staff() then return new; end if;
  new.status := 'pending'; new.created_by := auth.uid(); new.created_at := now(); new.hidden := false;
  new.ordering_enabled := false; new.inventory_public := false; new.inventory_show_qty := false;
  new.publish_prices := false; new.show_prices := true; new.biz_active := false;
  new.order_url := ''; new.order_phone := ''; new.whatsapp := ''; new.phone := ''; new.about := ''; new.logo := '';
  new.address := ''; new.hours := ''; new.audience := ''; new.delivery_areas := ''; new.min_order := null;
  return new;
end $$;
drop trigger if exists chains_insert_guard on public.chains;
create trigger chains_insert_guard before insert on public.chains for each row execute function public.chains_insert_guard();

-- ---------- 6. מחירים מהמלאי: מאושרים מיד רק אם לעסק יש אישור אוטומטי (או שמנהל האתר שינה) ----------
create or replace function public.inv_publish() returns trigger
language plpgsql security definer set search_path = public as $$
declare c record; ok boolean; auto boolean;
begin
  select publish_prices, show_prices, biz_active, status, hidden into c from public.chains where name = new.chain;
  ok := found;
  delete from public.prices where inv_id = new.id;
  if ok and c.publish_prices and c.show_prices and c.biz_active and c.status = 'approved' and not c.hidden
     and new.visible and new.price is not null and new.price > 0 then
    auto := public.is_admin() or exists (select 1 from public.store_managers m where m.chain = new.chain and m.auto_approve);
    perform set_config('app.bypass_price_guard', 'on', true);
    insert into public.prices(product, product_key, chain, branch, price, currency, barcode, status, verified, by_id, by_name, inv_id)
    values (left(new.name, 60), regexp_replace(regexp_replace(left(new.name, 60), '[''’`׳"]', '', 'g'), '\s+', ' ', 'g'), new.chain, '', new.price, 'ILS',
            case when new.barcode ~ '^[0-9]{4,20}$' then new.barcode else null end,
            case when auto then 'approved' else 'pending' end, auto, null, new.chain, new.id);
    perform set_config('app.bypass_price_guard', 'off', true);
  end if;
  return new;
end $$;

-- ---------- 7. שינוי שם חנות: רק מנהל האתר, ובכל הטבלאות שיש בהן שם חנות ----------
-- (הדגל app.chain_rename מאפשר לשנות את שם החנות גם בהזמנות ובהודעות, שבדרך כלל ננעל)
create or replace function public.store_messages_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid(); new.name := public.my_name(); new.reply := ''; new.is_read := false; new.replied_at := null; new.created_at := now();
  else
    if current_setting('app.chain_rename', true) is distinct from 'on' then new.chain := old.chain; end if;
    new.user_id := old.user_id; new.name := old.name; new.phone := old.phone; new.body := old.body; new.created_at := old.created_at;
    if new.reply is distinct from old.reply then new.replied_at := now(); end if;
  end if;
  return new;
end $$;
create or replace function public.orders_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare t numeric := 0; it jsonb; inv record;
begin
  if tg_op = 'INSERT' then
    for it in select * from jsonb_array_elements(new.items) loop
      select price into inv from public.store_inventory where chain = new.chain and (id::text = it->>'id' or lower(name) = lower(it->>'name')) limit 1;
      t := t + coalesce(inv.price, 0) * greatest(0, coalesce((it->>'qty')::numeric, 1));
    end loop;
    new.total := round(t, 2);
    if new.user_id is not null then
      perform pg_advisory_xact_lock(hashtext('store_orders:' || new.user_id::text));
      if (select count(*) from public.store_orders where user_id = new.user_id and created_at > now() - interval '1 hour') >= 10 then
        raise exception 'too many orders' using errcode = '42501'; end if;
    end if;
  else
    new.updated_at := now(); new.items := old.items; new.total := old.total; new.user_id := old.user_id; new.created_at := old.created_at;
    if current_setting('app.chain_rename', true) is distinct from 'on' then new.chain := old.chain; end if;
  end if;
  return new;
end $$;
create or replace function public.admin_rename_chain(p_old text, p_new text) returns text
language plpgsql security definer set search_path = public as $$
declare n text := left(trim(coalesce(p_new, '')), 40);
begin
  if not public.is_admin() then return 'forbidden'; end if;
  if n = '' then return 'empty'; end if;
  if n = p_old then return 'ok'; end if;
  if exists (select 1 from public.chains where name = n) then return 'exists'; end if;
  perform set_config('app.bypass_price_guard', 'on', true);
  perform set_config('app.chain_rename', 'on', true);
  update public.chains set name = n where name = p_old;
  update public.branches set chain = n where chain = p_old;
  update public.prices set chain = n where chain = p_old;
  update public.store_posts set chain = n where chain = p_old;
  delete from public.store_follows f where f.chain = p_old and exists (select 1 from public.store_follows g where g.user_id = f.user_id and g.chain = n);
  update public.store_follows set chain = n where chain = p_old;
  update public.store_managers set chain = n where chain = p_old;
  update public.store_inventory set chain = n where chain = p_old;
  update public.store_sales set chain = n where chain = p_old;
  update public.store_orders set chain = n where chain = p_old;
  update public.store_messages set chain = n where chain = p_old;
  update public.price_sources set chain = n where chain = p_old;
  delete from public.store_api_keys where chain = n and exists (select 1 from public.store_api_keys where chain = p_old);
  update public.store_api_keys set chain = n where chain = p_old;
  update public.biz_machines set chain = n where chain = p_old;
  update public.biz_machine_log set chain = n where chain = p_old;
  perform set_config('app.chain_rename', 'off', true);
  perform set_config('app.bypass_price_guard', 'off', true);
  return 'ok';
end $$;
revoke all on function public.admin_rename_chain(text, text) from public, anon;
grant execute on function public.admin_rename_chain(text, text) to authenticated;

-- ---------- 8. מרוצים: נעילה לפני ספירה (שתי בקשות במקביל לא עוקפות את ההגבלה) ----------
create or replace function public.rate_limit_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare col text := tg_argv[0]; lim int := tg_argv[1]::int; n int;
begin
  if auth.uid() is null then return new; end if;
  if current_setting('app.bypass_price_guard', true) = 'on' then return new; end if;
  if public.is_staff() then return new; end if;
  perform pg_advisory_xact_lock(hashtext(tg_table_name || ':' || auth.uid()::text));
  execute format('select count(*) from (select 1 from %I.%I where %I = $1 and created_at > now() - interval ''1 hour'' limit %s) t',
                 tg_table_schema, tg_table_name, col, lim) into n using auth.uid();
  if n >= lim then
    raise exception '%', coalesce(nullif(tg_argv[2], ''), 'יותר מדי הודעות — נסו שוב בעוד שעה') using errcode = 'P0001', hint = 'rate_limit';
  end if;
  return new;
end $$;
create or replace function public.abuse_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.user_id := auth.uid(); new.handled := false; new.name := public.my_name();
    perform pg_advisory_xact_lock(hashtext('abuse_reports:' || auth.uid()::text));
    if (select count(*) from public.abuse_reports where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 30 then return null; end if;
  end if;
  return new;
end $$;
create or replace function public.log_activity(p_action text, p_detail text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  perform pg_advisory_xact_lock(hashtext('activity_log:' || auth.uid()::text));
  if (select count(*) from public.activity_log where user_id = auth.uid() and created_at > now() - interval '1 minute') >= 120 then return; end if;
  insert into public.activity_log(user_id, name, action, detail)
  values (auth.uid(), coalesce((select name from public.profiles where id = auth.uid()), ''), left(coalesce(p_action, ''), 40), left(coalesce(p_detail, ''), 300));
end $$;
-- גרסת האפליקציה (למשל 2.1), דגם הטלפון (למשל SM-S901B · Android 14) ומזהה המכשיר האנונימי נשמרים בנפרד,
-- כדי שבבק אופיס יראו תקלות לפי גרסה ולפי דגם, ושהתראה תצא כשאותה תקלה קורית בכמה מכשירים שונים
drop function if exists public.log_client_error(text, text, text, text);
create or replace function public.log_client_error(p_msg text, p_src text default '', p_ua text default '', p_ver text default '',
                                                   p_app text default '', p_device text default '', p_dev text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  -- נעילה אחת לכולם (יש גם תקרה כללית); לכל היותר 20 בדקה ממשתמש, 60 מאורחים, 120 בסך הכול
  perform pg_advisory_xact_lock(hashtext('client_errors'));
  if auth.uid() is not null and (select count(*) from public.client_errors where user_id = auth.uid() and created_at > now() - interval '1 minute') >= 20 then return; end if;
  if auth.uid() is null and (select count(*) from public.client_errors where user_id is null and created_at > now() - interval '1 minute') >= 60 then return; end if;
  if (select count(*) from public.client_errors where created_at > now() - interval '1 minute') >= 120 then return; end if;
  if random() < 0.01 then delete from public.client_errors where created_at < now() - interval '30 days'; end if;
  -- נטפרי מזריק סקריפט (netfree.link) וה-CSP חוסם אותו כמו שצריך — זו לא תקלה באתר (גם מדפדפנים עם גרסה ישנה של האתר)
  if coalesce(p_msg, '') ~* 'CSP[^:]*: script-src.*netfree\.[a-z]+' then return; end if;
  insert into public.client_errors(user_id, msg, src, ua, ver, app_ver, device, dev)
  values (auth.uid(), left(coalesce(p_msg, ''), 500), left(coalesce(p_src, ''), 300), left(coalesce(p_ua, ''), 200), left(coalesce(p_ver, ''), 12),
          left(regexp_replace(coalesce(p_app, ''), '[^0-9.]', '', 'g'), 12),
          left(regexp_replace(coalesce(p_device, ''), '[^[:alnum:][:space:]·./()_-]', '', 'g'), 60),
          case when coalesce(p_dev, '') ~ '^[0-9a-f-]{36}$' then p_dev else '' end);
end $$;
revoke all on function public.log_client_error(text, text, text, text, text, text, text) from public;
grant execute on function public.log_client_error(text, text, text, text, text, text, text) to anon, authenticated;
create or replace function public.my_products_cap() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if exists (select 1 from public.my_products where user_id = new.user_id and pkey = new.pkey) then return new; end if;
  perform pg_advisory_xact_lock(hashtext('my_products:' || auth.uid()::text));
  if (select count(*) from (select 1 from public.my_products where user_id = auth.uid() limit 1000) t) >= 1000 then
    raise exception 'הגעתם למקסימום של 1000 מוצרים אישיים' using errcode = 'P0001', hint = 'rate_limit';
  end if;
  return new;
end $$;
-- הצבעה / אישור מחיר: נעילת שורת המחיר, והמונים תמיד לפי ספירה אמיתית
create or replace function public.confirm_price(p_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int; w int; pr record;
begin
  if auth.uid() is null or not public.not_banned() then return null; end if;
  select id, by_id, confirms into pr from public.prices where id = p_id for update;
  if not found then return null; end if;
  if pr.by_id = auth.uid() then return pr.confirms; end if;
  delete from public.price_flags where price_id = p_id and user_id = auth.uid();
  insert into public.price_confirms(price_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  select count(*) into n from public.price_confirms where price_id = p_id;
  select count(*) into w from public.price_flags where price_id = p_id;
  perform set_config('app.bypass_price_guard', 'on', true);
  update public.prices set confirms = n, wrong = w where id = p_id;
  perform set_config('app.bypass_price_guard', 'off', true);
  return n;
end $$;
create or replace function public.vote_price(p_id uuid, p_vote int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c int; w int; pr record;
begin
  if auth.uid() is null then return null; end if;
  if not public.not_banned() then return jsonb_build_object('error', 'banned'); end if;
  select id, by_id, confirms, wrong into pr from public.prices where id = p_id for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if pr.by_id = auth.uid() then
    return jsonb_build_object('ok', pr.confirms, 'wrong', pr.wrong, 'own', true);
  end if;
  if p_vote > 0 then
    delete from public.price_flags where price_id = p_id and user_id = auth.uid();
    insert into public.price_confirms(price_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  else
    delete from public.price_confirms where price_id = p_id and user_id = auth.uid();
    insert into public.price_flags(price_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  end if;
  select count(*) into c from public.price_confirms where price_id = p_id;
  select count(*) into w from public.price_flags where price_id = p_id;
  perform set_config('app.bypass_price_guard', 'on', true);
  update public.prices set confirms = c, wrong = w where id = p_id;
  perform set_config('app.bypass_price_guard', 'off', true);
  return jsonb_build_object('ok', c, 'wrong', w, 'mine', case when p_vote > 0 then 1 else -1 end);
end $$;
revoke all on function public.confirm_price(uuid) from public, anon;
revoke all on function public.vote_price(uuid, int) from public, anon;
grant execute on function public.confirm_price(uuid), public.vote_price(uuid, int) to authenticated;

-- ---------- 9. התראות: מכשיר של משתמש אחר עובר רק אם המפתחות זהים (אותו דפדפן) ----------
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_ua text) returns text
language plpgsql security definer set search_path = public as $$
declare host text := lower(substring(coalesce(p_endpoint, '') from '^https://([^/:?#@]+)(?::443)?(?:[/?#]|$)')); ex public.push_subs;
begin
  if auth.uid() is null then return 'forbidden'; end if;
  if host is null or char_length(p_endpoint) > 1000
     or host !~ '(^|\.)(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|notify\.windows\.com|web\.push\.apple\.com|push\.apple\.com)$'
     or p_endpoint ~ '[\s"''<>]' then return 'bad'; end if;
  select * into ex from public.push_subs where endpoint = p_endpoint for update;
  if found and ex.user_id <> auth.uid() then
    if ex.p256dh is distinct from left(p_p256dh, 200) or ex.auth_key is distinct from left(p_auth, 100) then return 'bad'; end if;
    delete from public.push_subs where endpoint = p_endpoint and user_id = ex.user_id;
  end if;
  delete from public.push_subs where endpoint = p_endpoint and user_id = auth.uid();
  insert into public.push_subs(endpoint, user_id, p256dh, auth_key, ua) values (p_endpoint, auth.uid(), left(p_p256dh, 200), left(p_auth, 100), left(coalesce(p_ua, ''), 200));
  delete from public.push_subs where user_id = auth.uid() and endpoint in (
    select endpoint from public.push_subs where user_id = auth.uid() order by created_at desc, endpoint offset 10);
  insert into public.push_prefs(user_id) values (auth.uid()) on conflict do nothing;
  return 'ok';
end $$;
revoke all on function public.push_subscribe(text, text, text, text) from public, anon;
grant execute on function public.push_subscribe(text, text, text, text) to authenticated;

-- ---------- 10. בעל עסק מושעה/חסום — מאבד גישה לניהול העסק ----------
create or replace function public.manages(p_chain text) returns boolean
language sql stable security definer set search_path = public as $$
  select (public.is_admin() or exists (select 1 from public.store_managers m where m.user_id = auth.uid() and m.chain = p_chain))
         and public.not_banned();
$$;
revoke all on function public.manages(text) from public, anon;
grant execute on function public.manages(text) to authenticated;

-- ---------- 11. הוספת צוות / בעל עסק לפי מייל — רק למייל מאומת ----------
create or replace function public.staff_add(p_email text, p_role text) returns text
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not public.is_owner() then return 'forbidden'; end if;
  if p_role not in ('admin','moderator') then return 'bad_role'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email)) and email_confirmed_at is not null limit 1;
  if uid is null then return 'not_found'; end if;
  if uid = auth.uid() then return 'owner'; end if;
  insert into public.staff(user_id, role) values (uid, p_role)
  on conflict (user_id) do update set role = excluded.role;
  return 'ok';
end $$;
create or replace function public.store_manager_set(p_email text, p_chain text, p_branch text, p_title text, p_auto boolean) returns text
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not public.is_admin() then return 'forbidden'; end if;
  if coalesce(trim(p_chain),'') = '' then return 'bad_chain'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email)) and email_confirmed_at is not null limit 1;
  if uid is null then return 'not_found'; end if;
  insert into public.store_managers(user_id, chain, branch, title, auto_approve)
  values (uid, trim(p_chain), coalesce(trim(p_branch),''), case when p_title = 'owner' then 'owner' else 'manager' end, coalesce(p_auto,false))
  on conflict (user_id) do update set chain = excluded.chain, branch = excluded.branch, title = excluded.title, auto_approve = excluded.auto_approve;
  return 'ok';
end $$;

-- ---------- 12. הרשמה ישירה (בלי auth-guard) נחסמת תמיד — גם לפני שהפונקציה רצה פעם ראשונה ----------
insert into public.auth_secret(id) values (1) on conflict (id) do nothing;
update public.auth_secret set guard_seen_at = coalesce(guard_seen_at, now()) where id = 1;
create or replace function public.auth_users_guard() returns trigger
language plpgsql security definer set search_path = public, extensions, auth as $$
declare prov text := coalesce(new.raw_app_meta_data->>'provider', 'email'); s public.auth_secret; mark text;
begin
  mark := coalesce(new.raw_user_meta_data->>'guard', '');
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'guard' - 'role' - 'is_admin' - 'staff';
  if coalesce(new.is_anonymous, false) or prov not in ('email', 'phone') then return new; end if;
  select * into s from public.auth_secret where id = 1;
  if not found then
    -- אין סוד עדיין: יוצרים אותו (auth-guard קורא את אותו pepper מאותה שורה)
    insert into public.auth_secret(id, guard_seen_at) values (1, now()) on conflict (id) do nothing;
    select * into s from public.auth_secret where id = 1;
  end if;
  if public.auth_email_blocked(new.email) then raise exception 'signup_blocked_domain'; end if;
  if exists (select 1 from auth.users ou where lower(ou.email) = lower(coalesce(new.email, '')) and ou.id is distinct from new.id and public.yam_owner_match(ou.email, ou.raw_app_meta_data)) then raise exception 'signup_blocked_owner'; end if;
  if mark = '' or mark <> encode(extensions.hmac(lower(coalesce(new.email, '')), s.pepper, 'sha256'), 'hex') then
    raise exception 'signup_via_site_only';
  end if;
  return new;
end $$;

-- ---------- 13+14. שינוי מייל (אותם כללים כמו בהרשמה) ושינוי סיסמה (רק באישור חד-פעמי מ-auth-guard) ----------
-- auth-guard מוסיף שורה ל-auth_pw_allow (תוקף 2 דקות) רגע לפני כל updateUserById שמשנה סיסמה.
-- מפסק חירום: site_config 'security' → "pw_guard": false
create table if not exists public.auth_pw_allow (
  user_id uuid primary key,
  until timestamptz not null
);
alter table public.auth_pw_allow enable row level security;
revoke all on public.auth_pw_allow from anon, authenticated;
grant select, insert, update, delete on public.auth_pw_allow to service_role;
create or replace function public.auth_users_update_guard() returns trigger
language plpgsql security definer set search_path = public, extensions, auth as $$
declare o jsonb := to_jsonb(old); n jsonb := to_jsonb(new); em text; u timestamptz;
begin
  -- מייל חדש (או מייל שממתין לאישור ב-email_change): דומיינים חסומים ומיילי הבעלים — אסור
  if coalesce(n->>'deleted_at', '') = '' then
    foreach em in array array[
        case when lower(coalesce(new.email, '')) is distinct from lower(coalesce(old.email, '')) then new.email end,
        case when coalesce(n->>'email_change', '') <> '' and (n->>'email_change') is distinct from (o->>'email_change') then n->>'email_change' end] loop
      if coalesce(em, '') <> '' then
        if public.auth_email_blocked(em) then raise exception 'signup_blocked_domain' using errcode = '42501'; end if;
        if exists (select 1 from auth.users ou where lower(ou.email) = lower(trim(em)) and ou.id is distinct from new.id and public.yam_owner_match(ou.email, ou.raw_app_meta_data)) then raise exception 'signup_blocked_owner' using errcode = '42501'; end if;
      end if;
    end loop;
  end if;
  -- סיסמה חדשה
  if (n->>'encrypted_password') is distinct from (o->>'encrypted_password') and coalesce(n->>'encrypted_password', '') <> ''
     and coalesce((select value->>'pw_guard' from public.site_config where key = 'security'), '') <> 'false' then
    delete from public.auth_pw_allow where user_id = new.id returning until into u;
    if u is null or u <= now() then raise exception 'password change not allowed' using errcode = '42501'; end if;
  end if;
  if random() < 0.02 then delete from public.auth_pw_allow where until < now() - interval '1 day'; end if;
  return new;
end $$;
drop trigger if exists auth_users_update_guard on auth.users;
create trigger auth_users_update_guard before update on auth.users for each row execute function public.auth_users_update_guard();

-- ---------- 15. פרטיות: אורחים (anon) לא רואים מי כתב חוות דעת / המלצה ----------
-- (מתכונים ותגובות למתכונים: האתר משתמש ב-author_id / user_id כדי לסמן "שלי" — לכן לא נחסם שם)
do $$
declare t text; cols text;
begin
  foreach t in array array['site_reviews','store_recs'] loop
    select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
    from information_schema.columns where table_schema = 'public' and table_name = t and column_name <> 'user_id';
    execute format('revoke select on public.%I from anon', t);
    execute format('revoke select (user_id) on public.%I from anon', t);
    execute format('grant select (%s) on public.%I to anon', cols, t);
  end loop;
end $$;

-- ---------- 16. מחיר ממשתמש רגיל: בלי קישור למלאי / למקור אוטומטי; מבצע ממתין לאישור ----------
create or replace function public.prices_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare sm public.store_managers%rowtype;
begin
  if current_setting('app.bypass_price_guard', true) = 'on' then return new; end if;
  if auth.uid() is null then return new; end if; -- עריכה ישירה מלוח הבקרה / שרת
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if public.is_staff() then return new; end if;
    new.confirms := old.confirms; new.wrong := old.wrong; new.by_id := old.by_id; new.created_at := old.created_at; new.chain := old.chain;
    new.inv_id := old.inv_id; new.source_id := old.source_id;
    if new.price is distinct from old.price or new.product is distinct from old.product or new.product_key is distinct from old.product_key
       or new.branch is distinct from old.branch or new.currency is distinct from old.currency or new.barcode is distinct from old.barcode then
      new.confirms := 0; new.wrong := 0;
      delete from public.price_confirms where price_id = old.id;
      delete from public.price_flags where price_id = old.id;
    end if;
  else
    if public.is_staff() then return new; end if;
    new.confirms := 0; new.wrong := 0; new.by_id := auth.uid(); new.updated_at := null;
    new.inv_id := null; new.source_id := null;
  end if;
  select * into sm from public.store_managers
   where user_id = auth.uid() and chain = new.chain and (branch = '' or branch = new.branch);
  if found then
    new.verified := true;
    new.status := case when sm.auto_approve then 'approved' else 'pending' end;
  else
    new.verified := false;
    new.status := case when coalesce(new.is_deal, false) or coalesce(new.deal_text, '') <> '' or new.regular_price is not null
                       then 'pending' else 'approved' end;
  end if;
  return new;
end $$;

-- ---------- 17. מטבע: תמיד 3 אותיות גדולות (גם במסדים ישנים); אימוג'י של מוצר בלי תווי HTML ----------
update public.prices set currency = 'ILS' where currency is null or currency !~ '^[A-Z]{3}$';
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.prices'::regclass and contype = 'c'
                 and pg_get_constraintdef(oid) like '%currency%[A-Z]{3}%') then
    alter table public.prices add constraint prices_currency_chk check (currency ~ '^[A-Z]{3}$') not valid;
  end if;
end $$;
update public.products set emoji = '' where emoji ~ '[<>&"]';
do $$ begin
  alter table public.products add constraint products_emoji_safe_chk check (char_length(emoji) <= 16 and emoji !~ '[<>&"]') not valid;
exception when duplicate_object then null; end $$;

-- v21: התראות למנהל
-- כל 15 דקות בודקים את השעה האחרונה. כשמשהו נראה חריג — כל המנהלים מקבלים התראה (פוש), לכל סוג לכל היותר פעם ב-6 שעות.
--   (א) כניסות כושלות + חסימות זמניות   (ב) הרשמות שנחסמו   (ג) תקלות אצל משתמשים
--   (ד) הרבה כתובות IP שונות מנסות להיכנס לאותו מייל (גניבת סיסמאות)   (ה) כתובת IP אחת מנסה הרבה מיילים שונים
-- את הספים אפשר לשנות ב-site_config 'security' (0 = בלי הבדיקה הזו; alerts_off=true מכבה הכל):
--   alert_login_fail 30, alert_signup_blocked 20, alert_errors 50, alert_stuffing_ips 10, alert_spray_emails 15, alert_every_hours 6
--   (ז) alert_error_devices 3: אותה תקלה בדיוק קרתה ב-24 השעות האחרונות ב-3 מכשירים שונים או יותר — התראה נפרדת לכל תקלה
--       (לכל היותר פעם ב-3 ימים לאותה תקלה), עם גרסת האפליקציה ודגמי הטלפון. כך מגלים תקלה לפני שמשתמש מתלונן. 0 = בלי.
--   (ו) alert_scrape 1: התראה נפרדת על כל כתובת שנראית כמו העתקה של המחירים (ניקוד 3 ומעלה ב-scrape_watch),
--       עם מיקום, ספק וחשבון אם ידוע. 0 = בלי.
create table if not exists public.admin_alerts_sent (
  kind text primary key,
  sent_at timestamptz not null default now(),
  n int not null default 0
);
alter table public.admin_alerts_sent enable row level security;
revoke all on public.admin_alerts_sent from public, anon, authenticated;

create or replace function public.admin_alerts_check() returns int
language plpgsql security definer set search_path = public as $$
declare
  c jsonb := coalesce((select value from public.site_config where key = 'security'), '{}'::jsonb);
  every interval;
  since timestamptz := now() - interval '1 hour';
  sent int := 0;
  a record; r record;
  lim_login int; lim_signup int; lim_err int; lim_ips int; lim_spray int; lim_scrape int; lim_dev int;
begin
  if coalesce(c->>'alerts_off', '') = 'true' then return 0; end if;
  -- ספים (מספר לא תקין → ברירת המחדל)
  lim_login  := case when coalesce(c->>'alert_login_fail', '')     ~ '^\d{1,6}$' then (c->>'alert_login_fail')::int     else 30 end;
  lim_signup := case when coalesce(c->>'alert_signup_blocked', '') ~ '^\d{1,6}$' then (c->>'alert_signup_blocked')::int else 20 end;
  lim_err    := case when coalesce(c->>'alert_errors', '')         ~ '^\d{1,6}$' then (c->>'alert_errors')::int         else 50 end;
  lim_ips    := case when coalesce(c->>'alert_stuffing_ips', '')   ~ '^\d{1,6}$' then (c->>'alert_stuffing_ips')::int   else 10 end;
  lim_spray  := case when coalesce(c->>'alert_spray_emails', '')   ~ '^\d{1,6}$' then (c->>'alert_spray_emails')::int   else 15 end;
  lim_scrape := case when coalesce(c->>'alert_scrape', '')         ~ '^\d{1,6}$' then (c->>'alert_scrape')::int         else 1 end;
  lim_dev    := case when coalesce(c->>'alert_error_devices', '')  ~ '^\d{1,6}$' then (c->>'alert_error_devices')::int  else 3 end;
  every := make_interval(hours => case when coalesce(c->>'alert_every_hours', '') ~ '^\d{1,3}$' then greatest(1, least(168, (c->>'alert_every_hours')::int)) else 6 end);

  for r in
    select 'login_fail'::text k, lim_login lim,
           (select count(*)::int from public.auth_events where kind in ('login_fail','login_locked') and created_at > since) cnt,
           (select count(*)::int from public.auth_events where kind = 'login_locked' and created_at > since) extra, ''::text info,
           '/#admin-security'::text url
    union all
    select 'signup_blocked', lim_signup,
           (select count(*)::int from public.auth_events where kind = 'signup_blocked' and created_at > since), 0, '', '/#admin-security'
    union all
    select 'errors', lim_err,
           (select count(*)::int from public.client_errors where created_at > since), 0, '', '/#admin-errors'
    union all
    (select 'stuffing', lim_ips, count(distinct e.ip)::int, 0, e.email, '/#admin-security'
       from public.auth_events e where e.kind in ('login_fail','login_locked') and e.created_at > since and e.email <> '' and e.ip <> ''
       group by e.email order by count(distinct e.ip) desc limit 1)
    union all
    (select 'spray', lim_spray, count(distinct e.email)::int, 0, e.ip, '/#admin-security'
       from public.auth_events e where e.kind in ('login_fail','login_locked') and e.created_at > since and e.email <> '' and e.ip <> ''
       group by e.ip order by count(distinct e.email) desc limit 1)
    union all
    (select 'scrape:' || w.ip, lim_scrape, 1, w.n,
            public.scrape_summary(w.ip), '/#admin-scrapers'
       from public.scrape_watch w where w.ip <> '*' and not w.own and w.score >= 3 and w.updated_at > since and w.day >= current_date - 1
       order by w.score desc, w.n desc limit 5)
    union all
    -- (ז) אותה תקלה בכמה מכשירים שונים (מכשיר = משתמש מחובר, או מזהה המכשיר האנונימי, או ה-User-Agent)
    (select 'err:' || left(md5(e.msg || '|' || e.src), 12), lim_dev,
            count(distinct coalesce(e.user_id::text, nullif(e.dev, ''), e.ua))::int, count(*)::int,
            left(e.msg, 140)
              || coalesce(' · אפליקציה ' || string_agg(distinct nullif(e.app_ver, ''), ', '), ' · באתר')
              || coalesce(' · ' || left(string_agg(distinct nullif(e.device, ''), ', '), 120), ''),
            '/#admin-errors'
       from public.client_errors e where e.created_at > now() - interval '24 hours' and e.ver <> 'collector'
       group by e.msg, e.src order by 3 desc limit 3)
  loop
    continue when r.lim <= 0 or r.cnt < r.lim;
    continue when exists (select 1 from public.admin_alerts_sent s where s.kind = r.k
                           and s.sent_at > now() - case when r.k like 'err:%' then interval '3 days' else every end);
    insert into public.admin_alerts_sent(kind, sent_at, n) values (r.k, now(), r.cnt)
      on conflict (kind) do update set sent_at = excluded.sent_at, n = excluded.n;
    for a in select distinct id from public.admin_ids() id loop
      perform public.push_enqueue(a.id, 'staff',
        case when r.k like 'scrape:%' then '🕵️ מעתיקים מחירים: ' || substr(r.k, 8) || ' (' || r.extra || ' בקשות)'
             when r.k like 'err:%' then '🐞 אותה תקלה ב-' || r.cnt || ' מכשירים שונים (24 שעות)' else
        case r.k
          when 'login_fail'     then '⚠️ ' || r.cnt || ' ניסיונות כניסה כושלים בשעה האחרונה'
          when 'signup_blocked' then '⚠️ ' || r.cnt || ' הרשמות נחסמו בשעה האחרונה'
          when 'errors'         then '🐞 ' || r.cnt || ' תקלות אצל משתמשים בשעה האחרונה'
          when 'stuffing'       then '⚠️ ' || r.cnt || ' כתובות IP שונות ניסו להיכנס לאותו מייל'
          when 'scrape'         then '🕵️ ' || r.cnt || ' כתובות נראות כמו העתקה של המחירים'
          else                       '⚠️ IP אחד ניסה להיכנס ל-' || r.cnt || ' מיילים שונים'
        end end,
        case when r.k like 'scrape:%' then left(r.info, 300)
             when r.k like 'err:%' then left(r.info, 300) || ' — כדאי להציץ ביומן התקלות לפני שמשתמשים יתלוננו.' else
        case r.k
          when 'login_fail'     then case when r.extra > 0 then 'מתוכם ' || r.extra || ' חסימות זמניות. ' else '' end || 'כדאי להציץ ביומן האבטחה.'
          when 'signup_blocked' then 'אולי בוט מנסה להירשם. כדאי להציץ ביומן האבטחה.'
          when 'errors'         then 'משהו כנראה נשבר באתר. כדאי להציץ ביומן התקלות.'
          when 'stuffing'       then 'המייל: ' || left(r.info, 80) || ' — ייתכן ניסיון לנחש סיסמה.'
          when 'scrape'         then r.extra || ' בקשות לשרת המחירים, למשל מ-' || left(r.info, 60) || '. אפשר לחסום בבק אופיס ← 🛡️ בוטים ואבטחה ← 🕵️.'
          else                       'ה-IP: ' || left(r.info, 60) || ' — ייתכן ניסיון לנחש סיסמאות.'
        end end,
        r.url, 'alert:' || r.k);
    end loop;
    sent := sent + 1;
  end loop;

  -- (ח) 🛰️ שרת המחירים הפסיק לדווח (נובמבר 2026). השרת מדווח בכל ריצה (כל שעה 07:15–23:15 ו-05:30, וגם בשבת כשהוא מושהה),
  -- אז 7 שעות בלי דיווח (יותר מהפער של הלילה) = השרת נפל או נתקע. התראה לכל היותר פעם ב-every
  if coalesce(c->>'alert_collector_off', '') <> 'true' then
    select s.last_run into r from public.collector_status s where s.chain = '_server';
    if found and r.last_run is not null and r.last_run < now() - interval '7 hours'
       and not exists (select 1 from public.admin_alerts_sent x where x.kind = 'collector_down' and x.sent_at > now() - every) then
      insert into public.admin_alerts_sent(kind, sent_at, n) values ('collector_down', now(), 1)
        on conflict (kind) do update set sent_at = excluded.sent_at, n = excluded.n;
      for a in select distinct id from public.admin_ids() id loop
        perform public.push_enqueue(a.id, 'staff', '🛰️ שרת המחירים לא דיווח ' || floor(extract(epoch from now() - r.last_run) / 3600)::int || ' שעות',
          'ייתכן שהשרת נפל או נתקע, והמחירים באתר לא מתעדכנים. כדאי להיכנס לשרת (sl-update / systemctl status) ולבדוק.',
          '/#admin-prices', 'alert:collector_down');
      end loop;
      sent := sent + 1;
    end if;
  end if;

  -- (ט) 📊 סיכום שבועי לצוות: יום ראשון ב-09:00 (שעון ישראל) — כמה נרשמו, כמה הורידו את האפליקציה וכמה תקלות היו השבוע
  if coalesce(c->>'weekly_summary_off', '') <> 'true'
     and extract(dow from now() at time zone 'Asia/Jerusalem') = 0
     and extract(hour from now() at time zone 'Asia/Jerusalem') = 9
     and not exists (select 1 from public.admin_alerts_sent x where x.kind = 'weekly_summary' and x.sent_at > now() - interval '6 days') then
    select (select count(*)::int from auth.users u where u.created_at > now() - interval '7 days') users,
           (select count(*)::int from public.apk_downloads d where d.kind = 'download' and d.at > now() - interval '7 days') dl,
           (select count(*)::int from public.client_errors e where e.created_at > now() - interval '7 days' and e.ver <> 'collector') errs
      into r;
    insert into public.admin_alerts_sent(kind, sent_at, n) values ('weekly_summary', now(), r.users)
      on conflict (kind) do update set sent_at = excluded.sent_at, n = excluded.n;
    for a in select distinct id from public.admin_ids() id loop
      perform public.push_enqueue(a.id, 'staff', '📊 סיכום השבוע ברשימת קניות',
        r.users || ' משתמשים חדשים · ' || r.dl || ' הורדות של האפליקציה · ' || r.errs || ' תקלות. הפירוט בבק אופיס.',
        '/#admin-dash', 'alert:weekly_summary');
    end loop;
    sent := sent + 1;
  end if;
  return sent;
end $$;
revoke all on function public.admin_alerts_check() from public, anon, authenticated;
do $$ begin
  if to_regnamespace('cron') is not null then
    execute $c$select cron.schedule('yam-alerts', '*/15 * * * *', 'select public.admin_alerts_check()')$c$;
  end if;
exception when others then raise notice 'cron alerts: %', sqlerrm; end $$;

-- v23: קרדיט למדווחים
-- מי דיווח / כתב: המנהל (וצוות הפיקוח) תמיד רואים. לשאר — רק אם הוחלט להציג:
--   * ברירת מחדל לכל סוג תוכן: site_config 'credits' → {"prices":false,"recipes":false,"torah":false,"reviews":false,"clothing":false}
--   * לכל פריט בנפרד: show_author — null = לפי ברירת המחדל, true = מציגים את השם, false = מסתירים. רק מנהל (is_admin) משנה.
-- השמות עצמם (by_name / author_name) כבר לא נקראים ישירות מהטבלאות — רק דרך credit_names(), שמחזירה שם רק כשמותר.
-- ⚠️ עמודה חדשה שתתווסף בעתיד לאחת הטבלאות כאן — צריך להריץ שוב את הבלוק הזה (הוא נותן הרשאת קריאה לכל העמודות חוץ מהשם).
alter table public.prices         add column if not exists show_author boolean;
alter table public.recipes        add column if not exists show_author boolean;
alter table public.divrei_torah   add column if not exists show_author boolean;
alter table public.site_reviews   add column if not exists show_author boolean;
alter table public.store_recs     add column if not exists show_author boolean;
alter table public.clothing_shops add column if not exists show_author boolean;
insert into public.site_config(key, value)
values ('credits', '{"prices":false,"recipes":false,"torah":false,"reviews":false,"clothing":false}'::jsonb)
on conflict (key) do nothing;

-- ברירת המחדל של סוג תוכן (ערך לא תקין → מוסתר)
create or replace function public.credit_default(p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select case when jsonb_typeof(value -> p_key) = 'boolean' then (value ->> p_key)::boolean end
                   from public.site_config where key = 'credits'), false);
$$;

-- רק מנהל משנה את show_author (משתמש רגיל — גם על הפריט של עצמו — לא). שינוי של הקרדיט בלבד לא מסמן את הפריט כ"נערך".
create or replace function public.show_author_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare only_credit boolean := false;
begin
  if tg_op = 'UPDATE' then
    only_credit := new.show_author is distinct from old.show_author
      and (to_jsonb(new) - 'show_author' - 'updated_at') = (to_jsonb(old) - 'show_author' - 'updated_at');
  end if;
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then new.show_author := null; else new.show_author := old.show_author; end if;
  end if;
  if only_credit then
    new := jsonb_populate_record(new, jsonb_build_object('updated_at', to_jsonb(old) -> 'updated_at'));
  end if;
  return new;
end $$;
do $$
declare t text;
begin
  foreach t in array array['prices','recipes','divrei_torah','site_reviews','store_recs','clothing_shops'] loop
    -- השם מתחיל ב-zz כדי לרוץ אחרי שאר ה-guards של הטבלה
    execute format('drop trigger if exists zz_show_author_guard on public.%I', t);
    execute format('create trigger zz_show_author_guard before insert or update on public.%I for each row execute function public.show_author_guard()', t);
  end loop;
end $$;

-- עמודת השם: אין קריאה ישירה (anon / authenticated). כל שאר העמודות — כמו קודם.
-- (חוות דעת והמלצות: אורחים גם לא רואים user_id — כמו בסעיף 15)
do $$
declare r record; cols text; acols text;
begin
  for r in select * from (values ('prices','by_name'), ('recipes','author_name'), ('divrei_torah','author_name'), ('site_reviews','author_name'),
                                 ('store_recs','by_name'), ('store_posts','author_name'), ('bot_knowledge','author_name')) v(t, c) loop
    select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
      from information_schema.columns where table_schema = 'public' and table_name = r.t and column_name <> r.c;
    select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into acols
      from information_schema.columns where table_schema = 'public' and table_name = r.t and column_name <> r.c
       and not (r.t in ('site_reviews','store_recs') and column_name = 'user_id');
    execute format('revoke select on public.%I from anon, authenticated', r.t);
    execute format('revoke select (%I) on public.%I from anon, authenticated', r.c, r.t);
    execute format('grant select (%s) on public.%I to authenticated', cols, r.t);
    execute format('grant select (%s) on public.%I to anon', acols, r.t);
  end loop;
end $$;

-- השמות לפי מזהים. מחזיר {"<id>": {"n": שם, "v": מוצג לכולם?, "s": show_author, "sys": דיווח אוטומטי/של האתר, "u": משתמש (צוות), "e": מייל (מנהל)}}
-- משתמש רגיל: רק פריטים שהוא רשאי לראות (מאושרים או שלו), והשם רק כשהוא מוצג לכולם.
create or replace function public.credit_names(p_kind text, p_ids uuid[]) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  st boolean := public.is_staff(); adm boolean := public.is_admin();
  t text; ucol text; nexpr text; ckey text; sysx text := 'false'; pub boolean := true; need_uid boolean := false; has_sa boolean := true;
  def boolean; res jsonb;
begin
  if p_ids is null or cardinality(p_ids) = 0 then return '{}'::jsonb; end if;
  if cardinality(p_ids) > 500 then p_ids := p_ids[1:500]; end if;
  case p_kind
    when 'prices'   then t := 'prices';         ucol := 'by_id';      nexpr := 'x.by_name';     ckey := 'prices';   need_uid := true; sysx := 'x.by_id is null';
    when 'recipes'  then t := 'recipes';        ucol := 'author_id';  nexpr := 'x.author_name'; ckey := 'recipes';
    when 'torah'    then t := 'divrei_torah';   ucol := 'author_id';  nexpr := 'x.author_name'; ckey := 'torah';    need_uid := true;
    when 'reviews'  then t := 'site_reviews';   ucol := 'user_id';    nexpr := 'x.author_name'; ckey := 'reviews';
    when 'clothing' then t := 'store_recs';     ucol := 'user_id';    nexpr := 'x.by_name';     ckey := 'clothing'; sysx := 'x.official';
    when 'shops'    then t := 'clothing_shops'; ucol := 'created_by'; nexpr := 'null::text';    ckey := 'clothing';
    when 'posts'    then t := 'store_posts';    ucol := 'created_by'; nexpr := 'x.author_name'; pub := false; has_sa := false;
    when 'kb'       then t := 'bot_knowledge';  ucol := 'author_id';  nexpr := 'x.author_name'; pub := false; has_sa := false;
    when 'products' then t := 'products';       ucol := 'created_by'; nexpr := 'null::text';    pub := false; has_sa := false;
    when 'chains'   then t := 'chains';         ucol := 'created_by'; nexpr := 'null::text';    pub := false; has_sa := false;
    when 'branches' then t := 'branches';       ucol := 'created_by'; nexpr := 'null::text';    pub := false; has_sa := false;
    else return '{}'::jsonb;
  end case;
  if not st and (not pub or (need_uid and auth.uid() is null)) then return '{}'::jsonb; end if;
  def := case when ckey is null then false else public.credit_default(ckey) end;
  execute format($q$
    select coalesce(jsonb_object_agg(r.id::text, jsonb_strip_nulls(jsonb_build_object(
             's', r.sa, 'sys', case when r.sys then true end, 'v', r.sys or coalesce(r.sa, $2),
             'n', case when $3 or r.sys or coalesce(r.sa, $2) then nullif(r.nm, '') end,
             'u', case when $3 then r.uid end,
             'e', case when $4 then nullif(r.em, '') end))), '{}'::jsonb)
    from (select x.id, %s as sa, coalesce(%s, false) as sys, x.%I as uid, coalesce(nullif(%s, ''), p.name) as nm, p.email as em
            from public.%I x left join public.profiles p on p.id = x.%I
           where x.id = any($1) and ($3 or x.status = 'approved' or x.%I = auth.uid())) r
  $q$, case when has_sa then 'x.show_author' else 'null::boolean' end, sysx, ucol, nexpr, t, ucol, ucol)
  into res using p_ids, def, st, adm;
  return coalesce(res, '{}'::jsonb);
end $$;
revoke all on function public.credit_names(text, uuid[]) from public;
grant execute on function public.credit_names(text, uuid[]) to anon, authenticated;

-- דברי תורה: השם רק כשמוצג לכולם (הצוות רואה תמיד)
create or replace function public.torah_list(p_limit int default 30) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb) from (
    select jsonb_build_object('id', d.id, 'parasha', d.parasha, 'title', d.title, 'body', d.body, 'source_name', d.source_name,
      'author_name', case when public.is_staff() or coalesce(d.show_author, public.credit_default('torah')) then d.author_name else '' end,
      'created_at', d.created_at,
      'up', (select count(*) from public.torah_reactions r where r.dt_id = d.id and r.value = 1),
      'down', (select count(*) from public.torah_reactions r where r.dt_id = d.id and r.value = -1),
      'mine', (select r.value from public.torah_reactions r where r.dt_id = d.id and r.user_id = auth.uid())) as x
    from public.divrei_torah d where d.status = 'approved' and auth.uid() is not null
    order by d.created_at desc limit least(greatest(coalesce(p_limit, 30), 1), 100)) t;
$$;
grant execute on function public.torah_list(int) to authenticated;

-- דירוג המדווחים: הניקוד לכולם (לתג ליד הדיווח), השם — רק לצוות, לעצמי, או כשדיווחי המחיר מוצגים עם שם
drop function if exists public.reporter_scores();
create or replace function public.reporter_scores() returns table(user_id uuid, name text, reports int, confirms int, bonus int, score int)
language sql stable security definer set search_path = public as $$
  select p.id, case when public.is_staff() or p.id = auth.uid() or public.credit_default('prices') then p.name else '' end,
         count(pr.id)::int, coalesce(sum(pr.confirms),0)::int, p.rep_bonus,
         (count(pr.id) + 2*coalesce(sum(pr.confirms),0) + p.rep_bonus)::int
  from public.profiles p left join public.prices pr on pr.by_id = p.id and pr.status = 'approved'
  where auth.uid() is not null
  group by p.id, p.name, p.rep_bonus
  having count(pr.id) > 0 or p.rep_bonus <> 0
  order by 6 desc limit 500;
$$;

-- התראה על מתכון חדש: "מאת" רק כשהשם מוצג לכולם
create or replace function public.push_on_recipe() returns trigger
language plpgsql security definer set search_path = public as $$
declare f record;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'approved' then
      perform public.push_enqueue(new.author_id, 'recipe', '🎉 המתכון שלך פורסם!', new.name || ' — עכשיו כולם יכולים לראות ולדרג', '/#recipe-' || new.id, 'myrecipe:' || new.id);
      for f in select distinct rf.user_id from public.recipe_follows rf
               where (rf.category = '*' or rf.category = new.category) and rf.user_id is distinct from new.author_id loop
        perform public.push_enqueue(f.user_id, 'recipe', '🍲 מתכון חדש' || case when new.category <> '' then ' ב' || new.category else '' end,
          new.emoji || ' ' || new.name || case when new.author_name <> '' and coalesce(new.show_author, public.credit_default('recipes')) then ' · מאת ' || new.author_name else '' end,
          '/#recipe-' || new.id, 'newrecipe:' || new.id);
      end loop;
    elsif new.status = 'rejected' then
      perform public.push_enqueue(new.author_id, 'recipe', 'לגבי המתכון ששלחת', new.name || ' — לא פורסם הפעם. אפשר לשאול אותנו בצ''אט 🙂', '/#chat', 'myrecipe:' || new.id);
    end if;
  end if;
  return new;
end $$;

-- 📍 עיר של כל משתמש (מה שבחר ב"באיזו עיר אתם גרים?") — לבק אופיס: כמה משתמשים מכל עיר.
-- העיר שמורה ברשימה (rooms.data.me.city). קודם הרשימה של המשתמש עצמו, ואם אין שם עיר — רשימה משותפת שהוא מצטרף אליה.
create or replace function public.admin_user_cities() returns table(user_id uuid, city text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select u.id, coalesce((
    select left(c.city, 40) from public.rooms r
    cross join lateral (select nullif(trim(coalesce(nullif(r.data->'me'->>'city', ''), r.data->'me'->'address'->>'city', '')), '') as city) c
    where c.city is not null
      and (r.owner = u.id or exists (select 1 from public.room_members m where m.room_code = r.code and m.user_id = u.id))
    order by (r.owner = u.id) desc, r.updated_at desc
    limit 1), '')::text
  from auth.users u;
end $$;
revoke all on function public.admin_user_cities() from public, anon;
grant execute on function public.admin_user_cities() to authenticated;

-- 🟢 המונה (כמה מחוברים / כמה משתמשים) — כברירת מחדל רק המנהלים רואים. משתמשים רואים רק אם המנהל סימן בבק אופיס
-- (🎛️ תצוגה ← "להציג למשתמשים כמה מחוברים"). השרת לא מחזיר את המספרים למי שלא אמור לראות — לא רק המסך מסתיר.
create or replace function public.site_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when coalesce((select value->>'statsShown' from public.site_config where key = 'ui'), '') <> 'true' and not public.is_admin()
    then '{}'::jsonb
    else jsonb_build_object('online', (select count(*) from public.profiles where last_seen > now() - interval '5 minutes'),
                            'users', (select count(*) from public.profiles)) end;
$$;
grant execute on function public.site_stats() to anon, authenticated;

-- 💬 הודעות קופצות של יאמי — המנהל כותב בבק אופיס (📣 הודעות למשתמשים) הודעה שקופצת מיאמי לכולם או למשתמש אחד.
-- user_id ריק = לכולם. כל משתמש רואה רק את ההודעות לכולם ואת אלה שנשלחו אליו. כל הודעה קופצת פעם אחת לכל משתמש (נשמר במכשיר).
create table if not exists public.yami_notes (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
create index if not exists yami_notes_user on public.yami_notes (user_id, created_at desc);
alter table public.yami_notes enable row level security;
drop policy if exists "yami notes read" on public.yami_notes;
drop policy if exists "yami notes admin" on public.yami_notes;
create policy "yami notes read" on public.yami_notes for select to authenticated
  using (expires_at > now() and (user_id is null or user_id = auth.uid()));
create policy "yami notes admin" on public.yami_notes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.yami_notes from anon;
grant select, insert, update, delete on public.yami_notes to authenticated;

-- 🏆 המדווחים של החודש: מי דיווח הכי הרבה מחירים שאושרו (ושרוב הקהילה לא סימנה "לא נכון").
-- השם — כמו בדירוג המדווחים: רק לצוות, לעצמי, או כשדיווחי המחיר מוצגים עם שם; אחרת "מדווח/ת" בלי שם.
create or replace function public.reporters_month(p_month date default null) returns table(rank int, name text, reports int, confirms int, is_me boolean)
language sql stable security definer set search_path = public as $$
  with m as (select date_trunc('month', coalesce(p_month, (now() at time zone 'Asia/Jerusalem')::date)::timestamp) at time zone 'Asia/Jerusalem' as s),
  agg as (
    select pr.by_id as uid, count(*)::int as reports, coalesce(sum(pr.confirms), 0)::int as confirms
    from public.prices pr, m
    where pr.status = 'approved' and pr.by_id is not null and pr.wrong <= pr.confirms
      and pr.created_at >= m.s and pr.created_at < m.s + interval '1 month'
    group by pr.by_id),
  ranked as (select a.*, (rank() over (order by a.reports + 2 * a.confirms desc))::int as rk from agg a)
  select r.rk, case when public.is_staff() or r.uid = auth.uid() or public.credit_default('prices') then coalesce(p.name, '') else '' end,
         r.reports, r.confirms, r.uid = auth.uid()
  from ranked r left join public.profiles p on p.id = r.uid
  where auth.uid() is not null and (r.rk <= 10 or r.uid = auth.uid())
  order by r.rk, r.reports desc limit 11;
$$;
revoke all on function public.reporters_month(date) from public, anon;
grant execute on function public.reporters_month(date) to authenticated;

-- 💌 הזמנת חברים: לכל משתמש קוד הזמנה אישי; מי שנרשם דרך הקישור נרשם פעם אחת בלבד כ"הוזמן ע״י".
-- המזמין רואה רק כמה הצטרפו (בלי שמות); מנהלים רואים הכל. מחיקת חשבון מוחקת גם את הרישום.
create table if not exists public.ref_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^[0-9a-f]{8}$'),
  created_at timestamptz not null default now()
);
alter table public.ref_codes enable row level security;
revoke all on public.ref_codes from anon, authenticated;
create table if not exists public.referrals (
  referred uuid primary key references auth.users(id) on delete cascade,
  referrer uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (referred <> referrer)
);
create index if not exists referrals_referrer on public.referrals (referrer);
alter table public.referrals enable row level security;
drop policy if exists "referrals admin read" on public.referrals;
create policy "referrals admin read" on public.referrals for select to authenticated using (public.is_admin());
revoke all on public.referrals from anon, authenticated;
grant select on public.referrals to authenticated;
create or replace function public.my_ref_code() returns text
language plpgsql volatile security definer set search_path = public as $$
declare c text;
begin
  if auth.uid() is null then return null; end if;
  select code into c from public.ref_codes where user_id = auth.uid();
  while c is null loop
    c := substr(md5(gen_random_uuid()::text), 1, 8);
    begin insert into public.ref_codes(user_id, code) values (auth.uid(), c);
    exception when unique_violation then select code into c from public.ref_codes where user_id = auth.uid(); end;
  end loop;
  return c;
end $$;
revoke all on function public.my_ref_code() from public, anon;
grant execute on function public.my_ref_code() to authenticated;
-- נרשמים דרך קישור: רק חשבון חדש (עד יומיים), פעם אחת, ולא לעצמי
create or replace function public.referral_claim(p_code text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare r uuid; me uuid := auth.uid();
begin
  if me is null or coalesce(p_code, '') !~ '^[0-9a-f]{8}$' then return false; end if;
  if not exists (select 1 from auth.users u where u.id = me and u.created_at > now() - interval '2 days') then return false; end if;
  select user_id into r from public.ref_codes where code = p_code;
  if r is null or r = me then return false; end if;
  insert into public.referrals(referred, referrer) values (me, r) on conflict do nothing;
  return found;
end $$;
revoke all on function public.referral_claim(text) from public, anon;
grant execute on function public.referral_claim(text) to authenticated;
create or replace function public.my_referrals() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.referrals where referrer = auth.uid();
$$;
revoke all on function public.my_referrals() from public, anon;
grant execute on function public.my_referrals() to authenticated;
-- בבק אופיס (מנהלים בלבד): מי נרשם, מתי, ודרך מי
create or replace function public.admin_referrals() returns table(created_at timestamptz, referred_name text, referred_email text, referrer_id uuid, referrer_name text, referrer_email text)
language sql stable security definer set search_path = public, auth as $$
  select r.created_at, coalesce(p1.name, ''), coalesce(u1.email, ''), r.referrer, coalesce(p2.name, ''), coalesce(u2.email, '')
  from public.referrals r
  left join public.profiles p1 on p1.id = r.referred left join auth.users u1 on u1.id = r.referred
  left join public.profiles p2 on p2.id = r.referrer left join auth.users u2 on u2.id = r.referrer
  where public.is_admin()
  order by r.created_at desc limit 2000;
$$;
revoke all on function public.admin_referrals() from public, anon;
grant execute on function public.admin_referrals() to authenticated;

-- 👀 ניסיון בלי הרשמה — מעקב אנונימי: מזהה אקראי של המכשיר בלבד (בלי שם, מייל או כתובת IP).
-- רואים בבק אופיס כמה ניסו, כמה חזרו, וכמה נרשמו אחר כך (ורק אצל מי שנרשם — מי הוא).
create table if not exists public.guest_visits (
  id uuid primary key,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  visits int not null default 1,
  converted_user uuid references auth.users(id) on delete set null,
  converted_at timestamptz
);
create index if not exists guest_visits_first on public.guest_visits (first_at desc);
alter table public.guest_visits enable row level security;
revoke all on public.guest_visits from anon, authenticated;
create or replace function public.guest_ping(p_id uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if p_id is null then return; end if;
  if exists (select 1 from public.guest_visits where id = p_id) then
    update public.guest_visits set last_at = now(), visits = visits + 1 where id = p_id and last_at < now() - interval '30 minutes';
  elsif (select count(*) from public.guest_visits where first_at > now() - interval '1 hour') < 300 then
    insert into public.guest_visits(id) values (p_id) on conflict do nothing;
  end if;
end $$;
revoke all on function public.guest_ping(uuid) from public;
grant execute on function public.guest_ping(uuid) to anon, authenticated;
create or replace function public.guest_converted(p_id uuid) returns boolean
language plpgsql volatile security definer set search_path = public as $$
begin
  if auth.uid() is null or p_id is null then return false; end if;
  update public.guest_visits set converted_user = auth.uid(), converted_at = now() where id = p_id and converted_user is null;
  return found;
end $$;
revoke all on function public.guest_converted(uuid) from public, anon;
grant execute on function public.guest_converted(uuid) to authenticated;
create or replace function public.admin_guest_stats() returns jsonb
language sql stable security definer set search_path = public, auth as $$
  select case when not public.is_admin() then null else jsonb_build_object(
    'total', (select count(*) from public.guest_visits),
    'd7', (select count(*) from public.guest_visits where first_at > now() - interval '7 days'),
    'd30', (select count(*) from public.guest_visits where first_at > now() - interval '30 days'),
    'returned', (select count(*) from public.guest_visits where visits > 1),
    'converted', (select count(*) from public.guest_visits where converted_user is not null),
    'list', coalesce((select jsonb_agg(x order by x->>'converted_at' desc) from (
        select jsonb_build_object('first_at', g.first_at, 'converted_at', g.converted_at, 'visits', g.visits,
          'name', coalesce(p.name, ''), 'email', coalesce(u.email, '')) x
        from public.guest_visits g left join public.profiles p on p.id = g.converted_user left join auth.users u on u.id = g.converted_user
        where g.converted_user is not null order by g.converted_at desc limit 500) t), '[]'::jsonb)) end;
$$;
revoke all on function public.admin_guest_stats() from public, anon;
grant execute on function public.admin_guest_stats() to authenticated;

-- 📣 מאיפה הגיעו המבקרים — כדי לדעת איזה פרסום עובד (וואטסאפ, מודעת QR, גוגל...).
-- נספר רק מקור + יום (בלי מזהה, שם, מייל או IP): כל מכשיר נספר פעם אחת, בביקור הראשון שלו.
-- המקור מגיע מ-?src= בקישור, או מהאתר שממנו הגיעו (google, facebook...), או direct.
create table if not exists public.visit_sources (
  day date not null default current_date,
  src text not null,
  n int not null default 0,
  primary key (day, src)
);
alter table public.visit_sources enable row level security;
revoke all on public.visit_sources from anon, authenticated;
-- מי נרשם ומאיזה מקור הגיע (פעם אחת לכל משתמש)
create table if not exists public.visit_signups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  src text not null,
  at timestamptz not null default now()
);
alter table public.visit_signups enable row level security;
revoke all on public.visit_signups from anon, authenticated;
create or replace function public.visit_src_clean(p_src text) returns text
language sql immutable set search_path = public as $$
  select case when lower(coalesce(p_src, '')) ~ '^[a-z0-9._-]{1,40}$' then lower(p_src) end;
$$;
create or replace function public.visit_src(p_src text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare s text := public.visit_src_clean(p_src);
begin
  if s is null then return; end if;
  -- שלא יציפו: עד 200 מקורות שונים ביום ועד 5000 ספירות למקור ביום
  if not exists (select 1 from public.visit_sources where day = current_date and src = s)
     and (select count(*) from public.visit_sources where day = current_date) >= 200 then return; end if;
  insert into public.visit_sources(day, src, n) values (current_date, s, 1)
  on conflict (day, src) do update set n = public.visit_sources.n + 1 where public.visit_sources.n < 5000;
end $$;
revoke all on function public.visit_src(text) from public;
grant execute on function public.visit_src(text) to anon, authenticated;
create or replace function public.visit_src_signup(p_src text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare s text := public.visit_src_clean(p_src);
begin
  if auth.uid() is null or s is null then return false; end if;
  insert into public.visit_signups(user_id, src) values (auth.uid(), s) on conflict do nothing;
  return found;
end $$;
revoke all on function public.visit_src_signup(text) from public, anon;
grant execute on function public.visit_src_signup(text) to authenticated;

-- 📤 קישורי שיתוף אישיים ("שתפו אותי" בראש המסך): כל שיתוף מקבל קישור משלו (?s=), ונשמר מי שיתף ואיפה —
-- וואטסאפ (קבוצה / סטטוס / אדם אחד), מייל, SMS, העתקה... בבק אופיס רואים כמה נכנסו דרך כל קישור, ומי נרשם או התחבר דרכו.
-- כניסות נספרות לפי מזהה אקראי של המכשיר בלבד (בלי שם, מייל או IP). רק מי שהתחבר נרשם בשמו.
create table if not exists public.share_links (
  token text primary key check (token ~ '^[0-9a-z]{10}$'),
  sharer uuid references auth.users(id) on delete set null,
  device uuid,
  channel text not null check (channel ~ '^[a-z]{1,12}$'),
  place text not null default '' check (char_length(place) <= 80),
  created_at timestamptz not null default now()
);
create index if not exists share_links_created on public.share_links (created_at desc);
alter table public.share_links enable row level security;
revoke all on public.share_links from anon, authenticated;
create table if not exists public.share_visits (
  token text not null references public.share_links(token) on delete cascade,
  device uuid not null,
  at timestamptz not null default now(),
  primary key (token, device)
);
alter table public.share_visits enable row level security;
revoke all on public.share_visits from anon, authenticated;
create table if not exists public.share_joins (
  token text not null references public.share_links(token) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_new boolean not null default false,
  at timestamptz not null default now(),
  primary key (token, user_id)
);
alter table public.share_joins enable row level security;
revoke all on public.share_joins from anon, authenticated;
-- יצירת קישור: גם אורח (בלי חשבון) יכול לשתף. שלא יציפו: עד 300 קישורים ביום לכל משתמש/מכשיר, ועד 3000 ביום מאורחים
create or replace function public.share_link_create(p_token text, p_channel text, p_place text default '', p_device uuid default null) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if coalesce(p_token, '') !~ '^[0-9a-z]{10}$' or coalesce(p_channel, '') !~ '^[a-z]{1,12}$' then return false; end if;
  if me is null and p_device is null then return false; end if;
  if (select count(*) from public.share_links where created_at > now() - interval '1 day'
      and (case when me is not null then sharer = me else sharer is null and device = p_device end)) >= 300 then return false; end if;
  if me is null and (select count(*) from public.share_links where sharer is null and created_at > now() - interval '1 day') >= 3000 then return false; end if;
  insert into public.share_links(token, sharer, device, channel, place)
    values (p_token, me, p_device, p_channel, left(btrim(regexp_replace(coalesce(p_place, ''), '[[:cntrl:]]', ' ', 'g')), 80))
    on conflict do nothing;
  return found;
end $$;
revoke all on function public.share_link_create(text, text, text, uuid) from public;
grant execute on function public.share_link_create(text, text, text, uuid) to anon, authenticated;
-- נכנסו דרך הקישור: כל מכשיר נספר פעם אחת לכל קישור (עד 5000 לקישור)
create or replace function public.share_visit(p_token text, p_device uuid) returns boolean
language plpgsql volatile security definer set search_path = public as $$
begin
  if coalesce(p_token, '') !~ '^[0-9a-z]{10}$' or p_device is null then return false; end if;
  if not exists (select 1 from public.share_links where token = p_token) then return false; end if;
  if (select count(*) from public.share_visits where token = p_token) >= 5000 then return false; end if;
  insert into public.share_visits(token, device) values (p_token, p_device) on conflict do nothing;
  return found;
end $$;
revoke all on function public.share_visit(text, uuid) from public;
grant execute on function public.share_visit(text, uuid) to anon, authenticated;
-- מי שהתחבר אחרי שנכנס דרך קישור: נרשם פעם אחת לכל קישור (חדש = חשבון שנפתח ביומיים האחרונים).
-- חשבון חדש נספר גם ב"הזמנת חברים" של מי ששיתף (תג שגריר), כמו בקישור ?ref=
create or replace function public.share_join(p_token text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); s uuid; fresh boolean;
begin
  if me is null or coalesce(p_token, '') !~ '^[0-9a-z]{10}$' then return false; end if;
  select sharer into s from public.share_links where token = p_token;
  if not found or s = me then return false; end if;
  fresh := exists (select 1 from auth.users u where u.id = me and u.created_at > now() - interval '2 days');
  insert into public.share_joins(token, user_id, is_new) values (p_token, me, fresh) on conflict do nothing;
  if not found then return false; end if;
  if fresh and s is not null then insert into public.referrals(referred, referrer) values (me, s) on conflict do nothing; end if;
  return true;
end $$;
revoke all on function public.share_join(text) from public, anon;
grant execute on function public.share_join(text) to authenticated;
-- בבק אופיס (מנהלים בלבד): כל הקישורים — מי שיתף, איפה, כמה נכנסו, ומי התחבר דרכם
create or replace function public.admin_share_links(p_days int default 90) returns jsonb
language sql stable security definer set search_path = public, auth as $$
  select case when not public.is_admin() then null else coalesce((
    select jsonb_agg(x order by x->>'at' desc) from (
      select jsonb_build_object('token', l.token, 'at', l.created_at, 'channel', l.channel, 'place', l.place,
        'sharer', l.sharer, 'device', left(coalesce(l.device::text, ''), 4),
        'name', coalesce(p.name, ''), 'email', coalesce(u.email, ''),
        'visits', (select count(*) from public.share_visits v where v.token = l.token),
        'joins', coalesce((select jsonb_agg(jsonb_build_object('name', coalesce(p2.name, ''), 'email', coalesce(u2.email, ''), 'new', j.is_new, 'at', j.at) order by j.at)
                 from public.share_joins j left join public.profiles p2 on p2.id = j.user_id left join auth.users u2 on u2.id = j.user_id
                 where j.token = l.token), '[]'::jsonb)) x
      from public.share_links l left join public.profiles p on p.id = l.sharer left join auth.users u on u.id = l.sharer
      where l.created_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 90), 3650)))
      order by l.created_at desc limit 1000) q), '[]'::jsonb) end;
$$;
revoke all on function public.admin_share_links(int) from public, anon;
grant execute on function public.admin_share_links(int) to authenticated;
-- באזור האישי: מי הצטרף דרך הקישורים שלי — רק השם (בלי מייל), מתי, ואיפה שיתפתי.
-- כולל מי שנרשם דרך קישור ההזמנה הישן (?ref=). עד 200 אחרונים.
create or replace function public.my_share_people() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_agg(jsonb_build_object('name', x.name, 'at', x.at, 'new', x.is_new, 'channel', x.channel, 'place', x.place) order by x.at desc)
    from (select * from (
      select distinct on (j.user_id) coalesce(nullif(btrim(p.name), ''), 'משתמש/ת') as name, j.at, j.is_new, l.channel, l.place
      from public.share_joins j join public.share_links l on l.token = j.token left join public.profiles p on p.id = j.user_id
      where l.sharer = auth.uid() and j.user_id <> auth.uid()
      order by j.user_id, j.at
    ) a
    union all
    select coalesce(nullif(btrim(p.name), ''), 'משתמש/ת'), r.created_at, true, '', ''
    from public.referrals r left join public.profiles p on p.id = r.referred
    where r.referrer = auth.uid() and not exists (
      select 1 from public.share_joins j join public.share_links l on l.token = j.token where j.user_id = r.referred and l.sharer = auth.uid())
    order by 2 desc limit 200) x), '[]'::jsonb);
$$;
revoke all on function public.my_share_people() from public, anon;
grant execute on function public.my_share_people() to authenticated;

-- ---------- 🎬 פרסומות וידאו ----------
-- הסרטון עצמו נשמר ב-Supabase Storage (דלי ציבורי ad-videos, עד 50MB, רק mp4/webm). בטבלה נשמרת רק הכתובת שלו.
-- רק מנהלים מעלים / מוחקים; כולם צופים דרך הכתובת הציבורית.
alter table public.ads add column if not exists video text not null default '';
alter table public.ads drop constraint if exists ads_video_check;
alter table public.ads add constraint ads_video_check
  check (video = '' or (char_length(video) <= 400 and video ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/(ad-videos|clips)/[A-Za-z0-9._-]+$')) not valid;
do $$ begin
  if to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('ad-videos', 'ad-videos', true, 52428800, array['video/mp4','video/webm'])
      on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = array['video/mp4','video/webm'];
    -- סרטונים חדשים עולים לדלי clips: חוסמי פרסומות בדפדפן חוסמים כל כתובת עם ad-videos (הסרטון עולה אבל לא מתנגן)
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('clips', 'clips', true, 52428800, array['video/mp4','video/webm'])
      on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = array['video/mp4','video/webm'];
    drop policy if exists "ad videos admin insert" on storage.objects;
    drop policy if exists "ad videos admin delete" on storage.objects;
    drop policy if exists "ad videos read" on storage.objects;
    -- הדלי ציבורי ממילא; ההרשאה לקרוא נדרשת גם כדי שההעלאה תחזיר תשובה
    create policy "ad videos read" on storage.objects for select to anon, authenticated using (bucket_id in ('ad-videos', 'clips'));
    create policy "ad videos admin insert" on storage.objects for insert to authenticated
      with check (bucket_id in ('ad-videos', 'clips') and public.is_admin());
    create policy "ad videos admin delete" on storage.objects for delete to authenticated
      using (bucket_id in ('ad-videos', 'clips') and public.is_admin());
  end if;
end $$;
-- ⏱️ תדירות לכל פרסומת בנפרד ('' = לפי ההגדרה הכללית)
alter table public.ads add column if not exists freq text not null default '';
alter table public.ads drop constraint if exists ads_freq_check;
alter table public.ads add constraint ads_freq_check check (freq in ('','day','session','load')) not valid;
-- 📄 באיזה דף להציג ('' = בכל הדפים) · 👁️ מי רואה את הפרסומת הזאת ('' = לפי ההגדרה הכללית)
alter table public.ads add column if not exists page text not null default '';
alter table public.ads drop constraint if exists ads_page_check;
alter table public.ads add constraint ads_page_check check (page in ('','list','hist','home','prices','stores')) not valid;
alter table public.ads add column if not exists audience text not null default '';
alter table public.ads drop constraint if exists ads_audience_check;
alter table public.ads add constraint ads_audience_check check (audience in ('','all','admins')) not valid;
-- "אף אחד" בהגדרה הכללית מכבה הכל; אחרת קובעת ההגדרה של הפרסומת, ובלעדיה — הכללית
drop policy if exists "ads read live" on public.ads;
create policy "ads read live" on public.ads for select using (
  auth.uid() is not null and active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
  and public.ads_audience() <> 'none'
  and (coalesce(nullif(audience, ''), public.ads_audience()) = 'all' or public.is_admin()));
-- שהשרת יכיר מיד את העמודות החדשות (video, freq, page, audience) — אחרת שמירת פרסומת נכשלת עד שהוא מתרענן לבד
notify pgrst, 'reload schema';

-- ---------- 👮 הרשאות לכל איש צוות + 📣 מי נכנס, מאיזה קישור ומאיזה דף (v41) ----------
-- הבעלים בוחר לכל איש צוות מה הוא רואה ומה הוא עושה. התפקיד (מנהל / צוות פיקוח) הוא התקרה;
-- ההרשאות כאן מצמצמות או פותחות דברים בתוך התקרה. ריק = ברירת המחדל של התפקיד.
alter table public.staff add column if not exists perms jsonb not null default '{}'::jsonb;
-- המפתחות: visitors (מי נכנס ומאיפה) · notify (התראות על כניסות) · emails (לראות מיילים) · delete_users (למחוק משתמשים, רק מנהל)
--          tabs (רשימת הלשוניות בבק אופיס; אם אין — כל מה שהתפקיד מאפשר)
create or replace function public.staff_can_user(p_user uuid, p_key text) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select case
    when p_user is null then false
    when exists (select 1 from auth.users u where u.id = p_user and public.yam_owner_match(u.email, u.raw_app_meta_data) and u.email_confirmed_at is not null) then true
    else coalesce((select case when s.perms ? p_key then (s.perms->>p_key) = 'true'
                               else case p_key when 'visitors' then true when 'notify' then true
                                               when 'emails' then s.role = 'admin' when 'delete_users' then s.role = 'admin' else false end end
                     and (p_key <> 'delete_users' or s.role = 'admin')
                   from public.staff s where s.user_id = p_user), false) end;
$$;
revoke all on function public.staff_can_user(uuid, text) from public, anon, authenticated;
create or replace function public.staff_can(p_key text) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select public.staff_can_user(auth.uid(), p_key) and public.mfa_ok();
$$;
revoke all on function public.staff_can(text) from public, anon;
grant execute on function public.staff_can(text) to authenticated;
-- ההרשאות של מי שמחובר עכשיו (כדי שהאתר יציג רק את מה שמותר)
create or replace function public.my_perms() returns jsonb
language sql stable security definer set search_path = public, auth as $$
  select case when not public.is_staff() then null else jsonb_build_object(
    'visitors', public.staff_can('visitors'), 'notify', public.staff_can('notify'),
    'emails', public.staff_can('emails'), 'delete_users', public.staff_can('delete_users'),
    'tabs', case when public.is_owner() then null else (select s.perms->'tabs' from public.staff s where s.user_id = auth.uid() and jsonb_typeof(s.perms->'tabs') = 'array') end) end;
$$;
revoke all on function public.my_perms() from public, anon;
grant execute on function public.my_perms() to authenticated;
-- רק הבעלים: רשימת ההרשאות של כל הצוות, ושמירה
create or replace function public.staff_perms_list() returns table(user_id uuid, role text, perms jsonb)
language sql stable security definer set search_path = public as $$
  select s.user_id, s.role, s.perms from public.staff s where public.is_owner() order by s.added_at;
$$;
revoke all on function public.staff_perms_list() from public, anon;
grant execute on function public.staff_perms_list() to authenticated;
create or replace function public.staff_perms_set(p_user uuid, p_perms jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare k text; clean jsonb := '{}'::jsonb; tabs jsonb;
begin
  if not public.is_owner() then return 'forbidden'; end if;
  if not exists (select 1 from public.staff where user_id = p_user) then return 'not_found'; end if;
  foreach k in array array['visitors','notify','emails','delete_users'] loop
    if jsonb_typeof(p_perms->k) = 'boolean' then clean := clean || jsonb_build_object(k, p_perms->k); end if;
  end loop;
  if jsonb_typeof(p_perms->'tabs') = 'array' then
    select coalesce(jsonb_agg(distinct t), '[]'::jsonb) into tabs
      from (select jsonb_array_elements_text(p_perms->'tabs') t limit 80) x where t ~ '^[a-z0-9_]{1,30}$';
    clean := clean || jsonb_build_object('tabs', tabs);
  end if;
  update public.staff set perms = clean where user_id = p_user;
  return 'ok';
end $$;
revoke all on function public.staff_perms_set(uuid, jsonb) from public, anon;
grant execute on function public.staff_perms_set(uuid, jsonb) to authenticated;

-- מחיקת משתמשים — מנהל רק אם הבעלים לא כיבה לו את זה
create or replace function public.admin_delete_user(p_user uuid) returns text
language plpgsql security definer set search_path = public, auth as $$
declare em text;
begin
  if not public.is_admin() or not public.staff_can('delete_users') then return 'forbidden'; end if;
  if p_user = auth.uid() then return 'self'; end if;
  select lower(email) into em from auth.users where id = p_user;
  if em is null then return 'not_found'; end if;
  if exists (select 1 from auth.users ou where ou.id = p_user and public.yam_owner_match(ou.email, ou.raw_app_meta_data)) then return 'owner'; end if;
  if exists (select 1 from public.staff where user_id = p_user and role = 'admin') and not public.is_owner() then return 'forbidden'; end if;
  perform public.audit_note('users', 'DELETE', p_user::text, jsonb_build_object('name', (select name from public.profiles where id = p_user), 'email', em), null);
  update public.prices set by_name = '' where by_id = p_user;
  update public.recipes set author_name = '' where author_id = p_user;
  update public.bot_knowledge set author_name = '' where author_id = p_user;
  update public.store_posts set author_name = '' where created_by = p_user;
  update public.divrei_torah set author_name = '' where author_id = p_user;
  update public.site_reviews set author_name = '' where user_id = p_user;
  update public.feedback set name = '', email = '' where user_id = p_user;
  delete from auth.users where id = p_user;
  return 'deleted';
end $$;
-- רשימת המשתמשים: מנהל שהבעלים כיבה לו "מיילים" רואה את הרשימה בלי מיילים
create or replace function public.admin_user_list()
returns table(id uuid, name text, email text, created_at timestamptz, last_seen timestamptz, role text, confirmed boolean, last_sign_in timestamptz, provider text)
language plpgsql stable security definer set search_path = public, auth as $$
declare em boolean := public.staff_can('emails');
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select u.id, coalesce(p.name, '')::text, (case when em then coalesce(u.email, '') else '' end)::text, u.created_at, coalesce(p.last_seen, u.created_at),
         (case when public.yam_owner_match(u.email, u.raw_app_meta_data) and u.email_confirmed_at is not null then 'owner'
               else coalesce(s.role, '') end)::text,
         u.email_confirmed_at is not null, u.last_sign_in_at,
         coalesce(u.raw_app_meta_data->>'provider', 'email')::text
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.staff s on s.user_id = u.id
  order by u.created_at desc
  limit 5000;
end $$;

-- יומן כניסות: כל כניסה (פעם בחצי שעה למשתמש) — מקור, הקישור המדויק שנכנסו אליו, הדף שבו היה הקישור, וסוג המכשיר.
-- אורח לא רשום נשמר בלי שום מזהה. נשמר 90 יום.
create table if not exists public.visit_log (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  src text not null default 'direct',
  landing text not null default '',
  referrer text not null default '',
  device text not null default '',
  at timestamptz not null default now()
);
create index if not exists visit_log_at on public.visit_log (at desc);
create index if not exists visit_log_user on public.visit_log (user_id, at desc);
alter table public.visit_log enable row level security;
revoke all on public.visit_log from anon, authenticated;
create or replace function public.visit_url_clean(p text) returns text
language sql immutable set search_path = public as $$
  select case when char_length(coalesce(p, '')) <= 400 and coalesce(p, '') ~ '^(https?|android-app)://[^\s"''<>\\]+$' then p else '' end;
$$;
create or replace function public.visit_ping(p_src text, p_landing text, p_referrer text, p_device text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); s text := coalesce(public.visit_src_clean(p_src), 'direct'); nm text; a uuid; srcname text;
begin
  if me is not null then
    if exists (select 1 from public.visit_log where user_id = me and at > now() - interval '30 minutes') then return; end if;
  elsif (select count(*) from public.visit_log where user_id is null and at > now() - interval '1 hour') >= 300 then return;
  end if;
  insert into public.visit_log(user_id, src, landing, referrer, device)
  values (me, s, public.visit_url_clean(p_landing), public.visit_url_clean(p_referrer),
          left(regexp_replace(coalesce(p_device, ''), '[^[:alnum:][:space:]·./()_-]', '', 'g'), 60));
  if random() < 0.01 then delete from public.visit_log where at < now() - interval '90 days'; end if;
  -- התראה לטלפון של הצוות: רק על משתמש רשום (לא צוות), ולא יותר מפעם ב-3 שעות על אותו אדם
  if me is not null and not public.is_staff()
     and not exists (select 1 from public.visit_log where user_id = me and at > now() - interval '3 hours' and at < now() - interval '1 second') then
    nm := coalesce(nullif((select name from public.profiles where id = me), ''), 'משתמש/ת');
    srcname := case s when 'direct' then 'ישירות' when 'google' then 'מגוגל' when 'whatsapp' then 'מוואטסאפ' when 'facebook' then 'מפייסבוק' else 'מ-' || s end;
    for a in select id from auth.users where public.staff_can_user(id, 'visitors') and public.staff_can_user(id, 'notify') and id <> me loop
      perform public.push_enqueue(a, 'visits', '👤 ' || nm || ' נכנס/ה לאתר', srcname || coalesce(nullif(' · ' || left(p_device, 40), ' · '), ''), '/#admin-guests', 'visit:' || me);
    end loop;
  end if;
end $$;
revoke all on function public.visit_ping(text, text, text, text) from public;
grant execute on function public.visit_ping(text, text, text, text) to anon, authenticated;
-- נרשם חדש: נשמר מאיזה מקור הגיע + התראה לצוות
create or replace function public.visit_src_signup(p_src text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare s text := public.visit_src_clean(p_src); nm text; a uuid;
begin
  if auth.uid() is null or s is null then return false; end if;
  insert into public.visit_signups(user_id, src) values (auth.uid(), s) on conflict do nothing;
  if not found then return false; end if;
  nm := coalesce(nullif((select name from public.profiles where id = auth.uid()), ''), 'משתמש/ת חדש/ה');
  for a in select id from auth.users where public.staff_can_user(id, 'visitors') and public.staff_can_user(id, 'notify') and id <> auth.uid() loop
    perform public.push_enqueue(a, 'visits', '🎉 נרשם/ה חדש/ה: ' || nm, 'הגיע/ה מ: ' || s, '/#admin-guests', 'signup:' || auth.uid());
  end loop;
  return true;
end $$;
revoke all on function public.visit_src_signup(text) from public, anon;
grant execute on function public.visit_src_signup(text) to authenticated;
-- מי נכנס ומאיפה — לצוות עם הרשאה. שם תמיד; מייל רק למי שמותר לו.
create or replace function public.staff_visits(p_since timestamptz default null, p_limit int default 300)
returns table(at timestamptz, kind text, user_id uuid, name text, email text, src text, landing text, referrer text, device text)
language plpgsql stable security definer set search_path = public, auth as $$
declare em boolean := public.staff_can('emails'); s timestamptz;
begin
  if not public.is_staff() or not public.staff_can('visitors') then raise exception 'forbidden' using errcode = '42501'; end if;
  s := greatest(coalesce(p_since, now() - interval '30 days'), now() - interval '90 days');
  return query
  select * from (
    select v.at, 'visit'::text, v.user_id, coalesce(p.name, '')::text, (case when em then coalesce(u.email, '') else '' end)::text, v.src, v.landing, v.referrer, v.device
      from public.visit_log v left join public.profiles p on p.id = v.user_id left join auth.users u on u.id = v.user_id
      where v.at > s and v.user_id is distinct from auth.uid()
    union all
    select g.at, 'signup'::text, g.user_id, coalesce(p.name, '')::text, (case when em then coalesce(u.email, '') else '' end)::text, g.src, ''::text, ''::text, ''::text
      from public.visit_signups g left join public.profiles p on p.id = g.user_id left join auth.users u on u.id = g.user_id
      where g.at > s
  ) x(at, kind, user_id, name, email, src, landing, referrer, device)
  order by x.at desc
  limit greatest(1, least(coalesce(p_limit, 300), 2000));
end $$;
revoke all on function public.staff_visits(timestamptz, int) from public, anon;
grant execute on function public.staff_visits(timestamptz, int) to authenticated;
-- הסיכומים הקיימים פתוחים גם לצוות שיש לו הרשאת "מי נכנס" (מיילים — רק עם הרשאה)
create or replace function public.admin_guest_stats() returns jsonb
language sql stable security definer set search_path = public, auth as $$
  select case when not (public.is_staff() and public.staff_can('visitors')) then null else jsonb_build_object(
    'total', (select count(*) from public.guest_visits),
    'd7', (select count(*) from public.guest_visits where first_at > now() - interval '7 days'),
    'd30', (select count(*) from public.guest_visits where first_at > now() - interval '30 days'),
    'returned', (select count(*) from public.guest_visits where visits > 1),
    'converted', (select count(*) from public.guest_visits where converted_user is not null),
    'list', coalesce((select jsonb_agg(x order by x->>'converted_at' desc) from (
        select jsonb_build_object('first_at', g.first_at, 'converted_at', g.converted_at, 'visits', g.visits,
          'name', coalesce(p.name, ''), 'email', case when public.staff_can('emails') then coalesce(u.email, '') else '' end) x
        from public.guest_visits g left join public.profiles p on p.id = g.converted_user left join auth.users u on u.id = g.converted_user
        where g.converted_user is not null order by g.converted_at desc limit 500) t), '[]'::jsonb)) end;
$$;

-- ---------- 🕵️ כל מה שהצוות עושה — לבעלים בלבד ----------
-- שינויים של אנשי צוות בטבלאות שאין בהן עדיין היסטוריית שינויים (חסימות, צ'אט, דיווחים, ביגוד, פרופילים...) נרשמים ב-audit_log.
-- נרשם רק כשהפעולה נעשתה ע"י צוות — לא כל פעולה של משתמש רגיל.
create or replace function public.audit_staff_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare o jsonb; n jsonb; noise text[] := array['views','clicks','confirms','last_seen','updated_at','updates_seen_at'];
begin
  if auth.uid() is null or not public.is_staff() then return coalesce(new, old); end if;
  if tg_op <> 'INSERT' then o := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then n := to_jsonb(new); end if;
  if tg_op = 'UPDATE' and (o - noise) = (n - noise) then return new; end if;
  -- איש צוות שמעדכן את הפרופיל של עצמו — לא פעולת ניהול
  if tg_table_name = 'profiles' and coalesce(n->>'id', o->>'id') = auth.uid()::text then return coalesce(new, old); end if;
  insert into public.audit_log(table_name, op, row_id, old_row, new_row, actor, actor_name)
  values (tg_table_name, tg_op, coalesce(n->>'id', o->>'id', n->>'key', o->>'key', n->>'user_id', o->>'user_id'), o, n, auth.uid(), public.my_name());
  return coalesce(new, old);
end $$;
revoke all on function public.audit_staff_trigger() from public, anon, authenticated;
do $$
declare t text;
begin
  foreach t in array array['profiles','user_bans','support_messages','abuse_reports','business_requests','store_messages','price_sources','clothing_shops','store_recs','cloth_votes','yami_notes','store_inventory','biz_machines','client_errors'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists audit_staff on public.%I', t);
      execute format('create trigger audit_staff after insert or update or delete on public.%I for each row execute function public.audit_staff_trigger()', t);
    end if;
  end loop;
end $$;
-- מחיקת משתמש ואישור מייל ידני — נרשמים גם הם (אין טריגר על טבלת המשתמשים של Supabase)
create or replace function public.audit_note(p_table text, p_op text, p_row text, p_old jsonb, p_new jsonb) returns void
language sql security definer set search_path = public as $$
  insert into public.audit_log(table_name, op, row_id, old_row, new_row, actor, actor_name)
  values (p_table, p_op, p_row, p_old, p_new, auth.uid(), public.my_name());
$$;
revoke all on function public.audit_note(text, text, text, jsonb, jsonb) from public, anon, authenticated;
create or replace function public.admin_confirm_user(p_user uuid) returns text
language plpgsql security definer set search_path = public, auth as $$
declare em text;
begin
  if not public.is_admin() then return 'forbidden'; end if;
  select lower(email) into em from auth.users where id = p_user;
  if em is null then return 'not_found'; end if;
  if exists (select 1 from auth.users ou where ou.id = p_user and public.yam_owner_match(ou.email, ou.raw_app_meta_data)) then return 'owner'; end if;
  update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = p_user;
  perform public.audit_note('users', 'CONFIRM', p_user::text, null, jsonb_build_object('name', (select name from public.profiles where id = p_user), 'email', em));
  return 'ok';
end $$;
-- יומן הפעולות של הצוות: שינויים (audit_log) + מה פתחו ועשו באתר (activity_log). רק לבעלים.
-- audit_log גדל מאוד (כל שינוי מחיר נשמר בו), לכן מחפשים לפי כל איש צוות בנפרד דרך אינדקס (actor, at) — אחרת השאילתה נתקעת ב-statement timeout.
create index if not exists audit_log_actor_at on public.audit_log (actor, at desc) where actor is not null;
-- התוסף של הצוות (staff_pending / staff_events) סופר מחירים שמחכים לאישור ומחירים שדווחו כלא נכונים — בלי אינדקס זה עובר על כל טבלת המחירים
create index if not exists prices_pending on public.prices (created_at desc) where status = 'pending';
create index if not exists prices_wrong on public.prices (id) where wrong > 0;
create index if not exists price_flags_time on public.price_flags (created_at desc);
drop function if exists public.owner_staff_actions(uuid, int);
create or replace function public.owner_staff_actions(p_user uuid default null, p_days int default 7)
returns table(at timestamptz, actor uuid, actor_name text, role text, kind text, what text, op text, title text, changed text)
language plpgsql stable security definer set search_path = public as $$
declare s timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 365)));
begin
  if not public.is_owner() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  with st as (select x.user_id, x.role from public.staff x where p_user is null or x.user_id = p_user)
  select * from (
    select a.at, a.actor, coalesce(nullif(a.actor_name, ''), p.name, '')::text, st.role, 'change'::text, a.table_name, a.op,
           left(coalesce(a.new_row->>'name', a.new_row->>'title', a.new_row->>'product', a.new_row->>'question', a.new_row->>'body', a.new_row->>'reason', a.new_row->>'key',
                         a.old_row->>'name', a.old_row->>'title', a.old_row->>'product', a.old_row->>'question', a.old_row->>'body', a.old_row->>'key', a.row_id, ''), 200)::text,
           case when a.op = 'UPDATE' then (select string_agg(k, ', ') from jsonb_object_keys(a.new_row) k
                                           where k not in ('views','clicks','confirms','last_seen','updated_at','updates_seen_at') and (a.new_row->k) is distinct from (a.old_row->k)) else '' end::text
      from st cross join lateral (select * from public.audit_log a0 where a0.actor = st.user_id and a0.at > s order by a0.at desc limit 3000) a
      left join public.profiles p on p.id = a.actor
    union all
    select l.created_at, l.user_id, coalesce(nullif(l.name, ''), p.name, '')::text, st.role, 'activity'::text, l.action, ''::text, l.detail, ''::text
      from st cross join lateral (select * from public.activity_log l0 where l0.user_id = st.user_id and l0.created_at > s order by l0.created_at desc limit 3000) l
      left join public.profiles p on p.id = l.user_id
  ) x(at, actor, actor_name, role, kind, what, op, title, changed)
  order by x.at desc
  limit 3000;
end $$;
revoke all on function public.owner_staff_actions(uuid, int) from public, anon;
grant execute on function public.owner_staff_actions(uuid, int) to authenticated;

-- ---------- 📊 v42: מקור הצטרפות לכל משתמש · סיכום לפי קמפיין · דוח שבועי לצוות ----------
-- מאיפה כל משתמש הגיע בפעם הראשונה: ממקור ההרשמה, ואם אין — מהכניסה הראשונה שלו ביומן הכניסות
create or replace function public.admin_user_sources()
returns table(user_id uuid, src text, at timestamptz)
language sql stable security definer set search_path = public as $$
  select x.user_id, x.src, x.at from (
    select g.user_id, g.src, g.at from public.visit_signups g
    union all
    (select distinct on (v.user_id) v.user_id, v.src, v.at from public.visit_log v
      where v.user_id is not null and not exists (select 1 from public.visit_signups g where g.user_id = v.user_id)
      order by v.user_id, v.at)
  ) x
  where public.is_admin() and public.staff_can('visitors');
$$;
revoke all on function public.admin_user_sources() from public, anon;
grant execute on function public.admin_user_sources() to authenticated;
-- 🔁 מי חוזר אחרי שבוע — גם אורחים שלא נרשמו, בלי עוגיות ובלי לעקוב אחרי אף אחד:
-- המכשיר זוכר אצלו (בדפדפן) רק את המקור ואת יום הביקור הראשון. כשהוא חוזר שבוע עד 60 יום אחר כך, הוא מוסיף 1 למונה של אותו מקור ואותו יום — פעם אחת בלבד.
-- בשרת נשמרים רק יום + מקור + מספר. בלי מזהה מכשיר, שם, מייל או IP, ואי אפשר לדעת מי חזר.
create table if not exists public.visit_returns (
  day date not null,
  src text not null,
  n int not null default 0,
  primary key (day, src)
);
alter table public.visit_returns enable row level security;
revoke all on public.visit_returns from anon, authenticated;
-- מאיזה יום מודדים (מכשירים שהגיעו לפני כן לא יודעים את יום הביקור הראשון, ולכן לא נספרים)
create table if not exists public.visit_returns_start (id int primary key default 1 check (id = 1), day date not null default current_date);
alter table public.visit_returns_start enable row level security;
revoke all on public.visit_returns_start from anon, authenticated;
insert into public.visit_returns_start(id) values (1) on conflict do nothing;
create or replace function public.visit_src_return(p_src text, p_day date) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare s text := public.visit_src_clean(p_src); base int;
begin
  if s is null or p_day is null or p_day > current_date - 7 or p_day < current_date - 60
     or p_day < (select day from public.visit_returns_start where id = 1) then return false; end if;
  -- רק מקור + יום שבאמת נספרו בביקור ראשון, ולעולם לא יותר חוזרים ממבקרים חדשים
  select n into base from public.visit_sources where day = p_day and src = s;
  if coalesce(base, 0) = 0 then return false; end if;
  insert into public.visit_returns(day, src, n) values (p_day, s, 1)
  on conflict (day, src) do update set n = public.visit_returns.n + 1 where public.visit_returns.n < base;
  return true;
end $$;
revoke all on function public.visit_src_return(text, date) from public;
grant execute on function public.visit_src_return(text, date) to anon, authenticated;
-- לכל מקור: מבקרים חדשים, נרשמו, כמה מהנרשמים עדיין פעילים שבוע אחרי ההרשמה,
-- וכמה מכל המבקרים החדשים (גם בלי הרשמה) חזרו שבוע או יותר אחרי הביקור הראשון (ret_base = מי שעבר עליו כבר שבוע)
create or replace function public.admin_visit_sources(p_days int default 30) returns jsonb
language sql stable security definer set search_path = public as $$
  with d as (select greatest(1, least(coalesce(p_days, 30), 365)) n, (select day from public.visit_returns_start where id = 1) st)
  select case when not (public.is_staff() and public.staff_can('visitors')) then null else coalesce((
    select jsonb_agg(jsonb_build_object('src', x.src, 'visits', x.visits, 'signups', x.signups, 'week_old', x.week_old, 'active7', x.active7,
                                        'ret_base', x.ret_base, 'returned', x.returned) order by x.visits desc, x.signups desc)
    from (
      select coalesce(v.src, g.src) src, coalesce(v.visits, 0) visits, coalesce(g.signups, 0) signups, coalesce(g.week_old, 0) week_old, coalesce(g.active7, 0) active7,
             coalesce(v.ret_base, 0) ret_base, coalesce(v.returned, 0) returned
      from (select vs.src, sum(vs.n)::int visits,
                   coalesce(sum(vs.n) filter (where vs.day <= current_date - 7 and vs.day >= d.st), 0)::int ret_base,
                   coalesce(sum(r.n) filter (where vs.day <= current_date - 7 and vs.day >= d.st), 0)::int returned
              from public.visit_sources vs cross join d left join public.visit_returns r on r.day = vs.day and r.src = vs.src
             where vs.day > current_date - d.n group by vs.src) v
      full join (
        select s.src, count(*)::int signups,
               count(*) filter (where s.at < now() - interval '7 days')::int week_old,
               count(*) filter (where s.at < now() - interval '7 days' and (
                 coalesce(p.last_seen, s.at) > s.at + interval '7 days'
                 or exists (select 1 from public.visit_log l where l.user_id = s.user_id and l.at > s.at + interval '7 days')))::int active7
        from public.visit_signups s left join public.profiles p on p.id = s.user_id
        where s.at > now() - make_interval(days => (select n from d))
        group by s.src) g on g.src = v.src
    ) x), '[]'::jsonb) end;
$$;
revoke all on function public.admin_visit_sources(int) from public, anon;
grant execute on function public.admin_visit_sources(int) to authenticated;
-- לפי שבוע (ראשון עד שבת) של הביקור הראשון: כמה מבקרים חדשים, וכמה מהם חזרו שבוע או יותר אחר כך. 12 השבועות האחרונים.
-- נספרים רק ימים שכבר עבר עליהם שבוע, כדי שהאחוז לא ייראה נמוך סתם
create or replace function public.admin_visit_return_weeks() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not (public.is_staff() and public.staff_can('visitors')) then null else coalesce((
    select jsonb_agg(jsonb_build_object('week', w.wk, 'visits', w.visits, 'returned', w.returned, 'partial', w.wk + 6 > current_date - 7) order by w.wk desc)
    from (
      select c.wk, sum(c.n)::int visits, coalesce(sum(c.r), 0)::int returned
        from (select vs.day - extract(dow from vs.day)::int wk, vs.n, r.n r
                from public.visit_sources vs left join public.visit_returns r on r.day = vs.day and r.src = vs.src
               where vs.day <= current_date - 7 and vs.day > current_date - 7 - 84
                 and vs.day >= (select day from public.visit_returns_start where id = 1)) c
       group by c.wk
    ) w), '[]'::jsonb) end;
$$;
revoke all on function public.admin_visit_return_weeks() from public, anon;
grant execute on function public.admin_visit_return_weeks() to authenticated;
-- דוח שבועי (יום ראשון בבוקר) לכל איש צוות שמקבל התראות על כניסות: כמה נכנסו, כמה נרשמו, ומאיזה מקור
create or replace function public.staff_weekly_report() returns int
language plpgsql security definer set search_path = public, auth as $$
declare vis int; reg int; logged int; top text; topn int; rb int; rn int; body text; a uuid; n int := 0;
begin
  select coalesce(sum(v.n), 0)::int into vis from public.visit_sources v where v.day > current_date - 7;
  select count(*)::int into reg from public.visit_signups where at > now() - interval '7 days';
  select count(distinct user_id)::int into logged from public.visit_log where user_id is not null and at > now() - interval '7 days';
  select src, count(*)::int into top, topn from public.visit_signups where at > now() - interval '7 days' group by src order by count(*) desc limit 1;
  if top is null then
    select src, sum(v.n)::int into top, topn from public.visit_sources v where v.day > current_date - 7 group by src order by sum(v.n) desc limit 1;
  end if;
  -- מבקרים חדשים מלפני 8 עד 14 יום: כמה מהם חזרו שבוע אחר כך
  select coalesce(sum(v.n), 0)::int, coalesce(sum(r.n), 0)::int into rb, rn
    from public.visit_sources v left join public.visit_returns r on r.day = v.day and r.src = v.src
   where v.day between current_date - 14 and current_date - 8 and v.day >= (select day from public.visit_returns_start where id = 1);
  body := vis || ' מבקרים חדשים · ' || reg || ' נרשמו · ' || logged || ' משתמשים נכנסו'
          || case when top is not null then '. המקור המוביל: ' || top || ' (' || topn || ')' else '' end
          || case when rb > 0 then '. מהחדשים של שבוע שעבר ' || round(100.0 * rn / rb)::int || '% חזרו' else '' end;
  for a in select id from auth.users where public.staff_can_user(id, 'visitors') and public.staff_can_user(id, 'notify') loop
    perform public.push_enqueue(a, 'visits', '📊 הסיכום השבועי של האתר', body, '/#admin-guests', 'weekly');
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.staff_weekly_report() from public, anon, authenticated;
do $$ begin
  if to_regnamespace('cron') is not null then
    execute $c$select cron.schedule('yam-weekly-report', '0 6 * * 0', 'select public.staff_weekly_report()')$c$;
  end if;
exception when others then raise notice 'cron weekly report: %', sqlerrm; end $$;

-- ---------- 🎉/👋 v43: הפרדה בין משתמש חדש שהצטרף עכשיו לבין משתמש קיים שחזר לאתר ----------
-- כניסה ראשונה של חשבון חדש (נפתח בשבוע האחרון ולא נכנס קודם) = "הצטרף/ה עכשיו": נרשמת כהרשמה, והתראה אחת בלבד (סוג signups).
-- כל כניסה אחרת = "משתמש קיים חזר": התראה נפרדת (סוג visits) עם מתי היה בפעם הקודמת.
alter table public.visit_log add column if not exists is_new boolean not null default false;
create or replace function public.ago_he(p interval) returns text
language sql immutable set search_path = public as $$
  select case when p is null then ''
              when p < interval '1 hour' then 'לפני ' || greatest(1, floor(extract(epoch from p) / 60))::int || ' דק׳'
              when p < interval '1 day' then 'לפני ' || floor(extract(epoch from p) / 3600)::int || ' שעות'
              when p < interval '2 days' then 'אתמול'
              else 'לפני ' || floor(extract(epoch from p) / 86400)::int || ' ימים' end;
$$;
-- התראה על נרשם חדש — פעם אחת לכל משתמש (מי שרושם ראשון בטבלת ההרשמות שולח)
create or replace function public.notify_signup(p_user uuid, p_src text, p_device text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare nm text; a uuid; srcname text;
begin
  nm := coalesce(nullif((select name from public.profiles where id = p_user), ''), 'משתמש/ת חדש/ה');
  srcname := case p_src when 'direct' then 'ישירות' when 'google' then 'מגוגל' when 'whatsapp' then 'מוואטסאפ' when 'facebook' then 'מפייסבוק' else 'מ-' || p_src end;
  for a in select id from auth.users where public.staff_can_user(id, 'visitors') and public.staff_can_user(id, 'notify') and id <> p_user loop
    perform public.push_enqueue(a, 'signups', '🎉 משתמש/ת חדש/ה הצטרף/ה: ' || nm, 'הגיע/ה ' || srcname || coalesce(nullif(' · ' || left(coalesce(p_device, ''), 40), ' · '), ''), '/#admin-guests', 'signup:' || p_user);
  end loop;
end $$;
revoke all on function public.notify_signup(uuid, text, text) from public, anon, authenticated;
create or replace function public.visit_ping(p_src text, p_landing text, p_referrer text, p_device text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); s text := coalesce(public.visit_src_clean(p_src), 'direct'); nm text; a uuid; srcname text;
        dev text := left(regexp_replace(coalesce(p_device, ''), '[^[:alnum:][:space:]·./()_-]', '', 'g'), 60);
        prev timestamptz; fresh boolean := false;
begin
  if me is not null then
    if exists (select 1 from public.visit_log where user_id = me and at > now() - interval '30 minutes') then return; end if;
    select max(at) into prev from public.visit_log where user_id = me;
    fresh := prev is null and exists (select 1 from auth.users where id = me and created_at > now() - interval '7 days');
  elsif (select count(*) from public.visit_log where user_id is null and at > now() - interval '1 hour') >= 300 then return;
  end if;
  insert into public.visit_log(user_id, src, landing, referrer, device, is_new)
  values (me, s, public.visit_url_clean(p_landing), public.visit_url_clean(p_referrer), dev, fresh);
  if random() < 0.01 then delete from public.visit_log where at < now() - interval '90 days'; end if;
  if me is null or public.is_staff() then return; end if;
  if fresh then
    -- 🎉 הצטרף/ה עכשיו: נרשם בטבלת ההרשמות (אם האתר עוד לא רשם) — וההתראה יוצאת רק פעם אחת
    insert into public.visit_signups(user_id, src) values (me, s) on conflict do nothing;
    if found then perform public.notify_signup(me, s, dev); end if;
    return;
  end if;
  -- 👋 משתמש קיים חזר: לא יותר מפעם ב-3 שעות על אותו אדם
  if prev is not null and prev > now() - interval '3 hours' then return; end if;
  nm := coalesce(nullif((select name from public.profiles where id = me), ''), 'משתמש/ת');
  srcname := case s when 'direct' then 'ישירות' when 'google' then 'מגוגל' when 'whatsapp' then 'מוואטסאפ' when 'facebook' then 'מפייסבוק' else 'מ-' || s end;
  for a in select id from auth.users where public.staff_can_user(id, 'visitors') and public.staff_can_user(id, 'notify') and id <> me loop
    perform public.push_enqueue(a, 'visits', '👋 ' || nm || ' חזר/ה לאתר',
      case when prev is not null then 'ביקור קודם: ' || public.ago_he(now() - prev) || ' · ' else '' end || srcname || coalesce(nullif(' · ' || left(dev, 40), ' · '), ''),
      '/#admin-guests', 'visit:' || me);
  end loop;
end $$;
revoke all on function public.visit_ping(text, text, text, text) from public;
grant execute on function public.visit_ping(text, text, text, text) to anon, authenticated;
create or replace function public.visit_src_signup(p_src text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare s text := public.visit_src_clean(p_src);
begin
  if auth.uid() is null or s is null then return false; end if;
  insert into public.visit_signups(user_id, src) values (auth.uid(), s) on conflict do nothing;
  if not found then return false; end if;
  if not public.is_staff() then perform public.notify_signup(auth.uid(), s, ''); end if;
  return true;
end $$;
revoke all on function public.visit_src_signup(text) from public, anon;
grant execute on function public.visit_src_signup(text) to authenticated;
-- מי נכנס: הכניסה הראשונה של חשבון חדש מוצגת כ"הצטרף/ה" (עם המכשיר והקישור), לא כעוד כניסה
create or replace function public.staff_visits(p_since timestamptz default null, p_limit int default 300)
returns table(at timestamptz, kind text, user_id uuid, name text, email text, src text, landing text, referrer text, device text)
language plpgsql stable security definer set search_path = public, auth as $$
declare em boolean := public.staff_can('emails'); s timestamptz;
begin
  if not public.is_staff() or not public.staff_can('visitors') then raise exception 'forbidden' using errcode = '42501'; end if;
  s := greatest(coalesce(p_since, now() - interval '30 days'), now() - interval '90 days');
  return query
  select * from (
    select v.at, 'visit'::text, v.user_id, coalesce(p.name, '')::text, (case when em then coalesce(u.email, '') else '' end)::text, v.src, v.landing, v.referrer, v.device
      from public.visit_log v left join public.profiles p on p.id = v.user_id left join auth.users u on u.id = v.user_id
      where v.at > s and v.user_id is distinct from auth.uid() and not v.is_new
    union all
    select g.at, 'signup'::text, g.user_id, coalesce(p.name, '')::text, (case when em then coalesce(u.email, '') else '' end)::text, g.src,
           coalesce(f.landing, ''), coalesce(f.referrer, ''), coalesce(f.device, '')
      from public.visit_signups g left join public.profiles p on p.id = g.user_id left join auth.users u on u.id = g.user_id
      left join lateral (select l.landing, l.referrer, l.device from public.visit_log l where l.user_id = g.user_id order by l.at limit 1) f on true
      where g.at > s
  ) x(at, kind, user_id, name, email, src, landing, referrer, device)
  order by x.at desc
  limit greatest(1, least(coalesce(p_limit, 300), 2000));
end $$;
revoke all on function public.staff_visits(timestamptz, int) from public, anon;
grant execute on function public.staff_visits(timestamptz, int) to authenticated;
-- התראות בתוסף ובפעמון: "הצטרף/ה עכשיו" ו"חזר/ה לאתר" בנפרד; חשבון חדש לא מופיע שלוש פעמים (משתמש חדש + נרשם + נכנס)
create or replace function public.staff_events(p_since timestamptz default null)
returns table(kind text, ref text, title text, detail text, who text, created_at timestamptz, pending boolean)
language plpgsql stable security definer set search_path = public as $$
declare adm boolean := public.is_admin(); me uuid := auth.uid(); s timestamptz;
        vis boolean := public.staff_can('visitors') and public.staff_can('notify');
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  s := greatest(coalesce(p_since, now() - interval '3 days'), now() - interval '30 days');
  return query
  select * from (
    -- חשבון שנפתח ועוד לא נכנס לאתר (למשל עוד לא אישר את המייל). מי שכבר נכנס מופיע למטה כ"הצטרף/ה"
    select 'user'::text, p.id::text, p.name, p.email, ''::text, p.created_at, false
      from public.profiles p where adm and p.created_at > s and p.id <> me
       and not (vis and exists (select 1 from public.visit_signups g where g.user_id = p.id))
    union all
    select 'feedback', f.id::text, f.name, left(f.message, 400), f.email, f.created_at, not f.is_read
      from public.feedback f where adm and f.created_at > s
    union all
    select 'recipe', r.id::text, case when r.source = 'ai' then '🤖 ' else '' end || r.name, left(r.steps, 300), r.author_name, r.created_at, r.status = 'pending'
      from public.recipes r where r.created_at > s and r.author_id is distinct from me
    union all
    select 'bot', k.id::text, k.question, left(k.answer, 300), k.author_name, k.created_at, k.status = 'pending'
      from public.bot_knowledge k where k.created_at > s and k.author_id is distinct from me
    union all
    select 'chain', c.id::text, c.name, c.kind, coalesce((select pr.name from public.profiles pr where pr.id = c.created_by), ''), c.created_at, c.status = 'pending'
      from public.chains c where c.created_at > s and c.created_by is not null and c.created_by <> me
    union all
    select 'branch', b.id::text, b.chain || ' — ' || b.city, b.address, coalesce((select pr.name from public.profiles pr where pr.id = b.created_by), ''), b.created_at, b.status = 'pending'
      from public.branches b where b.created_at > s and b.created_by is not null and b.created_by <> me
    union all
    select 'price', x.id::text, x.product, x.chain || case when x.branch <> '' then ' · ' || x.branch else '' end || ' · ' || x.price::text || ' ' || x.currency, x.by_name, x.created_at, x.status = 'pending'
      from public.prices x where x.created_at > s and x.by_id is distinct from me
    union all
    select 'post', o.id::text, o.title, o.chain || case when o.body <> '' then ' — ' || left(o.body, 200) else '' end, o.author_name, o.created_at, o.status = 'pending'
      from public.store_posts o where o.created_at > s and o.created_by is distinct from me
    union all
    select 'torah', d.id::text, case when d.title <> '' then d.title else 'פרשת ' || d.parasha end, 'פרשת ' || d.parasha || ' — ' || left(d.body, 250), d.author_name, d.created_at, d.status = 'pending'
      from public.divrei_torah d where d.created_at > s and d.author_id is distinct from me
    union all
    select 'chat', c.id::text, 'הודעה מ' || coalesce(nullif(c.author_name, ''), 'משתמש/ת'), left(c.body, 300), c.author_name, c.created_at, not c.read_by_staff
      from public.support_messages c where adm and not c.from_staff and c.created_at > s and c.user_id is distinct from me
    union all
    select 'bizreq', r.id::text, 'בקשת הצטרפות: ' || r.business, r.name || ' · ' || r.phone || case when r.message <> '' then ' — ' || left(r.message, 200) else '' end, r.name, r.created_at, r.status = 'pending'
      from public.business_requests r where adm and r.created_at > s
    union all
    select 'abuse', a.id::text, 'שפה לא נקייה: ' || coalesce(nullif(a.name, ''), 'משתמש'), left(a.text, 200), a.name, a.created_at, not a.handled
      from public.abuse_reports a where adm and a.created_at > s
    union all
    select 'flag', x.id::text, x.product || ' — דווח כלא נכון', x.chain || ' · ' || x.price::text || ' ' || x.currency || ' · ✅ ' || x.confirms || ' / ❌ ' || x.wrong, x.by_name, (select max(f.created_at) from public.price_flags f where f.price_id = x.id), true
      from public.prices x where x.wrong > 0 and exists (select 1 from public.price_flags f where f.price_id = x.id and f.created_at > s)
    union all
    select 'message', m.id::text, 'פנייה ל' || m.chain || case when m.name <> '' then ' מ' || m.name else '' end, left(m.body, 300), m.name, m.created_at, not m.is_read
      from public.store_messages m where adm and m.created_at > s and m.user_id is distinct from me
    union all
    select 'review', v.id::text, repeat('⭐', v.stars) || ' ' || v.author_name, left(v.body, 300), v.author_name, coalesce(v.updated_at, v.created_at), v.status = 'pending'
      from public.site_reviews v where coalesce(v.updated_at, v.created_at) > s and v.user_id is distinct from me
    union all
    -- 👋 משתמש קיים חזר לאתר — עם מתי היה בפעם הקודמת
    select 'visit', v.id::text, coalesce(nullif(p.name, ''), 'משתמש/ת') || ' חזר/ה לאתר',
           case when pv.at is not null then 'ביקור קודם: ' || public.ago_he(v.at - pv.at) || ' · ' else '' end || 'מקור: ' || v.src || case when v.device <> '' then ' · ' || v.device else '' end,
           coalesce(p.name, ''), v.at, false
      from public.visit_log v left join public.profiles p on p.id = v.user_id
      left join lateral (select l.at from public.visit_log l where l.user_id = v.user_id and l.at < v.at order by l.at desc limit 1) pv on true
      where vis and v.at > s and v.user_id is not null and v.user_id <> me and not v.is_new
    union all
    -- 🎉 משתמש חדש הצטרף עכשיו
    select 'signup', g.user_id::text, coalesce(nullif(p.name, ''), 'משתמש/ת חדש/ה') || ' הצטרף/ה עכשיו לאתר',
           'מקור: ' || g.src || coalesce(nullif(' · ' || coalesce((select l.device from public.visit_log l where l.user_id = g.user_id order by l.at limit 1), ''), ' · '), ''),
           coalesce(p.name, ''), g.at, false
      from public.visit_signups g left join public.profiles p on p.id = g.user_id
      where vis and g.at > s
    union all
    -- 🐞 תקלה באתר (מיומן השגיאות) — רק למנהלים. ✔ טופל בתוסף מוחק אותה מהיומן
    select 'error', x.id::text, left(x.msg, 120), x.src || case when x.ver <> '' then ' · גרסה ' || x.ver else '' end || case when x.ua <> '' then ' · ' || left(x.ua, 60) else '' end,
           coalesce((select pr.name from public.profiles pr where pr.id = x.user_id), 'אורח/ת'), x.created_at, true
      from public.client_errors x where adm and x.created_at > s
  ) e(kind, ref, title, detail, who, created_at, pending)
  order by e.created_at desc
  limit 300;
end $$;
revoke all on function public.staff_events(timestamptz) from public, anon;
grant execute on function public.staff_events(timestamptz) to authenticated;

-- ---------- 💬 v43: צ'אט עם האתר — תגובה להודעה מסוימת, עריכת הודעה, אימוג'י על הודעה, ותמונות (רק המנהל שולח) ----------
alter table public.support_messages add column if not exists reply_to uuid references public.support_messages(id) on delete set null;
alter table public.support_messages add column if not exists edited_at timestamptz;
alter table public.support_messages add column if not exists react_user text not null default '';
alter table public.support_messages add column if not exists react_staff text not null default '';
alter table public.support_messages add column if not exists image text not null default '';
alter table public.support_messages drop constraint if exists support_messages_body_check;
alter table public.support_messages drop constraint if exists support_messages_body_chk;
alter table public.support_messages add constraint support_messages_body_chk
  check (char_length(body) <= 4000 and (char_length(body) >= 1 or image <> '')) not valid;
alter table public.support_messages drop constraint if exists support_messages_image_chk;
alter table public.support_messages add constraint support_messages_image_chk
  check (image = '' or (char_length(image) <= 400000 and image ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')) not valid;
alter table public.support_messages drop constraint if exists support_messages_react_chk;
alter table public.support_messages add constraint support_messages_react_chk
  check (react_user in ('','👍','❤️','😂','😮','🙏','👏','✅','😢') and react_staff in ('','👍','❤️','😂','😮','🙏','👏','✅','😢')) not valid;
create index if not exists support_messages_reply on public.support_messages (reply_to) where reply_to is not null;
-- 📷 נובמבר 2026: המנהל מאשר למשתמש לשלוח תמונות בצ'אט — תמיד, עד זמן מסוים, או מספר תמונות מוגבל.
-- until ריק = בלי הגבלת זמן · remaining ריק = בלי הגבלה במספר. בלי שורה — אין אישור.
create table if not exists public.support_img_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  until timestamptz,
  remaining int check (remaining is null or remaining between 0 and 50),
  granted_by uuid default auth.uid(),
  granted_at timestamptz not null default now()
);
alter table public.support_img_grants enable row level security;
drop policy if exists "img grant read" on public.support_img_grants;
create policy "img grant read" on public.support_img_grants for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "img grant admin" on public.support_img_grants;
create policy "img grant admin" on public.support_img_grants for all using (public.is_admin()) with check (public.is_admin());
-- בודק אם מותר למשתמש לשלוח תמונה עכשיו, ואם האישור מוגבל במספר — מוריד אחת
create or replace function public.support_img_take(p uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare g public.support_img_grants;
begin
  select * into g from public.support_img_grants where user_id = p for update;
  if not found or (g.until is not null and g.until < now()) or (g.remaining is not null and g.remaining <= 0) then return false; end if;
  if g.remaining is not null then update public.support_img_grants set remaining = remaining - 1 where user_id = p; end if;
  return true;
end $$;
revoke all on function public.support_img_take(uuid) from public, anon, authenticated;
-- ✓✓ נובמבר 2026: "הגיע" — ההודעה נטענה אצל הצד השני (בטלפון או במחשב), עוד לפני שקרא.
-- ✓ נשלח · ✓✓ אפור הגיע · ✓✓ כחול נקרא. הודעות ישנות שכבר נקראו נחשבות כאלה שהגיעו.
alter table public.support_messages add column if not exists delivered_user boolean not null default false;
alter table public.support_messages add column if not exists delivered_staff boolean not null default false;
update public.support_messages set delivered_user = true where read_by_user and not delivered_user;
update public.support_messages set delivered_staff = true where read_by_staff and not delivered_staff;
create or replace function public.support_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare adm boolean := public.is_admin(); mine boolean;
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.author_name := public.my_name(); new.created_at := now(); new.edited_at := null; new.react_user := ''; new.react_staff := '';
    if adm and new.user_id <> auth.uid() then
      new.from_staff := true; new.read_by_staff := true; new.read_by_user := false; new.delivered_staff := true; new.delivered_user := false;
    else
      new.user_id := auth.uid(); new.from_staff := false; new.read_by_user := true; new.read_by_staff := false; new.delivered_user := true; new.delivered_staff := false;
    end if;
    -- 📷 תמונות — המנהל תמיד, משתמש רק באישור המנהל (support_img_grants)
    if coalesce(new.image, '') <> '' and not (adm and new.from_staff) and not public.support_img_take(new.user_id) then raise exception 'images_admin_only' using errcode = '42501'; end if;
    -- תגובה רק להודעה מאותה שיחה
    if new.reply_to is not null and not exists (select 1 from public.support_messages r where r.id = new.reply_to and r.user_id = new.user_id) then new.reply_to := null; end if;
  else
    -- מי כתב: הודעת צוות — המנהלים; הודעת לקוח — בעל השיחה
    mine := case when old.from_staff then adm else old.user_id = auth.uid() end;
    new.id := old.id; new.user_id := old.user_id; new.from_staff := old.from_staff; new.author_name := old.author_name; new.created_at := old.created_at;
    new.topic := old.topic; new.image := old.image; new.reply_to := old.reply_to;
    -- ✏️ עריכה: רק מי שכתב (לקוח — עד 24 שעות אחרי השליחה; המנהל — תמיד)
    if new.body is distinct from old.body then
      if not mine or (not old.from_staff and old.created_at < now() - interval '24 hours') then
        raise exception 'edit_not_allowed' using errcode = '42501';
      end if;
      new.edited_at := now();
    else
      new.edited_at := old.edited_at;
    end if;
    -- 😊 אימוג'י: הלקוח על ההודעות בשיחה שלו, המנהל על כל הודעה
    if new.react_user is distinct from old.react_user and old.user_id <> auth.uid() then new.react_user := old.react_user; end if;
    if new.react_staff is distinct from old.react_staff and not adm then new.react_staff := old.react_staff; end if;
    if not adm then new.read_by_staff := old.read_by_staff; new.delivered_staff := old.delivered_staff; end if;
    if old.user_id <> auth.uid() then new.read_by_user := old.read_by_user; new.delivered_user := old.delivered_user; end if;
    -- מה שנקרא — גם הגיע
    new.delivered_user := new.delivered_user or new.read_by_user; new.delivered_staff := new.delivered_staff or new.read_by_staff;
  end if;
  return new;
end $$;
drop trigger if exists support_guard on public.support_messages;
create trigger support_guard before insert or update on public.support_messages for each row execute function public.support_guard();
-- התראה לטלפון: תמונה בלי טקסט → "📷 תמונה"
create or replace function public.push_on_support() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid; txt text := coalesce(nullif(new.body, ''), '📷 תמונה');
begin
  if new.from_staff then
    perform public.push_enqueue(new.user_id, 'chat', '💬 תשובה מצוות רשימת קניות', left(case when new.image <> '' and new.body <> '' then '📷 ' else '' end || txt, 200), '/#chat', 'chat:' || new.user_id);
  else
    for a in select public.admin_ids() loop
      if a <> new.user_id then perform public.push_enqueue(a, 'staff', '💬 הודעה חדשה בצ''אט', coalesce(nullif(public.my_name(), ''), 'משתמש') || ': ' || left(txt, 160), '/#admin-support', 'staffchat:' || new.user_id); end if;
    end loop;
  end if;
  return new;
end $$;
-- רשימת השיחות: הודעה אחרונה שהיא תמונה מוצגת כ"📷 תמונה"
drop function if exists public.support_threads();
create or replace function public.support_threads()
returns table(user_id uuid, name text, email text, last_body text, last_at timestamptz, last_from_staff boolean, unread int, total int, status text, topic text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select m.user_id, coalesce(p.name, '')::text, coalesce(u.email, '')::text,
         (array_agg(case when m.image <> '' then '📷 ' || m.body else m.body end order by m.created_at desc))[1], max(m.created_at),
         (array_agg(m.from_staff order by m.created_at desc))[1],
         (count(*) filter (where not m.from_staff and not m.read_by_staff))::int, count(*)::int,
         coalesce(st.status, 'open')::text, coalesce(st.topic, '')::text
  from public.support_messages m left join public.profiles p on p.id = m.user_id left join auth.users u on u.id = m.user_id
  left join public.support_status st on st.user_id = m.user_id
  group by m.user_id, p.name, u.email, st.status, st.topic
  order by max(m.created_at) desc limit 500;
end $$;
revoke all on function public.support_threads() from public, anon;
grant execute on function public.support_threads() to authenticated;

-- 🔐 הבעלים רואה למי בצוות יש אימות דו-שלבי, ויכול לאפס אותו (למשל איש צוות שהחליף או איבד טלפון).
--    אחרי איפוס, איש הצוות נכנס עם הסיסמה בלבד ויכול להפעיל מחדש מהטלפון החדש.
create or replace function public.mfa_staff_status() returns table(user_id uuid, name text, email text, role text, enrolled boolean)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_owner() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select u.id, coalesce(p.name, '')::text, coalesce(u.email, '')::text,
         (case when public.yam_owner_match(u.email, u.raw_app_meta_data) then 'owner' else s.role end)::text,
         exists (select 1 from auth.mfa_factors f where f.user_id = u.id and f.status::text = 'verified')
  from auth.users u left join public.staff s on s.user_id = u.id left join public.profiles p on p.id = u.id
  where s.user_id is not null or (public.yam_owner_match(u.email, u.raw_app_meta_data) and u.email_confirmed_at is not null)
  order by 4, 2;
end $$;
revoke all on function public.mfa_staff_status() from public, anon;
grant execute on function public.mfa_staff_status() to authenticated;
create or replace function public.mfa_reset(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_owner() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.staff s where s.user_id = p_user)
     and not exists (select 1 from auth.users u where u.id = p_user and public.yam_owner_match(u.email, u.raw_app_meta_data)) then
    raise exception 'not_staff';
  end if;
  delete from auth.mfa_factors where user_id = p_user;
end $$;
revoke all on function public.mfa_reset(uuid) from public, anon;
grant execute on function public.mfa_reset(uuid) to authenticated;
create or replace function public.mfa_global_off() returns boolean
language sql stable security definer set search_path = public as $$ select coalesce((select off from public.mfa_settings where id = 1), false) $$;
revoke all on function public.mfa_global_off() from public, anon;
grant execute on function public.mfa_global_off() to authenticated;
create or replace function public.mfa_set_off(p_off boolean) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  -- רק הבעלים, ורק אחרי שהקליד את הקוד (אם הפעיל) — סיסמה שדלפה לא מספיקה כדי לכבות
  if not public.is_owner() then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(p_off, false) then raise exception 'mfa_global_off_disabled' using errcode = '42501'; end if;
  update public.mfa_settings set off = false, updated_at = now() where id = 1;
end $$;
revoke all on function public.mfa_set_off(boolean) from public, anon;
grant execute on function public.mfa_set_off(boolean) to authenticated;

-- 🔔 כניסה של בעלים / מנהל / צוות ממכשיר חדש (דפדפן וכתובת שלא נראו אצלו ב-180 הימים האחרונים) → התראה לבעלים ולמי שנכנס.
--    זה הסימן הראשון לחשבון שנפרץ. משתמשים רגילים לא נבדקים.
create or replace function public.staff_new_device_alert() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare who text; o uuid;
begin
  if new.kind not in ('login', 'google_login') or new.user_id is null then return new; end if;
  if tg_op = 'UPDATE' and old.kind = new.kind then return new; end if;
  if not exists (select 1 from public.admin_ids() a where a = new.user_id)
     and not exists (select 1 from public.staff s where s.user_id = new.user_id) then return new; end if;
  if exists (select 1 from public.auth_events e
             where e.user_id = new.user_id and e.id <> new.id and e.kind in ('login', 'google_login')
               and e.created_at > now() - interval '180 days'
               and ((new.ua <> '' and e.ua = new.ua) or (new.ip <> '' and e.ip = new.ip))) then return new; end if;
  -- הכניסה הראשונה אי פעם (אין שום היסטוריה) — לא מתריעים, אחרת כל איש צוות יקפיץ התראה ביום ההפעלה
  if not exists (select 1 from public.auth_events e where e.user_id = new.user_id and e.id <> new.id and e.kind in ('login', 'google_login')) then return new; end if;
  who := coalesce(nullif((select p.name from public.profiles p where p.id = new.user_id), ''), new.email);
  for o in select u.id from auth.users u where public.yam_owner_match(u.email, u.raw_app_meta_data) and u.email_confirmed_at is not null
           union select new.user_id loop
    perform public.push_enqueue(o, 'staff', '🔐 כניסה ממכשיר חדש',
      who || ' נכנס/ה עכשיו מדפדפן או ממקום שלא נראו קודם. אם זה לא את/ה — להחליף סיסמה מיד.', '/#admin-staff', 'newdev:' || new.id);
  end loop;
  return new;
exception when others then raise notice 'staff_new_device_alert: %', sqlerrm; return new;
end $$;
drop trigger if exists auth_events_new_device on public.auth_events;
create trigger auth_events_new_device after insert or update of kind on public.auth_events
  for each row execute function public.staff_new_device_alert();

-- 🧹 מחיקה אוטומטית של מידע ישן, פעם ביום (מה שלא נשמר — אי אפשר לגנוב). מתאים למה שכתוב במדיניות הפרטיות.
--    עד היום הניקוי קרה רק "לפעמים" (random) כשמישהו כתב לטבלה; כאן הוא קבוע, וכולל גם ביקורי אורחים שלא נמחקו בכלל.
create or replace function public.data_retention() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.guest_visits where converted_user is null and last_at < now() - interval '180 days';
  delete from public.client_errors where created_at < now() - interval '60 days';
  delete from public.visit_log where at < now() - interval '90 days';
  delete from public.activity_log where created_at < now() - interval '180 days';
  delete from public.auth_events where created_at < now() - interval '365 days';
  delete from public.ad_event_seen where day < current_date - 180;
end $$;
revoke all on function public.data_retention() from public, anon, authenticated;
do $$ begin
  if to_regnamespace('cron') is not null then
    execute $c$select cron.schedule('yam-retention', '40 3 * * *', 'select public.data_retention()')$c$;
  end if;
exception when others then raise notice 'cron schedule: %', sqlerrm; end $$;

-- =====================================================================
-- 🤝 v44 קהילה: 💡 לוח הצעות עם "גם אני רוצה" וסטטוסים, 💰 טיפים לחיסכון (עולים רק אחרי אישור),
--    🔥 "מבצע שמצאתי" עם אישור משתמשים, 🎖️ תגים (שגריר ועוד) שהמנהל נותן ועורך לכל אחד,
--    ❌ "מחיר שגוי" — המדווח כותב מה המחיר הנכון, והמנהל מטפל בלחיצה אחת
--    שם הכותב נלקח תמיד מהפרופיל (בזמן ההצגה) — מחיקת חשבון מוחקת גם את השם.
-- =====================================================================
create or replace function public.community_cfg() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.site_config where key = 'community'), '{}'::jsonb);
$$;
revoke all on function public.community_cfg() from public, anon, authenticated;
-- כמה הצטרפו דרך הקישור האישי כדי לקבל אוטומטית תג 🎖️ שגריר (המנהל קובע בלוח הקהילה; ברירת מחדל 3)
create or replace function public.amb_min() returns int
language sql stable security definer set search_path = public as $$
  select case when public.community_cfg()->>'amb_min' ~ '^[0-9]{1,4}$' then greatest(1, (public.community_cfg()->>'amb_min')::int) else 3 end;
$$;
revoke all on function public.amb_min() from public, anon;
grant execute on function public.amb_min() to authenticated;
create or replace function public.user_display_name(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif((select name from public.profiles where id = p_user), ''), '');
$$;
revoke all on function public.user_display_name(uuid) from public, anon, authenticated;

-- ---------- 🎖️ תגים ----------
-- kind 'amb' = תג השגריר. בלי שורה — התג ניתן אוטומטית למי שהביא מספיק חברים. שורה עם hidden = המנהל הוריד את התג.
-- kind 'custom' = כל תג אחר שהמנהל ממציא (🏅 "מדווח מצטיין", ⭐ "תורם קבוע"...)
create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'custom' check (kind in ('custom','amb')),
  emoji text not null default '🏅' check (char_length(emoji) between 1 and 16 and emoji !~ '[<>&"]'),
  label text not null default '' check (char_length(label) <= 40 and label !~ '[<>]'),
  note text not null default '' check (char_length(note) <= 200),
  hidden boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create unique index if not exists user_badges_amb on public.user_badges (user_id) where kind = 'amb';
create index if not exists user_badges_user on public.user_badges (user_id);
alter table public.user_badges enable row level security;
revoke all on public.user_badges from anon, authenticated;
grant select, insert, update, delete on public.user_badges to authenticated;
drop policy if exists "badges admin" on public.user_badges;
create policy "badges admin" on public.user_badges for all to authenticated using (public.is_admin()) with check (public.is_admin());
create or replace function public.badges_of(p_user uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('e', x.e, 'l', x.l) order by x.o, x.at), '[]'::jsonb) from (
    select b.emoji e, b.label l, 0 o, b.created_at at from public.user_badges b where b.user_id = p_user and b.kind = 'amb' and not b.hidden
    union all
    select '🎖️', 'שגריר', 0, now() where p_user is not null
      and not exists (select 1 from public.user_badges b where b.user_id = p_user and b.kind = 'amb')
      and (select count(*) from public.referrals r where r.referrer = p_user) >= public.amb_min()
    union all
    select b.emoji, b.label, 1, b.created_at from public.user_badges b where b.user_id = p_user and b.kind = 'custom' and not b.hidden
  ) x;
$$;
revoke all on function public.badges_of(uuid) from public, anon, authenticated;
create or replace function public.my_badges() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then '[]'::jsonb else public.badges_of(auth.uid()) end;
$$;
revoke all on function public.my_badges() from public, anon;
grant execute on function public.my_badges() to authenticated;
-- 🎖️ השגרירים: מי שיש לו תג, ומי שהביא הכי הרבה חברים (רק שם ומספר — בלי מי הצטרף)
create or replace function public.community_ambassadors() returns table(rank int, name text, joined int, badges jsonb, is_amb boolean, is_me boolean)
language sql stable security definer set search_path = public as $$
  with c as (
    select r.referrer uid, count(*)::int n from public.referrals r group by r.referrer
  ), u as (
    select uid from (select uid from c order by n desc limit 30) t
    union select b.user_id from public.user_badges b where not b.hidden
  ), x as (
    select u.uid, coalesce((select n from c where c.uid = u.uid), 0) n, public.badges_of(u.uid) bd from u
  )
  select (row_number() over (order by (x.bd <> '[]'::jsonb) desc, x.n desc, public.user_display_name(x.uid)))::int,
         coalesce(nullif(public.user_display_name(x.uid), ''), 'משתמש/ת'), x.n, x.bd,
         coalesce((select not b.hidden from public.user_badges b where b.user_id = x.uid and b.kind = 'amb'), x.n >= public.amb_min()),
         x.uid = auth.uid()
  from x where auth.uid() is not null and (x.n > 0 or x.bd <> '[]'::jsonb)
  order by 1 limit 60;
$$;
revoke all on function public.community_ambassadors() from public, anon;
grant execute on function public.community_ambassadors() to authenticated;
-- בבק אופיס / בלוח הקהילה (מנהלים): כל התגים, כולל שגרירים אוטומטיים שעוד אין להם שורה
create or replace function public.admin_badges() returns table(id uuid, user_id uuid, name text, email text, kind text, emoji text, label text, note text, hidden boolean, auto boolean, joined int, created_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select b.id, b.user_id, public.user_display_name(b.user_id), coalesce(u.email, ''), b.kind, b.emoji, b.label, b.note, b.hidden, false,
         (select count(*)::int from public.referrals r where r.referrer = b.user_id), b.created_at
    from public.user_badges b left join auth.users u on u.id = b.user_id where public.is_admin()
  union all
  select null, c.referrer, public.user_display_name(c.referrer), coalesce(u.email, ''), 'amb', '🎖️', 'שגריר', '', false, true, c.n, null
    from (select r.referrer, count(*)::int n from public.referrals r group by r.referrer) c left join auth.users u on u.id = c.referrer
   where public.is_admin() and c.n >= public.amb_min()
     and not exists (select 1 from public.user_badges b where b.user_id = c.referrer and b.kind = 'amb')
  order by 12 desc nulls last;
$$;
revoke all on function public.admin_badges() from public, anon;
grant execute on function public.admin_badges() to authenticated;
-- שמירת תג (חדש או עריכה). לתג שגריר יש שורה אחת לכל משתמש — שמירה שוב מעדכנת אותה.
create or replace function public.admin_badge_save(p_id uuid, p_user uuid, p_kind text, p_emoji text, p_label text, p_note text, p_hidden boolean)
returns text language plpgsql security definer set search_path = public as $$
declare k text := case when p_kind = 'amb' then 'amb' else 'custom' end;
        e text := left(btrim(coalesce(p_emoji, '')), 16); l text := left(btrim(coalesce(p_label, '')), 40);
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if e = '' then e := case when k = 'amb' then '🎖️' else '🏅' end; end if;
  if e ~ '[<>&"]' or l ~ '[<>]' then return 'bad'; end if;
  if k = 'custom' and l = '' then return 'need_label'; end if;
  if p_id is not null then
    update public.user_badges set emoji = e, label = l, note = left(coalesce(p_note, ''), 200), hidden = coalesce(p_hidden, false), updated_at = now() where id = p_id;
    return case when found then 'ok' else 'gone' end;
  end if;
  if p_user is null or not exists (select 1 from auth.users where id = p_user) then return 'no_user'; end if;
  if k = 'amb' and exists (select 1 from public.user_badges where user_id = p_user and kind = 'amb') then
    update public.user_badges set emoji = e, label = l, note = left(coalesce(p_note, ''), 200), hidden = coalesce(p_hidden, false), updated_at = now() where user_id = p_user and kind = 'amb';
  else
    insert into public.user_badges(user_id, kind, emoji, label, note, hidden) values (p_user, k, e, l, left(coalesce(p_note, ''), 200), coalesce(p_hidden, false));
  end if;
  return 'ok';
end $$;
revoke all on function public.admin_badge_save(uuid, uuid, text, text, text, text, boolean) from public, anon;
grant execute on function public.admin_badge_save(uuid, uuid, text, text, text, text, boolean) to authenticated;

-- ---------- 💡 לוח הצעות ----------
create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  body text not null default '' check (char_length(body) <= 2000),
  status text not null default 'new' check (status in ('new','review','working','done','declined')),
  reply text not null default '' check (char_length(reply) <= 1000),
  pinned boolean not null default false,
  hidden boolean not null default false,
  extra_votes int not null default 0 check (extra_votes between -100000 and 100000),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  status_at timestamptz
);
create index if not exists suggestions_created on public.suggestions (created_at desc);
create table if not exists public.suggestion_votes (
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (suggestion_id, user_id)
);
alter table public.suggestions enable row level security;
alter table public.suggestion_votes enable row level security;
revoke all on public.suggestion_votes from anon, authenticated;
drop policy if exists "sugg read" on public.suggestions;
drop policy if exists "sugg add" on public.suggestions;
drop policy if exists "sugg own edit" on public.suggestions;
drop policy if exists "sugg own delete" on public.suggestions;
drop policy if exists "sugg staff" on public.suggestions;
create policy "sugg read" on public.suggestions for select using (auth.uid() is not null and (not hidden or created_by = auth.uid() or public.is_staff()));
create policy "sugg add" on public.suggestions for insert with check (auth.uid() is not null and created_by = auth.uid());
create policy "sugg own edit" on public.suggestions for update using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "sugg own delete" on public.suggestions for delete using (created_by = auth.uid());
create policy "sugg staff" on public.suggestions for all using (public.is_staff()) with check (public.is_staff());
-- משתמש רגיל: לא קובע סטטוס / תשובה / נעיצה / הסתרה / קולות. עורך רק הצעה שעוד "חדשה". עד 5 הצעות ביום.
create or replace function public.suggestions_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare st boolean := public.is_staff();
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.created_at := now(); new.updated_at := null; new.status_at := null;
    if not st then
      new.created_by := auth.uid(); new.status := 'new'; new.reply := ''; new.pinned := false; new.hidden := false; new.extra_votes := 0;
      if (select count(*) from public.suggestions where created_by = auth.uid() and created_at > now() - interval '1 day') >= 5 then
        raise exception 'too_many' using errcode = '22023';
      end if;
    end if;
  else
    new.id := old.id; new.created_by := old.created_by; new.created_at := old.created_at;
    if not st then
      new.status := old.status; new.reply := old.reply; new.pinned := old.pinned; new.hidden := old.hidden; new.extra_votes := old.extra_votes; new.status_at := old.status_at;
      if old.status <> 'new' and (new.title is distinct from old.title or new.body is distinct from old.body) then
        raise exception 'locked' using errcode = '42501';
      end if;
    end if;
    if new.status is distinct from old.status then new.status_at := now(); end if;
    if new.title is distinct from old.title or new.body is distinct from old.body or new.reply is distinct from old.reply then new.updated_at := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists suggestions_guard on public.suggestions;
create trigger suggestions_guard before insert or update on public.suggestions for each row execute function public.suggestions_guard();
-- מי שהציע — כבר "רוצה"; המנהלים מקבלים התראה על הצעה חדשה; כשהסטטוס משתנה — מי שהציע ומי שרצה מקבלים עדכון
create or replace function public.suggestions_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid; v uuid; lbl text;
begin
  if tg_op = 'INSERT' then
    if new.created_by is not null then insert into public.suggestion_votes(suggestion_id, user_id) values (new.id, new.created_by) on conflict do nothing; end if;
    for a in select public.admin_ids() loop
      if a is distinct from new.created_by then perform public.push_enqueue(a, 'staff', '💡 הצעה חדשה בלוח ההצעות', left(new.title, 160), '/#community', 'sugg:' || new.id); end if;
    end loop;
  elsif new.status is distinct from old.status and new.status in ('working','done') and not new.hidden then
    lbl := case new.status when 'working' then '🛠️ בעבודה' else '✅ נוסף לאתר' end;
    for v in select s.user_id from public.suggestion_votes s where s.suggestion_id = new.id limit 2000 loop
      perform public.push_enqueue(v, 'info', lbl || ': ' || left(new.title, 80), case when v = new.created_by then 'ההצעה שלך' else 'הצעה שביקשת' end || ' — תודה שעזרת לשפר את האתר 💚', '/#community', 'suggst:' || new.id);
    end loop;
  end if;
  return new;
exception when others then raise notice 'suggestions_after: %', sqlerrm; return new;
end $$;
drop trigger if exists suggestions_after on public.suggestions;
create trigger suggestions_after after insert or update of status on public.suggestions for each row execute function public.suggestions_after();
create or replace function public.suggestions_list() returns table(id uuid, title text, body text, status text, reply text, pinned boolean, hidden boolean,
  votes int, extra_votes int, my_vote boolean, is_mine boolean, author text, badges jsonb, created_at timestamptz, updated_at timestamptz, status_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.title, s.body, s.status, s.reply, s.pinned, s.hidden,
         greatest(0, (select count(*)::int from public.suggestion_votes v where v.suggestion_id = s.id) + s.extra_votes), s.extra_votes,
         exists (select 1 from public.suggestion_votes v where v.suggestion_id = s.id and v.user_id = auth.uid()),
         s.created_by is not distinct from auth.uid(), public.user_display_name(s.created_by),
         case when s.created_by is null then '[]'::jsonb else public.badges_of(s.created_by) end,
         s.created_at, s.updated_at, s.status_at
  from public.suggestions s
  where auth.uid() is not null and (not s.hidden or s.created_by = auth.uid() or public.is_staff())
  order by s.pinned desc, 8 desc, s.created_at desc limit 400;
$$;
revoke all on function public.suggestions_list() from public, anon;
grant execute on function public.suggestions_list() to authenticated;
-- 🙋 "גם אני רוצה" — לחיצה נוספת מבטלת
create or replace function public.suggestion_vote(p_id uuid, p_on boolean) returns int
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.suggestions where id = p_id and (not hidden or public.is_staff())) then return null; end if;
  if p_on then insert into public.suggestion_votes(suggestion_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  else delete from public.suggestion_votes where suggestion_id = p_id and user_id = auth.uid(); end if;
  return (select greatest(0, count(*)::int + max(s.extra_votes)) from public.suggestions s left join public.suggestion_votes v on v.suggestion_id = s.id where s.id = p_id);
end $$;
revoke all on function public.suggestion_vote(uuid, boolean) from public, anon;
grant execute on function public.suggestion_vote(uuid, boolean) to authenticated;

-- ---------- 💰 טיפים לחיסכון (מתפרסמים רק אחרי אישור) ----------
create table if not exists public.saving_tips (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 5 and 600),
  category text not null default '' check (char_length(category) <= 30),
  status text not null default 'pending' check (status in ('pending','approved')),
  pinned boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists saving_tips_created on public.saving_tips (created_at desc);
create table if not exists public.tip_likes (
  tip_id uuid not null references public.saving_tips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tip_id, user_id)
);
alter table public.saving_tips enable row level security;
alter table public.tip_likes enable row level security;
revoke all on public.tip_likes from anon, authenticated;
drop policy if exists "tips read" on public.saving_tips;
drop policy if exists "tips add" on public.saving_tips;
drop policy if exists "tips own edit" on public.saving_tips;
drop policy if exists "tips own delete" on public.saving_tips;
drop policy if exists "tips staff" on public.saving_tips;
create policy "tips read" on public.saving_tips for select using (auth.uid() is not null and (status = 'approved' or created_by = auth.uid() or public.is_staff()));
create policy "tips add" on public.saving_tips for insert with check (auth.uid() is not null and created_by = auth.uid());
create policy "tips own edit" on public.saving_tips for update using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "tips own delete" on public.saving_tips for delete using (created_by = auth.uid());
create policy "tips staff" on public.saving_tips for all using (public.is_staff()) with check (public.is_staff());
-- משתמש רגיל: כל טיפ (וגם כל עריכה) עובר לאישור. עד 10 טיפים ביום.
create or replace function public.saving_tips_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.created_at := now(); new.updated_at := null;
    if not public.is_staff() then
      new.created_by := auth.uid(); new.status := 'pending'; new.pinned := false;
      if (select count(*) from public.saving_tips where created_by = auth.uid() and created_at > now() - interval '1 day') >= 10 then
        raise exception 'too_many' using errcode = '22023';
      end if;
    end if;
  else
    new.id := old.id; new.created_by := old.created_by; new.created_at := old.created_at;
    if not public.is_staff() then new.pinned := old.pinned; new.status := 'pending'; end if;
    if new.body is distinct from old.body or new.category is distinct from old.category then new.updated_at := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists saving_tips_guard on public.saving_tips;
create trigger saving_tips_guard before insert or update on public.saving_tips for each row execute function public.saving_tips_guard();
create or replace function public.saving_tips_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    for a in select public.admin_ids() loop
      if a is distinct from new.created_by then perform public.push_enqueue(a, 'staff', '💰 טיפ לחיסכון ממתין לאישור', left(new.body, 160), '/#admin-pending', 'tip:' || new.id); end if;
    end loop;
  elsif tg_op = 'UPDATE' and new.status = 'approved' and old.status = 'pending' and new.created_by is not null and new.created_by is distinct from auth.uid() then
    perform public.push_enqueue(new.created_by, 'info', '💰 הטיפ שלך פורסם!', left(new.body, 120) || ' — תודה שעזרת לכולם לחסוך 💚', '/#community', 'tipok:' || new.id);
  end if;
  return new;
exception when others then raise notice 'saving_tips_after: %', sqlerrm; return new;
end $$;
drop trigger if exists saving_tips_after on public.saving_tips;
create trigger saving_tips_after after insert or update of status on public.saving_tips for each row execute function public.saving_tips_after();
create or replace function public.tips_list() returns table(id uuid, body text, category text, status text, pinned boolean, likes int, my_like boolean, is_mine boolean,
  author text, badges jsonb, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, t.body, t.category, t.status, t.pinned,
         (select count(*)::int from public.tip_likes l where l.tip_id = t.id),
         exists (select 1 from public.tip_likes l where l.tip_id = t.id and l.user_id = auth.uid()),
         t.created_by is not distinct from auth.uid(), public.user_display_name(t.created_by),
         case when t.created_by is null then '[]'::jsonb else public.badges_of(t.created_by) end, t.created_at, t.updated_at
  from public.saving_tips t
  where auth.uid() is not null and (t.status = 'approved' or t.created_by = auth.uid() or public.is_staff())
  order by (t.status = 'pending') desc, t.pinned desc, 6 desc, t.created_at desc limit 400;
$$;
revoke all on function public.tips_list() from public, anon;
grant execute on function public.tips_list() to authenticated;
create or replace function public.tip_like(p_id uuid, p_on boolean) returns int
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.saving_tips where id = p_id and status = 'approved') then return null; end if;
  if p_on then insert into public.tip_likes(tip_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  else delete from public.tip_likes where tip_id = p_id and user_id = auth.uid(); end if;
  return (select count(*)::int from public.tip_likes where tip_id = p_id);
end $$;
revoke all on function public.tip_like(uuid, boolean) from public, anon;
grant execute on function public.tip_like(uuid, boolean) to authenticated;

-- ---------- 🔥 מבצע שמצאתי: משתמשים מאשרים שהמבצע עדיין בתוקף ----------
create table if not exists public.deal_votes (
  post_id uuid not null references public.store_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.deal_votes enable row level security;
revoke all on public.deal_votes from anon, authenticated;
create or replace function public.deals_found(p_days int default 45) returns table(id uuid, chain text, branch text, title text, body text, ends_at timestamptz, has_image boolean,
  author text, badges jsonb, by_store boolean, ok int, gone int, last_ok timestamptz, my_vote int, is_mine boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select o.id, o.chain, o.branch, o.title, o.body, o.ends_at, o.image <> '',
         public.user_display_name(o.created_by), case when o.created_by is null then '[]'::jsonb else public.badges_of(o.created_by) end,
         exists (select 1 from public.store_managers m where m.user_id = o.created_by and m.chain = o.chain),
         (select count(*)::int from public.deal_votes v where v.post_id = o.id and v.vote = 1),
         (select count(*)::int from public.deal_votes v where v.post_id = o.id and v.vote = -1),
         (select max(v.created_at) from public.deal_votes v where v.post_id = o.id and v.vote = 1),
         coalesce((select v.vote::int from public.deal_votes v where v.post_id = o.id and v.user_id = auth.uid()), 0),
         o.created_by is not distinct from auth.uid(), o.created_at
  from public.store_posts o
  where auth.uid() is not null and o.kind = 'deal' and o.status = 'approved'
    and (o.ends_at is null or o.ends_at > now())
    and o.created_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 45), 365)))
    and not exists (select 1 from public.chains c where c.name = o.chain and c.hidden)
  order by o.created_at desc limit 200;
$$;
revoke all on function public.deals_found(int) from public, anon;
grant execute on function public.deals_found(int) to authenticated;
-- ✅ עדיין בתוקף / ❌ כבר נגמר. על מבצע שדיווחת בעצמך — לא מצביעים. לחיצה שוב על אותו כפתור מבטלת.
create or replace function public.deal_vote(p_id uuid, p_vote int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare mine int;
begin
  if auth.uid() is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.store_posts where id = p_id and kind = 'deal' and status = 'approved') then return jsonb_build_object('error', 'not_found'); end if;
  if exists (select 1 from public.store_posts where id = p_id and created_by = auth.uid()) then return jsonb_build_object('own', true); end if;
  if coalesce(p_vote, 0) = 0 then delete from public.deal_votes where post_id = p_id and user_id = auth.uid();
  else insert into public.deal_votes(post_id, user_id, vote) values (p_id, auth.uid(), case when p_vote > 0 then 1 else -1 end)
       on conflict (post_id, user_id) do update set vote = excluded.vote, created_at = now(); end if;
  select vote into mine from public.deal_votes where post_id = p_id and user_id = auth.uid();
  return jsonb_build_object('ok', (select count(*) from public.deal_votes where post_id = p_id and vote = 1),
                            'gone', (select count(*) from public.deal_votes where post_id = p_id and vote = -1), 'mine', coalesce(mine, 0));
end $$;
revoke all on function public.deal_vote(uuid, int) from public, anon;
grant execute on function public.deal_vote(uuid, int) to authenticated;

-- ---------- ❌ מחיר שגוי: מה המחיר הנכון, והמנהל מטפל בלחיצה ----------
alter table public.price_flags add column if not exists suggested numeric(10,2);
alter table public.price_flags add column if not exists note text not null default '';
do $$ begin
  alter table public.price_flags add constraint price_flags_suggested_chk check (suggested is null or (suggested > 0 and suggested < 100000));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.price_flags add constraint price_flags_note_chk check (char_length(note) <= 300);
exception when duplicate_object then null; end $$;
-- המשתמש: "❌ לא נכון" + (לא חובה) המחיר הנכון והערה קצרה
create or replace function public.price_wrong_report(p_id uuid, p_price numeric, p_note text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if auth.uid() is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_price is not null and not (p_price > 0 and p_price < 100000) then return jsonb_build_object('error', 'bad_price'); end if;
  r := public.vote_price(p_id, -1);
  if r ? 'error' or coalesce((r->>'own')::boolean, false) then return r; end if;
  update public.price_flags set suggested = round(p_price, 2), note = left(btrim(coalesce(p_note, '')), 300), created_at = now()
   where price_id = p_id and user_id = auth.uid();
  return r;
end $$;
revoke all on function public.price_wrong_report(uuid, numeric, text) from public, anon;
grant execute on function public.price_wrong_report(uuid, numeric, text) to authenticated;
-- הצוות: כל המחירים שדווחו כשגויים (בלי הגבלת זמן), עם מה שכל מדווח כתב
create or replace function public.staff_flagged_prices() returns table(id uuid, product text, chain text, branch text, price numeric, currency text, confirms int, wrong int,
  by_name text, created_at timestamptz, updated_at timestamptz, last_flag timestamptz, reports jsonb)
language sql stable security definer set search_path = public as $$
  select x.id, x.product, x.chain, x.branch, x.price, x.currency, x.confirms, x.wrong, x.by_name, x.created_at, x.updated_at,
         (select max(f.created_at) from public.price_flags f where f.price_id = x.id),
         (select coalesce(jsonb_agg(jsonb_build_object('name', public.user_display_name(f.user_id), 'price', f.suggested, 'note', f.note, 'at', f.created_at) order by f.created_at desc), '[]'::jsonb)
            from public.price_flags f where f.price_id = x.id)
  from public.prices x
  where public.is_staff() and exists (select 1 from public.price_flags f where f.price_id = x.id)
  order by 12 desc limit 300;
$$;
revoke all on function public.staff_flagged_prices() from public, anon;
grant execute on function public.staff_flagged_prices() to authenticated;
-- 'correct' = המחיר נכון (מנקים את הדיווחים) · 'update' = מעדכנים למחיר הנכון (ומודיעים למי שדיווח) · 'delete' = מוחקים את הדיווח
create or replace function public.staff_price_fix(p_id uuid, p_action text, p_price numeric default null) returns text
language plpgsql security definer set search_path = public as $$
declare x public.prices%rowtype; f uuid;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into x from public.prices where id = p_id;
  if not found then return 'gone'; end if;
  if p_action = 'correct' then
    delete from public.price_flags where price_id = p_id;
    update public.prices set wrong = 0 where id = p_id;
  elsif p_action = 'update' then
    if p_price is null or not (p_price > 0 and p_price < 100000) then return 'bad_price'; end if;
    for f in select user_id from public.price_flags where price_id = p_id loop
      perform public.push_enqueue(f, 'info', '✅ המחיר תוקן — תודה!', x.product || ' ב' || x.chain || ': ' || round(p_price, 2)::text || ' ₪', '/#prices', 'pfix:' || p_id);
    end loop;
    delete from public.price_flags where price_id = p_id;
    delete from public.price_confirms where price_id = p_id;
    update public.prices set price = round(p_price, 2), wrong = 0, confirms = 0, updated_at = now(), status = 'approved' where id = p_id;
  elsif p_action = 'delete' then
    delete from public.prices where id = p_id;
  else
    return 'bad_action';
  end if;
  return 'ok';
end $$;
revoke all on function public.staff_price_fix(uuid, text, numeric) from public, anon;
grant execute on function public.staff_price_fix(uuid, text, numeric) to authenticated;
-- ✅ ממתין לאישור / התוסף: גם טיפים לחיסכון; ✔ על "מחיר לא נכון" = המחיר נכון, ✖ = מוחקים
create or replace function public.staff_decide(p_kind text, p_ref text, p_ok boolean)
returns text language plpgsql security definer set search_path = public as $$
declare adm boolean := public.is_admin(); n int := 0;
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_kind in ('feedback','chat','message','abuse','error') and not adm then raise exception 'forbidden' using errcode = '42501'; end if;
  case p_kind
    when 'recipe' then update public.recipes set status = case when p_ok then 'approved' else 'rejected' end where id::text = p_ref;
    when 'bot'    then update public.bot_knowledge set status = case when p_ok then 'approved' else 'rejected' end where id::text = p_ref;
    when 'review' then update public.site_reviews set status = case when p_ok then 'approved' else 'rejected' end where id::text = p_ref;
    when 'chain'  then if p_ok then update public.chains set status = 'approved' where id::text = p_ref; else delete from public.chains where id::text = p_ref and status = 'pending'; end if;
    when 'branch' then if p_ok then update public.branches set status = 'approved' where id::text = p_ref; else delete from public.branches where id::text = p_ref and status = 'pending'; end if;
    when 'price'  then if p_ok then update public.prices set status = 'approved' where id::text = p_ref; else delete from public.prices where id::text = p_ref; end if;
    when 'post'   then if p_ok then update public.store_posts set status = 'approved' where id::text = p_ref; else delete from public.store_posts where id::text = p_ref; end if;
    when 'torah'  then if p_ok then update public.divrei_torah set status = 'approved' where id::text = p_ref; else delete from public.divrei_torah where id::text = p_ref; end if;
    when 'flag'   then if p_ok then delete from public.price_flags where price_id::text = p_ref; update public.prices set wrong = 0 where id::text = p_ref;
                       else delete from public.prices where id::text = p_ref; end if;
    when 'tip'    then if p_ok then update public.saving_tips set status = 'approved' where id::text = p_ref; else delete from public.saving_tips where id::text = p_ref; end if;
    -- הצעה בלוח: ✔ = ראיתי (עוברת ל"בבדיקה") · ✖ = מוסתרת מהלוח
    when 'suggest' then if p_ok then update public.suggestions set status = 'review' where id::text = p_ref and status = 'new'; else update public.suggestions set hidden = true where id::text = p_ref; end if;
    when 'feedback' then if p_ok then update public.feedback set is_read = true where id::text = p_ref; else delete from public.feedback where id::text = p_ref; end if;
    when 'chat'    then update public.support_messages set read_by_staff = true where id::text = p_ref;
    when 'message' then update public.store_messages set is_read = true where id::text = p_ref;
    when 'abuse'   then update public.abuse_reports set handled = true where id::text = p_ref;
    when 'error'   then delete from public.client_errors where id::text = p_ref;
    else raise exception 'אי אפשר לטפל בזה מהתוסף — פותחים את הבק אופיס' using errcode = '22023';
  end case;
  get diagnostics n = row_count;
  return case when n > 0 then 'ok' else 'gone' end;
end $$;
revoke all on function public.staff_decide(text, text, boolean) from public, anon;
grant execute on function public.staff_decide(text, text, boolean) to authenticated;

-- (v44) staff_events: גם טיפים, הצעות, והמחיר הנכון שהמדווחים כתבו
create or replace function public.staff_events(p_since timestamptz default null)
returns table(kind text, ref text, title text, detail text, who text, created_at timestamptz, pending boolean)
language plpgsql stable security definer set search_path = public as $$
declare adm boolean := public.is_admin(); me uuid := auth.uid(); s timestamptz;
        vis boolean := public.staff_can('visitors') and public.staff_can('notify');
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  s := greatest(coalesce(p_since, now() - interval '3 days'), now() - interval '30 days');
  return query
  select * from (
    -- חשבון שנפתח ועוד לא נכנס לאתר (למשל עוד לא אישר את המייל). מי שכבר נכנס מופיע למטה כ"הצטרף/ה"
    select 'user'::text, p.id::text, p.name, p.email, ''::text, p.created_at, false
      from public.profiles p where adm and p.created_at > s and p.id <> me
       and not (vis and exists (select 1 from public.visit_signups g where g.user_id = p.id))
    union all
    select 'feedback', f.id::text, f.name, left(f.message, 400), f.email, f.created_at, not f.is_read
      from public.feedback f where adm and f.created_at > s
    union all
    select 'recipe', r.id::text, case when r.source = 'ai' then '🤖 ' else '' end || r.name, left(r.steps, 300), r.author_name, r.created_at, r.status = 'pending'
      from public.recipes r where r.created_at > s and r.author_id is distinct from me
    union all
    select 'bot', k.id::text, k.question, left(k.answer, 300), k.author_name, k.created_at, k.status = 'pending'
      from public.bot_knowledge k where k.created_at > s and k.author_id is distinct from me
    union all
    select 'chain', c.id::text, c.name, c.kind, coalesce((select pr.name from public.profiles pr where pr.id = c.created_by), ''), c.created_at, c.status = 'pending'
      from public.chains c where c.created_at > s and c.created_by is not null and c.created_by <> me
    union all
    select 'branch', b.id::text, b.chain || ' — ' || b.city, b.address, coalesce((select pr.name from public.profiles pr where pr.id = b.created_by), ''), b.created_at, b.status = 'pending'
      from public.branches b where b.created_at > s and b.created_by is not null and b.created_by <> me
    union all
    select 'price', x.id::text, x.product, x.chain || case when x.branch <> '' then ' · ' || x.branch else '' end || ' · ' || x.price::text || ' ' || x.currency, x.by_name, x.created_at, x.status = 'pending'
      from public.prices x where x.created_at > s and x.by_id is distinct from me
    union all
    select 'post', o.id::text, o.title, o.chain || case when o.body <> '' then ' — ' || left(o.body, 200) else '' end, o.author_name, o.created_at, o.status = 'pending'
      from public.store_posts o where o.created_at > s and o.created_by is distinct from me
    union all
    select 'torah', d.id::text, case when d.title <> '' then d.title else 'פרשת ' || d.parasha end, 'פרשת ' || d.parasha || ' — ' || left(d.body, 250), d.author_name, d.created_at, d.status = 'pending'
      from public.divrei_torah d where d.created_at > s and d.author_id is distinct from me
    union all
    select 'chat', c.id::text, 'הודעה מ' || coalesce(nullif(c.author_name, ''), 'משתמש/ת'), left(c.body, 300), c.author_name, c.created_at, not c.read_by_staff
      from public.support_messages c where adm and not c.from_staff and c.created_at > s and c.user_id is distinct from me
    union all
    select 'bizreq', r.id::text, 'בקשת הצטרפות: ' || r.business, r.name || ' · ' || r.phone || case when r.message <> '' then ' — ' || left(r.message, 200) else '' end, r.name, r.created_at, r.status = 'pending'
      from public.business_requests r where adm and r.created_at > s
    union all
    select 'abuse', a.id::text, 'שפה לא נקייה: ' || coalesce(nullif(a.name, ''), 'משתמש'), left(a.text, 200), a.name, a.created_at, not a.handled
      from public.abuse_reports a where adm and a.created_at > s
    union all
    select 'flag', x.id::text, x.product || ' — דווח כלא נכון', x.chain || ' · ' || x.price::text || ' ' || x.currency || ' · ✅ ' || x.confirms || ' / ❌ ' || x.wrong
           || coalesce(' · המחיר הנכון לפי המדווחים: ' || (select string_agg(distinct f.suggested::text, ' / ') from public.price_flags f where f.price_id = x.id and f.suggested is not null), '')
           || coalesce(' · ' || (select string_agg(f.note, ' | ') from public.price_flags f where f.price_id = x.id and f.note <> ''), ''),
           x.by_name, (select max(f.created_at) from public.price_flags f where f.price_id = x.id), true
      from public.prices x where x.wrong > 0 and exists (select 1 from public.price_flags f where f.price_id = x.id and f.created_at > s)
    union all
    -- 💰 טיפ לחיסכון ממתין לאישור · 💡 הצעה חדשה בלוח ההצעות
    select 'tip', t.id::text, '💰 ' || left(t.body, 100), t.body, public.user_display_name(t.created_by), coalesce(t.updated_at, t.created_at), t.status = 'pending'
      from public.saving_tips t where coalesce(t.updated_at, t.created_at) > s and t.created_by is distinct from me
    union all
    select 'suggest', g.id::text, '💡 ' || g.title, left(g.body, 300), public.user_display_name(g.created_by), g.created_at, g.status = 'new'
      from public.suggestions g where g.created_at > s and g.created_by is distinct from me and not g.hidden
    union all
    select 'message', m.id::text, 'פנייה ל' || m.chain || case when m.name <> '' then ' מ' || m.name else '' end, left(m.body, 300), m.name, m.created_at, not m.is_read
      from public.store_messages m where adm and m.created_at > s and m.user_id is distinct from me
    union all
    select 'review', v.id::text, repeat('⭐', v.stars) || ' ' || v.author_name, left(v.body, 300), v.author_name, coalesce(v.updated_at, v.created_at), v.status = 'pending'
      from public.site_reviews v where coalesce(v.updated_at, v.created_at) > s and v.user_id is distinct from me
    union all
    -- 👋 משתמש קיים חזר לאתר — עם מתי היה בפעם הקודמת
    select 'visit', v.id::text, coalesce(nullif(p.name, ''), 'משתמש/ת') || ' חזר/ה לאתר',
           case when pv.at is not null then 'ביקור קודם: ' || public.ago_he(v.at - pv.at) || ' · ' else '' end || 'מקור: ' || v.src || case when v.device <> '' then ' · ' || v.device else '' end,
           coalesce(p.name, ''), v.at, false
      from public.visit_log v left join public.profiles p on p.id = v.user_id
      left join lateral (select l.at from public.visit_log l where l.user_id = v.user_id and l.at < v.at order by l.at desc limit 1) pv on true
      where vis and v.at > s and v.user_id is not null and v.user_id <> me and not v.is_new
    union all
    -- 🎉 משתמש חדש הצטרף עכשיו
    select 'signup', g.user_id::text, coalesce(nullif(p.name, ''), 'משתמש/ת חדש/ה') || ' הצטרף/ה עכשיו לאתר',
           'מקור: ' || g.src || coalesce(nullif(' · ' || coalesce((select l.device from public.visit_log l where l.user_id = g.user_id order by l.at limit 1), ''), ' · '), ''),
           coalesce(p.name, ''), g.at, false
      from public.visit_signups g left join public.profiles p on p.id = g.user_id
      where vis and g.at > s
    union all
    -- 🕵️ מישהו מעתיק את המחירים (שרת המחירים, ניקוד 3 ומעלה) — רק למנהלים, פעם אחת לכל כתובת ביום
    select 'scrape', w.day::text || ' ' || w.ip, '🕵️ ' || w.ip || ' מעתיק מחירים (' || w.n || ' בקשות)',
           coalesce(public.scrape_summary(w.ip), ''),
           coalesce((select coalesce(nullif(a->>'email', ''), a->>'name') from jsonb_array_elements(w.accounts) a
                      where a->>'how' in ('login', 'signup', 'guest_signup') and coalesce(a->>'email', a->>'name', '') <> '' limit 1), 'אורח לא מזוהה'),
           w.flagged_at, true
      from public.scrape_watch w where adm and w.flagged_at > s and w.ip <> '*' and not w.own
    union all
    -- 🐞 תקלה באתר (מיומן השגיאות) — רק למנהלים. ✔ טופל בתוסף מוחק אותה מהיומן
    select 'error', x.id::text, left(x.msg, 120), x.src || case when x.ver <> '' then ' · גרסה ' || x.ver else '' end || case when x.ua <> '' then ' · ' || left(x.ua, 60) else '' end,
           coalesce((select pr.name from public.profiles pr where pr.id = x.user_id), 'אורח/ת'), x.created_at, true
      from public.client_errors x where adm and x.created_at > s
  ) e(kind, ref, title, detail, who, created_at, pending)
  order by e.created_at desc
  limit 300;
end $$;
revoke all on function public.staff_events(timestamptz) from public, anon;
grant execute on function public.staff_events(timestamptz) to authenticated;

-- 🛒 רשימות מהקהילה: משתמש בונה רשימה לנושא (למשל "שבת לבית של 8 נפשות") ומשתף אותה לכולם.
--    כל רשימה מתפרסמת רק אחרי אישור צוות. אחרים מדרגים מ-1 עד 5 עגלות ומוסיפים אותה לרשימה שלהם בלחיצה.
--    הרשימות עם הדירוג הגבוה עולות למעלה, ויש "רשימת השבוע" — שהמנהל מכריז עליה (ואם לא הכריז: המובילה בדירוגים של השבוע).
--    הצוות עורך הכל (כולל המוצרים), מאשר, מוחק ומוסיף רשימות בעצמו. עריכה של משתמש מחזירה את הרשימה לאישור.
--    שם המשתף מוצג לכולם רק אם המנהל סימן "להציג שם" (show_author).
create table if not exists public.shared_lists (
  id uuid primary key default gen_random_uuid(),
  author_id uuid default auth.uid() references auth.users(id) on delete set null,
  title text not null check (char_length(title) between 1 and 60),
  emoji text not null default '🛒' check (char_length(emoji) <= 16),
  category text not null default '' check (char_length(category) <= 30),
  description text not null default '' check (char_length(description) <= 500),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 150),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  featured boolean not null default false,
  featured_at timestamptz,
  show_author boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists shared_lists_status on public.shared_lists (status, created_at desc);
create index if not exists shared_lists_author on public.shared_lists (author_id, created_at desc);
alter table public.shared_lists enable row level security;
drop policy if exists "slists read" on public.shared_lists;
drop policy if exists "slists submit" on public.shared_lists;
drop policy if exists "slists own edit" on public.shared_lists;
drop policy if exists "slists own delete" on public.shared_lists;
drop policy if exists "slists staff" on public.shared_lists;
create policy "slists read" on public.shared_lists for select using (status = 'approved' or author_id = auth.uid() or public.is_staff());
create policy "slists submit" on public.shared_lists for insert to authenticated with check (author_id = auth.uid() and public.not_banned());
create policy "slists own edit" on public.shared_lists for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid() and public.not_banned());
create policy "slists own delete" on public.shared_lists for delete to authenticated using (author_id = auth.uid());
create policy "slists staff" on public.shared_lists for all to authenticated using (public.is_staff()) with check (public.is_staff());
revoke all on public.shared_lists from anon;
grant select, insert, update, delete on public.shared_lists to authenticated;

-- ניקוי המוצרים: רק {n: שם (עד 60), q: כמות (עד 20)}, בלי כפילויות וריקים
create or replace function public.shared_list_items_clean(p jsonb) returns jsonb
language plpgsql immutable set search_path = public as $$
declare e jsonb; n text; q text; out jsonb := '[]'::jsonb; seen text[] := '{}';
begin
  if p is null or jsonb_typeof(p) <> 'array' then return out; end if;
  for e in select value from jsonb_array_elements(p) loop
    if jsonb_typeof(e) = 'string' then n := e #>> '{}'; q := '';
    elsif jsonb_typeof(e) = 'object' then n := coalesce(e->>'n', ''); q := coalesce(e->>'q', '');
    else continue; end if;
    n := left(btrim(regexp_replace(n, '\s+', ' ', 'g')), 60); q := left(btrim(q), 20);
    if n = '' or lower(n) = any(seen) then continue; end if;
    seen := seen || lower(n);
    out := out || jsonb_build_array(jsonb_build_object('n', n, 'q', q));
    exit when jsonb_array_length(out) >= 150;
  end loop;
  return out;
end $$;

create or replace function public.shared_lists_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.items := public.shared_list_items_clean(new.items);
  new.title := btrim(new.title); new.category := btrim(new.category); new.description := btrim(new.description);
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  if new.featured and (tg_op = 'INSERT' or not old.featured) then new.featured_at := now(); end if;
  if not new.featured then new.featured_at := null; end if;
  if auth.uid() is null or public.is_staff() then
    if new.featured and new.status <> 'approved' then new.featured := false; new.featured_at := null; end if;
    return new;
  end if;
  -- משתמש רגיל: כל שליחה או עריכה ממתינה לאישור, ואין לו שליטה על "רשימת השבוע" ועל הצגת השם
  if jsonb_array_length(new.items) = 0 then raise exception 'צריך לפחות מוצר אחד ברשימה' using errcode = '22023'; end if;
  new.status := 'pending';
  if tg_op = 'UPDATE' then
    new.author_id := old.author_id; new.created_at := old.created_at;
    new.featured := false; new.featured_at := null; new.show_author := old.show_author;
  else
    new.author_id := auth.uid(); new.featured := false; new.featured_at := null; new.show_author := false; new.updated_at := null; new.created_at := now();
  end if;
  return new;
end $$;
drop trigger if exists shared_lists_guard on public.shared_lists;
create trigger shared_lists_guard before insert or update on public.shared_lists for each row execute function public.shared_lists_guard();
drop trigger if exists rate_limit on public.shared_lists;
create trigger rate_limit before insert on public.shared_lists for each row execute function public.rate_limit_guard('author_id', '10', 'יותר מדי רשימות — נסו שוב בעוד שעה');
drop trigger if exists audit on public.shared_lists;
create trigger audit after insert or update or delete on public.shared_lists for each row execute function public.audit_trigger();

-- רק רשימת שבוע אחת בכל פעם: כשמכריזים על חדשה — הקודמת יורדת
create or replace function public.shared_lists_one_featured() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.featured and (tg_op = 'INSERT' or not old.featured) then
    update public.shared_lists set featured = false where featured and id <> new.id;
  end if;
  return new;
end $$;
drop trigger if exists shared_lists_one_featured on public.shared_lists;
create trigger shared_lists_one_featured after insert or update of featured on public.shared_lists for each row execute function public.shared_lists_one_featured();

-- דירוג: 1 עד 5 עגלות, אחד לכל משתמש לכל רשימה. רק על רשימה מאושרת, ולא על רשימה של עצמי.
create table if not exists public.shared_list_ratings (
  list_id uuid not null references public.shared_lists(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  carts smallint not null check (carts between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);
alter table public.shared_list_ratings enable row level security;
drop policy if exists "slrate own" on public.shared_list_ratings;
create policy "slrate own" on public.shared_list_ratings for all to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.not_banned()
              and exists (select 1 from public.shared_lists l where l.id = list_id and l.status = 'approved' and l.author_id is distinct from auth.uid()));
revoke all on public.shared_list_ratings from anon;
grant select, insert, update, delete on public.shared_list_ratings to authenticated;
create or replace function public.shared_list_rating_touch() returns trigger
language plpgsql set search_path = public as $$
begin new.created_at := now(); return new; end $$;
drop trigger if exists shared_list_rating_touch on public.shared_list_ratings;
create trigger shared_list_rating_touch before update on public.shared_list_ratings for each row execute function public.shared_list_rating_touch();

-- כמה הוסיפו את הרשימה אצלם (כל משתמש נספר פעם אחת)
create table if not exists public.shared_list_adds (
  list_id uuid not null references public.shared_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);
alter table public.shared_list_adds enable row level security;
revoke all on public.shared_list_adds from anon, authenticated;
create or replace function public.shared_list_added(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.shared_list_adds(list_id, user_id)
  select l.id, auth.uid() from public.shared_lists l where l.id = p_id and l.status = 'approved'
  on conflict do nothing;
end $$;
revoke all on function public.shared_list_added(uuid) from public, anon;
grant execute on function public.shared_list_added(uuid) to authenticated;

-- הרשימות + הדירוג. p_scope: 'public' (מאושרות, לכולם) · 'mine' (שלי, כולל ממתינות) · 'all' (הכל — רק לצוות)
-- score = ממוצע "זהיר" (כמו 2 דירוגים של 3 עגלות מראש), כדי שרשימה עם דירוג אחד של 5 לא תקפוץ מעל רשימה עם 40 דירוגים של 4.8
create or replace function public.shared_lists_feed(p_scope text default 'public') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare st boolean := public.is_staff(); me uuid := auth.uid(); res jsonb; wk uuid;
begin
  if p_scope = 'all' and not st then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_scope = 'mine' and me is null then return '[]'::jsonb; end if;
  -- רשימת השבוע: מה שהמנהל הכריז; אחרת — הרשימה עם הדירוג הכי טוב מהשבוע האחרון
  select id into wk from public.shared_lists where featured and status = 'approved' order by featured_at desc nulls last limit 1;
  if wk is null then
    select r.list_id into wk from public.shared_list_ratings r join public.shared_lists l on l.id = r.list_id and l.status = 'approved'
    where r.created_at > now() - interval '7 days'
    group by r.list_id order by (sum(r.carts) + 6.0) / (count(*) + 2) desc, count(*) desc limit 1;
  end if;
  with agg as (
    select r.list_id, count(*)::int as n, round(avg(r.carts)::numeric, 1) as avg, (sum(r.carts) + 6.0) / (count(*) + 2) as score
    from public.shared_list_ratings r group by r.list_id),
  ad as (select a.list_id, count(*)::int as adds from public.shared_list_adds a group by a.list_id)
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', l.id, 'title', l.title, 'emoji', l.emoji, 'category', l.category, 'description', l.description, 'items', l.items,
      'status', case when st or l.author_id = me then l.status end,
      'featured', l.featured, 'week', l.id = wk, 'show_author', case when st then l.show_author end,
      'author', case when st or l.show_author or (me is not null and l.author_id = me) then coalesce(p.name, '') else '' end,
      'author_email', case when public.is_admin() then (select u.email from auth.users u where u.id = l.author_id) end,
      'is_mine', me is not null and l.author_id = me,
      'n', coalesce(g.n, 0), 'avg', coalesce(g.avg, 0), 'score', round(coalesce(g.score, 0)::numeric, 3), 'adds', coalesce(d.adds, 0),
      'mine', (select r.carts from public.shared_list_ratings r where r.list_id = l.id and r.user_id = me),
      'created_at', l.created_at, 'updated_at', l.updated_at)
    order by (l.id = wk) desc, coalesce(g.score, 0) desc, coalesce(g.n, 0) desc, l.created_at desc), '[]'::jsonb)
  into res
  from public.shared_lists l
  left join agg g on g.list_id = l.id left join ad d on d.list_id = l.id left join public.profiles p on p.id = l.author_id
  where case p_scope when 'all' then true when 'mine' then l.author_id = me else l.status = 'approved' end;
  return res;
end $$;
revoke all on function public.shared_lists_feed(text) from public;
grant execute on function public.shared_lists_feed(text) to anon, authenticated;

-- התראות: לצוות — רשימה חדשה לאישור · למשתף — פורסמה / לא פורסמה / נבחרה לרשימת השבוע
create or replace function public.push_on_shared_list() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status <> 'pending') and new.author_id is not null then
    for a in select public.admin_ids() loop
      if a <> new.author_id then
        perform public.push_enqueue(a, 'staff', '🛒 רשימה חדשה מהקהילה לאישור', new.emoji || ' ' || new.title || ' · ' || jsonb_array_length(new.items) || ' מוצרים', '/#admin-commlists', 'slist:' || new.id);
      end if;
    end loop;
  end if;
  if tg_op = 'UPDATE' and new.author_id is not null and new.author_id is distinct from auth.uid() then
    if new.status = 'approved' and old.status <> 'approved' then
      perform public.push_enqueue(new.author_id, 'info', '🎉 הרשימה ששיתפת פורסמה!', new.title || ' — עכשיו כולם יכולים לדרג ולהוסיף אותה', '/#clist=' || new.id, 'myslist:' || new.id);
    elsif new.status = 'rejected' and old.status <> 'rejected' then
      perform public.push_enqueue(new.author_id, 'info', 'לגבי הרשימה ששיתפת', new.title || ' — לא פורסמה הפעם. אפשר לשאול אותנו בצ''אט 🙂', '/#chat', 'myslist:' || new.id);
    end if;
    if new.featured and not old.featured then
      perform public.push_enqueue(new.author_id, 'info', '🏆 הרשימה שלך נבחרה לרשימת השבוע!', new.title, '/#clist=' || new.id, 'slweek:' || new.id);
    end if;
  end if;
  return new;
exception when others then raise notice 'push_on_shared_list: %', sqlerrm; return new;
end $$;
drop trigger if exists push_on_shared_list on public.shared_lists;
create trigger push_on_shared_list after insert or update on public.shared_lists for each row execute function public.push_on_shared_list();

-- ================= 🔗 איחוד שני חשבונות לחשבון משותף אחד =================
-- משתמש א' יוצר קוד איחוד (בתוקף 30 דקות, לשימוש אחד). משתמש ב' מקליד אותו — ומעכשיו שניהם עובדים על אותו חשבון:
-- אותן רשימות, אותה היסטוריה ואותו "הבית שלי". האתר ממזג את מה שהיה לב' לתוך החשבון המשותף.
-- החשבון של ב' עצמו נשמר כמו שהיה, ולכן אפשר לצאת מהאיחוד בכל רגע (ב' יוצא בעצמו, או א' מבטל) ולחזור אליו.
-- האיחוד שמור בשרת (merged_at), כך שכל המכשירים של ב' עוברים לחשבון המשותף — ויוצאים ממנו — לבד.
alter table public.room_members add column if not exists merged_at timestamptz;
create table if not exists public.merge_codes (
  code text primary key,
  host uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes',
  used_at timestamptz,
  used_by uuid
);
create index if not exists merge_codes_host on public.merge_codes (host);
alter table public.merge_codes enable row level security;
-- אין גישה ישירה לטבלה — רק דרך הפונקציות למטה
revoke all on public.merge_codes from anon, authenticated;

-- החדר שאני מאוחד/ת אליו (כשהחשבון שלי מאוחד לחשבון של מישהו אחר)
create or replace function public.merge_guest_row(p_user uuid) returns table(room_code text, owner uuid, merged_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.room_code, r.owner, m.merged_at from public.room_members m join public.rooms r on r.code = m.room_code
  where m.user_id = p_user and m.merged_at is not null and r.owner <> p_user
  order by m.merged_at limit 1;
$$;
revoke all on function public.merge_guest_row(uuid) from public, anon, authenticated;

-- יצירת קוד איחוד (קוד קודם שלא נוצל מתבטל). מי שהחשבון שלו כבר מאוחד לחשבון אחר לא יכול לארח איחוד.
create or replace function public.merge_code_create() returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); c text; abc text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea; i int;
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if exists (select 1 from public.merge_guest_row(uid)) then return jsonb_build_object('error', 'guest'); end if;
  perform public.ensure_my_room();
  delete from public.merge_codes where host = uid and used_at is null;
  if random() < 0.05 then delete from public.merge_codes where expires_at < now() - interval '1 day'; end if;
  loop
    b := gen_random_bytes(8); c := '';
    for i in 0 .. 7 loop c := c || substr(abc, (get_byte(b, i) % 32) + 1, 1); end loop;
    exit when not exists (select 1 from public.merge_codes where code = c);
  end loop;
  insert into public.merge_codes(code, host) values (c, uid);
  return jsonb_build_object('code', c, 'expires_at', now() + interval '30 minutes');
end $$;

create or replace function public.merge_code_cancel() returns void
language sql security definer set search_path = public as $$
  delete from public.merge_codes where host = auth.uid() and used_at is null;
$$;

-- מה מצב האיחוד שלי: guest = החשבון שאני מאוחד/ת אליו, partners = מי שמאוחד לחשבון שלי, pending = קוד שעוד לא נוצל
create or replace function public.merge_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); g record; out jsonb;
begin
  if uid is null then return null; end if;
  select * into g from public.merge_guest_row(uid);
  out := jsonb_build_object(
    'guest', case when g.room_code is null then null else jsonb_build_object('code', g.room_code, 'since', g.merged_at,
      'host_name', (select coalesce(nullif(p.name, ''), 'משתמש') from public.profiles p where p.id = g.owner)) end,
    'partners', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'since', m.merged_at,
        'name', coalesce(nullif(p.name, ''), nullif(m.name, ''), 'משתמש')) order by m.merged_at)
      from public.room_members m join public.rooms r on r.code = m.room_code left join public.profiles p on p.id = m.user_id
      where r.owner = uid and m.user_id <> uid and m.merged_at is not null), '[]'::jsonb),
    'pending', (select jsonb_build_object('code', c.code, 'expires_at', c.expires_at) from public.merge_codes c
      where c.host = uid and c.used_at is null and c.expires_at > now() order by c.created_at desc limit 1));
  return out;
end $$;

-- איחוד: ב' מקליד את הקוד של א'. לכל היותר 20 ניסיונות כושלים בשעה (משותף עם הצטרפות בקוד).
create or replace function public.merge_accept(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
        mc public.merge_codes; rc text; nm text;
begin
  if uid is null then return jsonb_build_object('error', 'login'); end if;
  perform pg_advisory_xact_lock(hashtext('room_join:' || uid::text));
  if (select count(*) from public.room_join_fails where user_id = uid and at > now() - interval '1 hour') >= 20 then
    return jsonb_build_object('error', 'limit');
  end if;
  select * into mc from public.merge_codes where code = c for update;
  if not found or mc.used_at is not null or mc.expires_at < now() then
    insert into public.room_join_fails(user_id) values (uid);
    return jsonb_build_object('error', 'bad');
  end if;
  if mc.host = uid then return jsonb_build_object('error', 'self'); end if;
  if exists (select 1 from public.merge_guest_row(uid)) then return jsonb_build_object('error', 'already'); end if;
  if exists (select 1 from public.room_members m join public.rooms r on r.code = m.room_code
             where r.owner = uid and m.user_id <> uid and m.merged_at is not null) then
    return jsonb_build_object('error', 'is_host');
  end if;
  if exists (select 1 from public.merge_guest_row(mc.host)) then return jsonb_build_object('error', 'bad'); end if;
  select code into rc from public.rooms where owner = mc.host order by updated_at limit 1 for update;
  if rc is null then return jsonb_build_object('error', 'bad'); end if;
  select left(coalesce(nullif(name, ''), 'משתמש'), 40) into nm from public.profiles where id = uid;
  delete from public.room_bans where room_code = rc and user_id = uid;
  insert into public.room_members(room_code, user_id, role, name, perms, merged_at)
  values (rc, uid, 'full', coalesce(nm, 'משתמש'), '{}'::jsonb, now())
  on conflict (room_code, user_id) do update set role = 'full', perms = '{}'::jsonb, merged_at = now();
  update public.merge_codes set used_at = now(), used_by = uid where code = c;
  perform public.push_enqueue(mc.host, 'info', '🔗 ' || coalesce(nm, 'משתמש') || ' איחד/ה את החשבון שלו/ה עם שלך',
    'מעכשיו אתם עובדים על אותן רשימות', '/', 'merge:' || rc);
  return jsonb_build_object('ok', true, 'code', rc,
    'host_name', (select coalesce(nullif(p.name, ''), 'משתמש') from public.profiles p where p.id = mc.host));
end $$;

-- יציאה מהאיחוד (ב' בעצמו). החשבון של ב' חוזר להיות נפרד; כדי להתאחד שוב צריך קוד חדש.
create or replace function public.merge_leave() returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g record; nm text;
begin
  if uid is null then return false; end if;
  select * into g from public.merge_guest_row(uid);
  if g.room_code is null then return false; end if;
  delete from public.room_members where room_code = g.room_code and user_id = uid;
  insert into public.room_bans(room_code, user_id) values (g.room_code, uid) on conflict do nothing;
  select coalesce(nullif(name, ''), 'משתמש') into nm from public.profiles where id = uid;
  perform public.push_enqueue(g.owner, 'info', '🔗 ' || coalesce(nm, 'משתמש') || ' יצא/ה מהאיחוד', 'החשבונות שלכם נפרדו שוב', '/', 'merge:' || g.room_code);
  return true;
end $$;

-- ביטול איחוד ע"י בעל החשבון (א'): ב' חוזר לחשבון שלו, וכבר לא רואה את הרשימות של א'.
create or replace function public.merge_end(p_user uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); rc text;
begin
  if uid is null or p_user is null or p_user = uid then return false; end if;
  with del as (
    delete from public.room_members m using public.rooms r
    where r.code = m.room_code and r.owner = uid and m.user_id = p_user and m.merged_at is not null
    returning m.room_code
  ) select min(room_code) into rc from del;
  if rc is null then return false; end if;
  insert into public.room_bans(room_code, user_id) values (rc, p_user) on conflict do nothing;
  perform public.push_enqueue(p_user, 'info', '🔗 האיחוד בוטל', 'חזרת לחשבון שלך', '/', 'merge:' || rc);
  return true;
end $$;
-- בק אופיס: מי איחד חשבונות עם מי (רק מנהלים), ואפשרות לבטל איחוד
create or replace function public.admin_merges() returns jsonb
language sql stable security definer set search_path = public, auth as $$
  select case when not public.is_admin() then null else coalesce((
    select jsonb_agg(jsonb_build_object(
      'guest_id', m.user_id, 'guest_name', coalesce(nullif(pg.name, ''), nullif(m.name, ''), ''), 'guest_email', coalesce(ug.email, ''),
      'host_id', r.owner, 'host_name', coalesce(ph.name, ''), 'host_email', coalesce(uh.email, ''), 'since', m.merged_at) order by m.merged_at desc)
    from public.room_members m join public.rooms r on r.code = m.room_code
    left join public.profiles pg on pg.id = m.user_id left join auth.users ug on ug.id = m.user_id
    left join public.profiles ph on ph.id = r.owner left join auth.users uh on uh.id = r.owner
    where m.merged_at is not null and m.user_id <> r.owner), '[]'::jsonb) end;
$$;
create or replace function public.admin_merge_end(p_guest uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare rc text;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  with del as (
    delete from public.room_members m using public.rooms r
    where r.code = m.room_code and m.user_id = p_guest and m.merged_at is not null and r.owner <> p_guest
    returning m.room_code
  ) select min(room_code) into rc from del;
  if rc is null then return false; end if;
  insert into public.room_bans(room_code, user_id) values (rc, p_guest) on conflict do nothing;
  return true;
end $$;
revoke all on function public.admin_merges() from public, anon;
revoke all on function public.admin_merge_end(uuid) from public, anon;
grant execute on function public.admin_merges(), public.admin_merge_end(uuid) to authenticated;
revoke all on function public.merge_code_create() from public, anon;
revoke all on function public.merge_code_cancel() from public, anon;
revoke all on function public.merge_status() from public, anon;
revoke all on function public.merge_accept(text) from public, anon;
revoke all on function public.merge_leave() from public, anon;
revoke all on function public.merge_end(uuid) from public, anon;
grant execute on function public.merge_code_create(), public.merge_code_cancel(), public.merge_status(), public.merge_accept(text),
  public.merge_leave(), public.merge_end(uuid) to authenticated;

-- 🎨 ערכת צבעים אישית: כל משתמש בוחר לעצמו (ים / יער / לילה / שקיעה / שמיים) — עוברת איתו לכל מכשיר
alter table public.profiles add column if not exists color_theme text not null default 'sea';
do $$ begin
  alter table public.profiles add constraint profiles_color_theme_check check (color_theme in ('sea','forest','night','sunset','sky'));
exception when duplicate_object then null; end $$;
grant update (color_theme) on public.profiles to authenticated;

-- 🗂️ תצוגת קטגוריות ברשימת הקניות: הבחירה עוברת עם המשתמש לכל מכשיר (אתר, אפליקציה, מחשב). null = עוד לא בחר
alter table public.profiles add column if not exists list_by_cat boolean;
grant update (list_by_cat) on public.profiles to authenticated;

-- ⚙️ הגדרות אישיות שעוברות עם המשתמש לכל מכשיר (אתר, אפליקציה, מחשב): מצב כהה, תצוגת צ'אטים, שפה, גודל כתב ועוד.
-- {"v": {...ההגדרות}, "ts": זמן השינוי האחרון במילישניות}. null = עוד לא נשמר. עד 8KB, רק אובייקט
alter table public.profiles add column if not exists settings jsonb;
do $$ begin
  alter table public.profiles add constraint profiles_settings_check
    check (settings is null or (jsonb_typeof(settings) = 'object' and octet_length(settings::text) <= 8000));
exception when duplicate_object then null; end $$;
grant update (settings) on public.profiles to authenticated;

-- ================= 👁️ חשבון משותף: בעל החשבון בוחר מה השותף רואה =================
-- share = null: השותף רואה ועורך הכל (כמו קודם). אחרת:
--   {"lists": null | ["id",...],   null = כל הרשימות; מערך = רק הרשימות האלה (ורשימות שהשותף עצמו יוצר)
--    "view": {"history":bool,"home":bool,"recipes":bool,"errands":bool,"budget":bool}}
-- שותף מוגבל לא קורא את הטבלה rooms ישירות (RLS) ולא מקבל את הקוד האמיתי — רק כינוי אישי, וכל קריאה וכתיבה עוברות
-- דרך room_get / merge_partner_put, שמסננות בשרת לפי הבחירה. כשמגבילים שותף שכבר הכיר את הקוד — הקוד מתחלף.
alter table public.room_members add column if not exists share jsonb;
alter table public.merge_codes add column if not exists share jsonb;

create or replace function public.merge_share_clean(p jsonb) returns jsonb
language plpgsql immutable set search_path = public as $$
declare l jsonb := null; v jsonb := '{}'::jsonb; s text; all_on boolean := true;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return null; end if;
  if jsonb_typeof(p->'lists') = 'array' then
    select coalesce(jsonb_agg(distinct left(x, 80)), '[]'::jsonb) into l
    from (select x from jsonb_array_elements_text(p->'lists') with ordinality t(x, o) where x <> '' order by o limit 300) q;
  end if;
  foreach s in array array['history','home','recipes','errands','budget'] loop
    v := v || jsonb_build_object(s, coalesce((p->'view'->>s)::boolean, true));
    if not coalesce((p->'view'->>s)::boolean, true) then all_on := false; end if;
  end loop;
  if l is null and all_on then return null; end if;
  return jsonb_build_object('lists', l, 'view', v);
exception when others then return null;
end $$;

create or replace function public.merge_share_keys(p_section text) returns text[]
language sql immutable set search_path = public as $$
  select case p_section
    when 'history' then array['history']
    when 'home'    then array['pantry','customPantry','stock','missingHome','homeMod']
    when 'recipes' then array['customRecipes']
    when 'errands' then array['errands']
    when 'budget'  then array['budget']
    -- רק כשהשותף רואה את כל הרשימות: מה שקשור לכל הרשימות יחד
    when 'all_lists' then array['plans','stats','templates','recurring','knowledge']
    else array[]::text[] end;
$$;

-- גישה ישירה לטבלה rooms — רק לבעלים ולשותף שרואה הכל
create or replace function public.is_room_full(p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.room_members where room_code = p_code and user_id = auth.uid() and role = 'full' and share is null);
$$;
drop policy if exists "members self read" on public.room_members;
create policy "members self read" on public.room_members for select using (user_id = auth.uid() and role <> 'secondary' and share is null);

-- קוד אמיתי — רק לבעלים/שותף מלא; כינוי — לכל אחד, רק עבור עצמו
create or replace function public.room_member_of(p_code text) returns setof public.room_members
language sql stable security definer set search_path = public as $$
  select m.* from public.room_members m
  where m.user_id = auth.uid() and upper(trim(coalesce(p_code, ''))) <> ''
    and ((m.room_code = upper(trim(p_code)) and m.role <> 'secondary' and m.share is null) or m.alias = upper(trim(p_code)))
  limit 1;
$$;
revoke all on function public.room_member_of(text) from public, anon, authenticated;

create or replace function public.room_access(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m public.room_members; r public.rooms;
begin
  select * into m from public.room_member_of(p_code);
  if not found then return null; end if;
  select * into r from public.rooms where code = m.room_code;
  if not found then return null; end if;
  return jsonb_build_object('role', case when r.owner = auth.uid() then 'owner' when m.role <> 'secondary' and m.share is not null then 'partner' else m.role end,
                            'name', m.name,
                            'perms', case when m.role = 'secondary' then m.perms
                                          when m.share is not null then jsonb_build_object('view', (m.share->'view') || jsonb_build_object('lists', true)) else null end,
                            'share', case when m.role <> 'secondary' then m.share else null end,
                            'owner_name', (select coalesce(nullif(p.name, ''), 'משתמש') from public.profiles p where p.id = r.owner));
end $$;

create or replace function public.room_get(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m public.room_members; d jsonb; out jsonb := '{}'::jsonb; s text; k text; vis text[];
begin
  select * into m from public.room_member_of(p_code);
  if not found then return null; end if;
  select data into d from public.rooms where code = m.room_code;
  d := coalesce(d, '{}'::jsonb);
  if m.role = 'secondary' then
    -- כולל tomb (חלק מ-lists): {"items":{id: epoch_ms}, "lists":{id: epoch_ms}}
    foreach s in array array['lists','history','home','recipes'] loop
      if coalesce((m.perms->'view'->>s)::boolean, true) then
        foreach k in array public.room_section_keys(s) loop
          if d ? k then out := out || jsonb_build_object(k, d->k); end if;
        end loop;
      end if;
    end loop;
    return out;
  end if;
  if m.share is null then return d; end if;
  -- 👁️ שותף מוגבל: רק הרשימות והחלקים שבעל החשבון בחר
  if jsonb_typeof(m.share->'lists') = 'array' then
    select array_agg(x) into vis from jsonb_array_elements_text(m.share->'lists') x;
    out := jsonb_build_object('lists', coalesce((select jsonb_agg(l order by o) from jsonb_array_elements(case when jsonb_typeof(d->'lists') = 'array' then d->'lists' else '[]'::jsonb end) with ordinality t(l, o)
                                                 where (l->>'id') = any(coalesce(vis, '{}'))), '[]'::jsonb));
  else
    if d ? 'lists' then out := jsonb_build_object('lists', d->'lists'); end if;
    foreach k in array public.merge_share_keys('all_lists') loop
      if d ? k then out := out || jsonb_build_object(k, d->k); end if;
    end loop;
  end if;
  if d ? 'tomb' then out := out || jsonb_build_object('tomb', d->'tomb'); end if;
  foreach s in array array['history','home','recipes','errands','budget'] loop
    if coalesce((m.share->'view'->>s)::boolean, true) then
      foreach k in array public.merge_share_keys(s) loop
        if d ? k then out := out || jsonb_build_object(k, d->k); end if;
      end loop;
    end if;
  end loop;
  return out;
end $$;

-- 👁️ כתיבה של שותף מוגבל: משנה רק את מה שהוא רואה. רשימות שלא שותפו איתו נשארות בדיוק כמו שהן.
-- רשימה חדשה שהשותף יוצר נכנסת לחשבון המשותף ונשארת גלויה לו.
create or replace function public.merge_partner_put(p_code text, p_data jsonb, p_by text) returns boolean
language plpgsql security definer set search_path = public as $$
declare m public.room_members; d jsonb; s text; k text; vis text[]; old_lists jsonb; new_lists jsonb; added jsonb;
  rl jsonb; ri jsonb; nowms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  select * into m from public.room_member_of(p_code);
  if not found or m.role = 'secondary' or m.share is null then return false; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then return false; end if;
  if octet_length(p_data::text) > 6000000 then raise exception 'הרשימה גדולה מדי לשמירה' using errcode = '54000'; end if;
  p_data := public.room_clean(p_data - 'tomb', 60000);
  select data into d from public.rooms where code = m.room_code for update;
  d := coalesce(d, '{}'::jsonb);
  if jsonb_typeof(m.share->'lists') = 'array' then
    select array_agg(x) into vis from jsonb_array_elements_text(m.share->'lists') x;
    vis := coalesce(vis, '{}');
  end if;
  if jsonb_typeof(p_data->'lists') = 'array' then
    old_lists := case when jsonb_typeof(d->'lists') = 'array' then d->'lists' else '[]'::jsonb end;
    with o as (select l, ord from jsonb_array_elements(old_lists) with ordinality t(l, ord)),
         n as (select distinct on (l->>'id') l, ord from jsonb_array_elements(p_data->'lists') with ordinality t(l, ord)
               where jsonb_typeof(l) = 'object' and coalesce(l->>'id', '') <> '' order by l->>'id', ord),
         r as (
           select case when vis is null or (o.l->>'id') = any(vis) then n.l else o.l end v, 0 k1, o.ord k2
           from o left join n on n.l->>'id' = o.l->>'id'
           where not ((vis is null or (o.l->>'id') = any(vis)) and n.l is null)
           union all
           select n.l, 1, n.ord from n where not exists (select 1 from o where o.l->>'id' = n.l->>'id')
             and not coalesce((d->'tomb'->'lists') ? (n.l->>'id'), false))
    select coalesce(jsonb_agg(v order by k1, k2), '[]'::jsonb) into new_lists from r;
    select coalesce(jsonb_agg(n.l->>'id'), '[]'::jsonb) into added
    from jsonb_array_elements(new_lists) n(l) where not exists (select 1 from jsonb_array_elements(old_lists) o(l) where o.l->>'id' = n.l->>'id');
    d := d || jsonb_build_object('lists', new_lists);
    -- סימוני מחיקה (זמן שרת) לרשימות ולמוצרים שהשותף באמת מחק
    select coalesce(jsonb_object_agg(x.id, nowms), '{}'::jsonb) into rl from (
      select ol->>'id' id from jsonb_array_elements(old_lists) ol
      where ol->>'id' is not null and not exists (select 1 from jsonb_array_elements(new_lists) nl where nl->>'id' = ol->>'id')) x;
    select coalesce(jsonb_object_agg(x.id, nowms), '{}'::jsonb) into ri from (
      select distinct oi->>'id' id
      from jsonb_array_elements(old_lists) ol, jsonb_array_elements(case when jsonb_typeof(ol->'items') = 'array' then ol->'items' else '[]'::jsonb end) oi
      where oi->>'id' is not null and (vis is null or (ol->>'id') = any(vis))
        and not exists (select 1 from jsonb_array_elements(new_lists) nl,
                          jsonb_array_elements(case when jsonb_typeof(nl->'items') = 'array' then nl->'items' else '[]'::jsonb end) ni
                        where ni->>'id' = oi->>'id')) x;
    if rl <> '{}'::jsonb or ri <> '{}'::jsonb then
      d := d || jsonb_build_object('tomb', public.room_tomb_union(d->'tomb', jsonb_build_object('items', ri, 'lists', rl)));
    end if;
    if vis is not null and jsonb_array_length(added) > 0 then
      update public.room_members set share = jsonb_set(share, '{lists}', (
          select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (select jsonb_array_elements_text(share->'lists') x union select jsonb_array_elements_text(added)) q))
        where room_code = m.room_code and user_id = m.user_id;
    end if;
  end if;
  if vis is null then
    foreach k in array public.merge_share_keys('all_lists') loop
      if p_data ? k then d := d || jsonb_build_object(k, p_data->k); end if;
    end loop;
  end if;
  foreach s in array array['history','home','recipes','errands','budget'] loop
    if coalesce((m.share->'view'->>s)::boolean, true) then
      foreach k in array public.merge_share_keys(s) loop
        if p_data ? k then d := d || jsonb_build_object(k, p_data->k); end if;
      end loop;
    end if;
  end loop;
  begin
    update public.rooms set data = d, updated_by = left(coalesce(p_by, ''), 60), updated_at = now() where code = m.room_code;
  exception when check_violation then
    raise exception 'הרשימה גדולה מדי לשמירה' using errcode = '54000';
  end;
  return true;
end $$;

-- החדרים שלי: משתמש משני ושותף מוגבל מקבלים את הכינוי שלהם במקום הקוד
create or replace function public.my_rooms() returns table(code text, owner uuid, role text)
language sql stable security definer set search_path = public as $$
  select (case when (m.role = 'secondary' or m.share is not null) and r.owner <> auth.uid() then m.alias else r.code end)::text, r.owner,
         (case when r.owner = auth.uid() then 'owner' when m.role <> 'secondary' and m.share is not null then 'partner' else m.role end)::text
  from public.room_members m join public.rooms r on r.code = m.room_code
  where m.user_id = auth.uid()
  order by (r.owner = auth.uid()) desc, m.joined_at;
$$;

create or replace function public.merge_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); g record; gm public.room_members; out jsonb;
begin
  if uid is null then return null; end if;
  select * into g from public.merge_guest_row(uid);
  if g.room_code is not null then select * into gm from public.room_members where room_code = g.room_code and user_id = uid; end if;
  out := jsonb_build_object(
    'guest', case when g.room_code is null then null else jsonb_build_object(
      'code', case when gm.share is not null then gm.alias else g.room_code end, 'since', g.merged_at, 'share', gm.share,
      'host_name', (select coalesce(nullif(p.name, ''), 'משתמש') from public.profiles p where p.id = g.owner)) end,
    'partners', coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'since', m.merged_at, 'share', m.share,
        'name', coalesce(nullif(p.name, ''), nullif(m.name, ''), 'משתמש')) order by m.merged_at)
      from public.room_members m join public.rooms r on r.code = m.room_code left join public.profiles p on p.id = m.user_id
      where r.owner = uid and m.user_id <> uid and m.merged_at is not null), '[]'::jsonb),
    'pending', (select jsonb_build_object('code', c.code, 'expires_at', c.expires_at, 'share', c.share) from public.merge_codes c
      where c.host = uid and c.used_at is null and c.expires_at > now() order by c.created_at desc limit 1));
  return out;
end $$;

-- איחוד: כמו קודם, ומה שבעל החשבון בחר לקוד (share) חל מהרגע הראשון — השותף המוגבל מקבל רק כינוי
create or replace function public.merge_accept(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
        mc public.merge_codes; rc text; nm text; al text; sh jsonb;
begin
  if uid is null then return jsonb_build_object('error', 'login'); end if;
  perform pg_advisory_xact_lock(hashtext('room_join:' || uid::text));
  if (select count(*) from public.room_join_fails where user_id = uid and at > now() - interval '1 hour') >= 20 then
    return jsonb_build_object('error', 'limit');
  end if;
  select * into mc from public.merge_codes where code = c for update;
  if not found or mc.used_at is not null or mc.expires_at < now() then
    insert into public.room_join_fails(user_id) values (uid);
    return jsonb_build_object('error', 'bad');
  end if;
  if mc.host = uid then return jsonb_build_object('error', 'self'); end if;
  if exists (select 1 from public.merge_guest_row(uid)) then return jsonb_build_object('error', 'already'); end if;
  if exists (select 1 from public.room_members m join public.rooms r on r.code = m.room_code
             where r.owner = uid and m.user_id <> uid and m.merged_at is not null) then
    return jsonb_build_object('error', 'is_host');
  end if;
  if exists (select 1 from public.merge_guest_row(mc.host)) then return jsonb_build_object('error', 'bad'); end if;
  select code into rc from public.rooms where owner = mc.host order by updated_at limit 1 for update;
  if rc is null then return jsonb_build_object('error', 'bad'); end if;
  sh := public.merge_share_clean(mc.share);
  select left(coalesce(nullif(name, ''), 'משתמש'), 40) into nm from public.profiles where id = uid;
  delete from public.room_bans where room_code = rc and user_id = uid;
  insert into public.room_members(room_code, user_id, role, name, perms, merged_at, share)
  values (rc, uid, 'full', coalesce(nm, 'משתמש'), '{}'::jsonb, now(), sh)
  on conflict (room_code, user_id) do update set role = 'full', perms = '{}'::jsonb, merged_at = now(), share = excluded.share
  returning alias into al;
  update public.merge_codes set used_at = now(), used_by = uid where code = c;
  perform public.push_enqueue(mc.host, 'info', '🔗 ' || coalesce(nm, 'משתמש') || ' איחד/ה את החשבון שלו/ה עם שלך',
    'מעכשיו אתם עובדים על אותן רשימות', '/', 'merge:' || rc);
  return jsonb_build_object('ok', true, 'code', case when sh is null then rc else al end, 'share', sh,
    'host_name', (select coalesce(nullif(p.name, ''), 'משתמש') from public.profiles p where p.id = mc.host));
end $$;

-- עזיבה עם הכינוי: גם שותף מאוחד (מוגבל או מלא) נחסם מלחזור בלי קוד איחוד חדש — כמו merge_leave
create or replace function public.leave_room(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare c text := upper(trim(coalesce(p_code, ''))); m public.room_members;
begin
  if auth.uid() is null or c = '' then return; end if;
  select * into m from public.room_members where user_id = auth.uid() and (room_code = c or alias = c) limit 1;
  if not found then return; end if;
  if exists (select 1 from public.rooms where code = m.room_code and owner = auth.uid()) then return; end if;
  delete from public.room_members where room_code = m.room_code and user_id = auth.uid();
  if m.role = 'secondary' or m.merged_at is not null then
    insert into public.room_bans(room_code, user_id) values (m.room_code, auth.uid()) on conflict do nothing;
  end if;
end $$;
revoke all on function public.leave_room(text) from public, anon;
grant execute on function public.leave_room(text) to authenticated;

-- בעל החשבון קובע מה השותף רואה (p_user = null → לקוד האיחוד שעוד לא נוצל). אפשר לשנות בכל רגע.
create or replace function public.merge_share_set(p_user uuid, p_share jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); sh jsonb := public.merge_share_clean(p_share); m public.room_members; rc text;
begin
  if uid is null then return jsonb_build_object('error', 'login'); end if;
  if p_user is null then
    update public.merge_codes set share = sh where host = uid and used_at is null and expires_at > now();
    if not found then return jsonb_build_object('error', 'no_code'); end if;
    return jsonb_build_object('ok', true, 'share', sh);
  end if;
  select m2.* into m from public.room_members m2 join public.rooms r on r.code = m2.room_code
  where r.owner = uid and m2.user_id = p_user and m2.user_id <> uid and m2.merged_at is not null and m2.role <> 'secondary'
  limit 1 for update of m2;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  update public.room_members set share = sh where room_code = m.room_code and user_id = p_user;
  -- השותף הכיר עד עכשיו את הקוד האמיתי — מחליפים אותו, כדי שלא יוכל לעקוף את ההגבלה
  if m.share is null and sh is not null then rc := public.room_rotate_code(m.room_code); end if;
  perform public.push_enqueue(p_user, 'info', '👁️ החשבון המשותף עודכן',
    case when sh is null then 'מעכשיו את/ה רואה את כל החשבון המשותף' else 'בעל החשבון עדכן מה משותף איתך' end, '/', 'merge:' || coalesce(rc, m.room_code));
  return jsonb_build_object('ok', true, 'share', sh);
end $$;

revoke all on function public.merge_share_clean(jsonb) from public, anon, authenticated;
revoke all on function public.room_access(text) from public, anon;
revoke all on function public.room_get(text) from public, anon;
revoke all on function public.my_rooms() from public, anon;
revoke all on function public.merge_status() from public, anon;
revoke all on function public.merge_accept(text) from public, anon;
revoke all on function public.merge_partner_put(text, jsonb, text) from public, anon;
revoke all on function public.merge_share_set(uuid, jsonb) from public, anon;
grant execute on function public.room_access(text), public.room_get(text), public.my_rooms(), public.merge_status(), public.merge_accept(text),
  public.merge_partner_put(text, jsonb, text), public.merge_share_set(uuid, jsonb) to authenticated;

-- 🛡️ ניקוי אזהרות של בודק האבטחה של Supabase (Security Advisor). חייב להישאר בסוף הקובץ — כך זה חל גם על פונקציות שהוגדרו מחדש למעלה.
-- 1) פונקציות עזר בלי search_path קבוע (function_search_path_mutable): כולן משתמשות רק בפונקציות מובנות ובשמות עם public.
alter function public.name_key(text) set search_path = public;
alter function public.inv_touch() set search_path = public;
alter function public.auth_email_blocked(text) set search_path = public;
alter function public.room_section_keys(text) set search_path = public;
alter function public.room_default_perms() set search_path = public;
alter function public.room_clean_perms(jsonb) set search_path = public;
alter function public.room_tomb_kind(jsonb) set search_path = public;
alter function public.room_tomb_clean(jsonb) set search_path = public;
alter function public.room_tomb_union(jsonb, jsonb) set search_path = public;
alter function public.room_fix_ts(jsonb, text, bigint, bigint) set search_path = public;
-- 2) פונקציות טריגר רצות רק כשהטבלה משתנה — אף אחד לא צריך להפעיל אותן ישירות (anon/authenticated_security_definer_function_executable).
--    הטריגרים עצמם ממשיכים לעבוד: Postgres לא בודק הרשאת EXECUTE כשטריגר מופעל.
do $$ declare f regprocedure; begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prorettype = 'trigger'::regtype loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;

-- 👥 מתכונים לפי מספר סועדים: לכמה סועדים המתכון (serves), וכמות לכל מצרך (qty[i] שייך ל-req[i], למשל "500 גרם").
--    באתר בוחרים לכמה אנשים מבשלים — והכמויות מוכפלות לבד, גם ברשימת הקניות ובשיתוף.
alter table public.recipes add column if not exists serves smallint;
alter table public.recipes add column if not exists qty text[] not null default '{}';
do $$ begin
  alter table public.recipes add constraint recipes_serves_chk check (serves is null or serves between 1 and 100) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.recipes add constraint recipes_qty_size_chk check (cardinality(qty) <= 60 and pg_column_size(qty) < 8000) not valid;
exception when duplicate_object then null; end $$;
-- הקריאה במתכונים מוגבלת לעמודות (בלי author_name) — מאשרים גם את העמודות החדשות
grant select (serves, qty) on public.recipes to anon, authenticated;

-- 🛰️ איסוף המחירים בשרת שלנו (server.yamshopping.com, התיקייה collector/ במאגר):
--    השרת מוריד את קבצי שקיפות המחירים של כל הרשתות, שומר אצלו את המחיר של כל מוצר בכל סניף,
--    ומעלה לכאן רק רשתות, סניפים, מחיר מייצג אחד לכל מוצר בכל רשת ומבצעים פעילים.
--    הרשתות הפעילות והשהיית שבת וחג: site_config ← collector (נקבע בבק אופיס ← 💰 מחירים).
--    השרת כותב עם מפתח השירות (service role), לכן אין כאן הרשאות כתיבה למשתמשים.
alter table public.branches add column if not exists ext_id text check (ext_id is null or char_length(ext_id) <= 40);
create unique index if not exists branches_ext_id on public.branches (ext_id);
alter table public.prices add column if not exists origin text not null default '' check (char_length(origin) <= 60);
create index if not exists prices_origin on public.prices (origin, barcode) where origin <> '';
grant select (origin) on public.prices to anon, authenticated;
create table if not exists public.collector_status (
  chain text primary key check (char_length(chain) <= 60),
  name text not null default '' check (char_length(name) <= 60),
  enabled boolean not null default true,
  last_run timestamptz,
  last_ok timestamptz,
  stores int not null default 0,
  items int not null default 0,
  files int not null default 0,
  error text not null default '' check (char_length(error) <= 500),
  info jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.collector_status enable row level security;
drop policy if exists "collector status admin" on public.collector_status;
create policy "collector status admin" on public.collector_status for select using (public.is_admin());
revoke insert, update, delete on public.collector_status from anon, authenticated;

-- 🔎 סטטיסטיקה של "איפה הכי זול": כל חיפוש מחירים מהשרת (מוצר אחד או רשימה) נשמר כאן — כדי לראות בבק אופיס ← 💰 מחירים
--    כמה מחפשים, כמה אנשים שונים, ומה הכי מחפשים. משתמש רשום נשמר לפי החשבון; אורח — רק לפי המזהה האקראי של המכשיר
--    (אותו מזהה של "ניסיון בלי הרשמה", בלי שם, מייל או IP). חיפושים של הצוות מסומנים, ולא נספרים כברירת מחדל. נשמר שנה.
create table if not exists public.price_searches (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  guest uuid,
  staff boolean not null default false,
  mode text not null default '' check (char_length(mode) <= 12),
  src text not null default '' check (char_length(src) <= 12),
  city text not null default '' check (char_length(city) <= 40),
  items text[] not null default '{}' check (cardinality(items) <= 60)
);
create index if not exists price_searches_at on public.price_searches (at desc);
alter table public.price_searches enable row level security;
revoke all on public.price_searches from anon, authenticated;
create or replace function public.price_search_log(p_guest uuid, p_mode text, p_src text, p_city text, p_items text[]) returns void
language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); its text[];
begin
  select coalesce(array_agg(x), '{}') into its from (
    select left(lower(btrim(regexp_replace(t, '[[:cntrl:]<>]', '', 'g'))), 60) x from unnest(coalesce(p_items, '{}')) t
  ) z where x <> '';
  its := its[1:60];
  if cardinality(its) = 0 then return; end if;
  if me is null and p_guest is null then return; end if;
  -- הגבלה: עד 200 חיפושים בשעה לאדם, ועד 5000 בשעה מאורחים בסך הכל
  if (select count(*) from public.price_searches where at > now() - interval '1 hour'
        and (case when me is not null then user_id = me else user_id is null and guest = p_guest end)) >= 200 then return; end if;
  if me is null and (select count(*) from public.price_searches where user_id is null and at > now() - interval '1 hour') >= 5000 then return; end if;
  insert into public.price_searches(user_id, guest, staff, mode, src, city, items)
  values (me, case when me is null then p_guest end, me is not null and public.is_staff(),
          case when p_mode in ('city','near','mine','store') then p_mode else '' end,
          case when p_src in ('site','yami') then p_src else '' end,
          left(regexp_replace(coalesce(p_city, ''), '[[:cntrl:]<>]', '', 'g'), 40), its);
  if random() < 0.01 then delete from public.price_searches where at < now() - interval '365 days'; end if;
end $$;
revoke all on function public.price_search_log(uuid, text, text, text, text[]) from public;
grant execute on function public.price_search_log(uuid, text, text, text, text[]) to anon, authenticated;
-- הסיכום לבק אופיס (מנהלים בלבד): סה"כ חיפושים, כמה אנשים, לפי יום, המוצרים הכי מבוקשים והחיפושים האחרונים
create or replace function public.admin_price_search_stats(p_days int default 30, p_staff boolean default false) returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare s timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
begin
  if not public.is_admin() then return null; end if;
  return (with q as (select * from public.price_searches where at > s and (coalesce(p_staff, false) or not staff))
  select jsonb_build_object(
    'total', (select count(*) from q),
    'users', (select count(distinct user_id) from q),
    'guests', (select count(distinct guest) from q where user_id is null),
    'single', (select count(*) from q where cardinality(items) = 1),
    'lists', (select count(*) from q where cardinality(items) > 1),
    'yami', (select count(*) from q where src = 'yami'),
    'repeat', (select count(*) from (select coalesce(user_id, guest) k from q group by 1 having count(distinct at::date) > 1) r),
    'modes', coalesce((select jsonb_object_agg(m, n) from (select coalesce(nullif(mode, ''), 'other') m, count(*) n from q group by 1) x), '{}'::jsonb),
    'days', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'n', n, 'people', p) order by d) from (
        select (at at time zone 'Asia/Jerusalem')::date d, count(*) n, count(distinct coalesce(user_id, guest)) p from q group by 1) x), '[]'::jsonb),
    'top', coalesce((select jsonb_agg(jsonb_build_object('q', it, 'n', n, 'single', one, 'people', p) order by n desc, it) from (
        select it, count(*) n, count(*) filter (where cardinality(q.items) = 1) one, count(distinct coalesce(user_id, guest)) p
        from q, unnest(q.items) it group by it order by n desc, it limit 40) x), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(jsonb_build_object('city', city, 'n', n) order by n desc) from (
        select city, count(*) n from q where city <> '' group by city order by n desc limit 15) x), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('at', r.at, 'name', coalesce(p.name, ''), 'guest', r.user_id is null, 'staff', r.staff,
          'mode', r.mode, 'src', r.src, 'city', r.city, 'items', to_jsonb(r.items[1:8]), 'n', cardinality(r.items)) order by r.at desc)
        from (select * from q order by at desc limit 60) r left join public.profiles p on p.id = r.user_id), '[]'::jsonb)
  ) from (select 1) one);
end $$;
revoke all on function public.admin_price_search_stats(int, boolean) from public, anon;
grant execute on function public.admin_price_search_stats(int, boolean) to authenticated;

-- 📱/🌐 מי משתמש מהאתר ומי מהאפליקציה לאנדרואיד (בבק אופיס ← 👥 משתמשים).
--    האפליקציה מוסיפה "YamShoppingApp/" לזיהוי הדפדפן שלה. מעכשיו touch_presence (כל דקה כשהאתר פתוח) שומר
--    מתי המשתמש נראה לאחרונה באתר ומתי באפליקציה; לפני כן — לפי ההרשמה והכניסות שביומן האבטחה (auth_events).
alter table public.profiles add column if not exists seen_web_at timestamptz;
alter table public.profiles add column if not exists seen_app_at timestamptz;
drop function if exists public.touch_presence(text);
create or replace function public.touch_presence(p_name text default null, p_app boolean default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.profiles(id, name, seen_web_at, seen_app_at)
  values (auth.uid(), coalesce(left(p_name,40),''), case when p_app is false then now() end, case when p_app then now() end)
  on conflict (id) do update
    set last_seen = now(),
        name = case when coalesce(p_name,'') <> '' then left(p_name,40) else public.profiles.name end,
        seen_web_at = case when p_app is false then now() else public.profiles.seen_web_at end,
        seen_app_at = case when p_app then now() else public.profiles.seen_app_at end;
end $$;
revoke all on function public.touch_presence(text, boolean) from public, anon;
grant execute on function public.touch_presence(text, boolean) to authenticated;
create or replace function public.admin_user_platforms() returns table(user_id uuid, web_at timestamptz, app_at timestamptz, signup_from text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select p.id,
    greatest(p.seen_web_at, e.web_at), greatest(p.seen_app_at, e.app_at),
    coalesce(s.src, '')
  from public.profiles p
  left join lateral (select max(a.created_at) filter (where a.ua like '%YamShoppingApp/%') app_at,
                            max(a.created_at) filter (where a.ua <> '' and a.ua not like '%YamShoppingApp/%') web_at
                     from public.auth_events a where a.user_id = p.id and a.kind in ('signup','login','google_login')) e on true
  left join lateral (select case when a.ua like '%YamShoppingApp/%' then 'app' when a.ua <> '' then 'web' else '' end src
                     from public.auth_events a where a.user_id = p.id and a.kind in ('signup','google_login') order by a.created_at limit 1) s on true;
end $$;
revoke all on function public.admin_user_platforms() from public, anon;
grant execute on function public.admin_user_platforms() to authenticated;
-- 🕵️ ניטור העתקה (scraping) של שרת המחירים: השרת (server.yamshopping.com) רושם כל בקשה, ובכל ריצה שעתית מעלה לכאן
--    את מי שנראה חשוד ביומיים האחרונים (כלי אוטומטי, פנייה ישירה לשרת ולא דרך האתר, מעבר על הרבה סניפים או מוצרים,
--    הרבה בקשות), ושורת סיכום לכל יום (ip = '*'). מנהלים רואים בבק אופיס ← 💰 מחירים. נשמר 30 יום.
--    החסימות נשמרות ב-site_config 'scrape' → {"blocked":[{"ip":"1.2.3.4","note":"","at":"..."}]}, והשרת קורא אותן כל שעה.
create table if not exists public.scrape_watch (
  day date not null,
  ip text not null check (char_length(ip) <= 64),
  peer text not null default '' check (char_length(peer) <= 64),
  n int not null default 0,
  site int not null default 0,
  limited int not null default 0,
  blocked int not null default 0,
  ua text not null default '' check (char_length(ua) <= 200),
  stores int not null default 0,
  queries int not null default 0,
  cities int not null default 0,
  ips int not null default 0,
  eps jsonb not null default '{}'::jsonb,
  samples text[] not null default '{}',
  reasons text[] not null default '{}',
  score int not null default 0,
  first_at timestamptz,
  last_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (day, ip)
);
alter table public.scrape_watch enable row level security;
drop policy if exists "scrape watch admin" on public.scrape_watch;
create policy "scrape watch admin" on public.scrape_watch for select using (public.is_admin());
revoke insert, update, delete on public.scrape_watch from anon, authenticated;
-- רשימת החסומים לא גלויה לכולם (כמו 'ai' ו-'security')
drop policy if exists "config read" on public.site_config;
create policy "config read" on public.site_config for select using (key not in ('ai','security','scrape') or public.is_admin());

-- ================= בדיקת אבטחה 10.2026: מגבלת חברי רשימה משניים =================
-- secondary_limit(משתמש) נקראת רק מתוך פונקציות השרת של החדרים — לא צריך לאפשר לכל אחד באינטרנט לשאול על משתמש אחר.
revoke all on function public.secondary_limit(uuid) from public, anon, authenticated;

-- 🕵️ ניטור העתקה — פרטים מלאים על כל כתובת (השרת ממלא אותם בכל שעה):
--    own = השרת שלנו או כתובת פנימית (לא חשוד, אי אפשר לחסום) · geo = מיקום משוער (מדינה, אזור, עיר, נקודה במפה),
--    ספק האינטרנט / הארגון, האם שרת בענן או VPN, ומי זה כשידוע (label: own / internal / claude / searchbot)
--    accounts = חשבונות באתר שקשורים לכתובת: נכנסו או נרשמו ממנה (login / signup — לפי יומן הכניסות), האתר דיווח שהם
--    המחוברים (site — לא מאומת), או אורח בלי חשבון (guest) שאולי נרשם אחר כך (guest_signup)
--    uas = כל הכלים (User-Agent) · city_list = הערים שחיפשו · flagged_at = מתי הכתובת נחשבה חשודה לראשונה (לתוסף הצוות)
alter table public.scrape_watch add column if not exists own boolean not null default false;
alter table public.scrape_watch add column if not exists geo jsonb not null default '{}'::jsonb;
alter table public.scrape_watch add column if not exists accounts jsonb not null default '[]'::jsonb;
alter table public.scrape_watch add column if not exists uas text[] not null default '{}';
alter table public.scrape_watch add column if not exists city_list text[] not null default '{}';
alter table public.scrape_watch add column if not exists flagged_at timestamptz;
create or replace function public.scrape_watch_flag() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.ip <> '*' and not new.own and new.score >= 3 then
    new.flagged_at := coalesce(case when tg_op = 'UPDATE' then old.flagged_at end, now());
  elsif tg_op = 'UPDATE' then
    new.flagged_at := old.flagged_at;
  end if;
  return new;
end $$;
drop trigger if exists scrape_watch_flag on public.scrape_watch;
create trigger scrape_watch_flag before insert or update on public.scrape_watch for each row execute function public.scrape_watch_flag();
create index if not exists scrape_watch_flagged on public.scrape_watch (flagged_at desc) where flagged_at is not null;

-- שורה אחת בעברית על כתובת: מיקום · ספק · שרת/VPN · חשבון · כמה סניפים ומוצרים · הכלי (להתראות ולתוסף הצוות)
create or replace function public.scrape_summary(p_ip text) returns text
language sql stable security definer set search_path = public as $$
  select concat_ws(' · ',
    nullif(concat_ws(', ', nullif(w.geo->>'city', ''), nullif(w.geo->>'country', '')), ''),
    nullif(w.geo->>'org', ''),
    case when (w.geo->>'hosting')::boolean then 'שרת בענן או VPN' end,
    coalesce((select string_agg(distinct coalesce(nullif(a->>'email', ''), a->>'name'), ', ')
                from jsonb_array_elements(w.accounts) a where a->>'how' in ('login', 'signup', 'guest_signup') and coalesce(a->>'email', a->>'name', '') <> ''),
             (select 'אולי ' || string_agg(distinct a->>'email', ', ') from jsonb_array_elements(w.accounts) a where a->>'how' = 'site' and a->>'email' <> ''),
             'אורח בלי חשבון'),
    w.stores || ' סניפים, ' || w.queries || ' מוצרים',
    nullif(left(w.ua, 40), ''))
  from public.scrape_watch w where w.ip = p_ip order by w.day desc limit 1;
$$;
revoke all on function public.scrape_summary(text) from public, anon, authenticated;

-- 🤖 מי מוריד את האפליקציה לאנדרואיד (APK) וכמה. האתר רושם כל לחיצה על "הורדת האפליקציה" (kind = download),
--    והאפליקציה עצמה רושמת פעם אחת לכל מכשיר כשהיא נפתחת בפעם הראשונה (kind = open — כלומר הותקנה ונפתחה).
--    נשמר: מתי, מי (אם מחובר; אורח — לפי מזהה המכשיר, ואם נרשם אחר כך רואים מי), כתובת IP ומדינה (מ-Cloudflare
--    שלפני Supabase), סוג המכשיר, ומאיפה לחצו (מסך הכניסה / התפריט / קישור #apk). עיר וספק אינטרנט משלים
--    שרת המחירים פעם בשעה (geoip, כמו ב"מי מעתיק את המחירים"). רואים בבק אופיס ← 👀 מבקרים. נשמר שנה.
create table if not exists public.apk_downloads (
  id bigserial primary key,
  at timestamptz not null default now(),
  kind text not null default 'download' check (kind in ('download', 'open', 'off_open', 'off_sync', 'off_live')),
  user_id uuid references auth.users(id) on delete set null,
  dev text not null default '',
  ip text not null default '',
  country text not null default '',
  geo jsonb,
  device text not null default '',
  app_ver text not null default '',
  src text not null default ''
);
create index if not exists apk_downloads_at on public.apk_downloads (at desc);
create index if not exists apk_downloads_ip on public.apk_downloads (ip, at desc);
create index if not exists apk_downloads_nogeo on public.apk_downloads (id) where geo is null and ip <> '';
create unique index if not exists apk_downloads_open_once on public.apk_downloads (dev) where kind = 'open' and dev <> '';
-- 📴 נובמבר 2026: "רשימת קניות אופליין" (בלי אינטרנט) — טלפון מחובר שסנכרן איתה מדווח עליה פעם אחת לכל מכשיר (kind = off_open,
--    הכתובת והמדינה הן של הטלפון המדווח). הורדה של האפליקציה האופליין מהאתר = download עם src = offline
alter table public.apk_downloads drop constraint if exists apk_downloads_kind_check;
-- off_sync = כל חיבור (סנכרון) של אפליקציה אופליין עם האתר או עם האפליקציה הרגילה. src = מי התחבר ואיך: site-bt / app-qr / site-file (קובץ בכבל USB) ...
--    נספר פעם ב-6 שעות לכל מכשיר ולכל דרך, כדי שסנכרון חי בבלוטות' לא ייספר מאות פעמים
--    off_live (אופליין 1.4, נובמבר 2026) = "מחובר עכשיו": בזמן חיבור חי בבלוטות' נשלח כל 10 דקות, ונמחק אחרי 3 ימים
alter table public.apk_downloads add constraint apk_downloads_kind_check check (kind in ('download', 'open', 'off_open', 'off_sync', 'off_live'));
create unique index if not exists apk_downloads_offopen_once on public.apk_downloads (dev) where kind = 'off_open' and dev <> '';
alter table public.apk_downloads enable row level security;
revoke all on public.apk_downloads from anon, authenticated;
-- כתובת ה-IP של מי שקרא לפונקציה — באותו סדר אמינות כמו ב-auth-guard
create or replace function public.req_ip() returns text
language plpgsql stable set search_path = public as $$
declare h jsonb; v text;
begin
  begin h := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb; exception when others then return ''; end;
  v := coalesce(nullif(trim(h->>'cf-connecting-ip'), ''), nullif(trim(h->>'x-real-ip'), ''),
                nullif(trim(regexp_replace(coalesce(h->>'x-forwarded-for', ''), '^.*,', '')), ''), '');
  return case when v ~ '^[0-9a-fA-F:.]{3,45}$' then v else '' end;
end $$;
revoke all on function public.req_ip() from public, anon, authenticated;
create or replace function public.apk_log(p_kind text, p_src text default '', p_device text default '', p_dev text default '', p_ver text default '') returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare v_ip text := public.req_ip(); h jsonb; cc text := ''; d text := ''; ok boolean;
begin
  if p_kind not in ('download', 'open', 'off_open', 'off_sync', 'off_live') then return false; end if;
  if coalesce(p_dev, '') ~ '^[0-9a-f-]{36}$' then d := p_dev; end if;
  -- 🟢 off_live: אפליקציה אופליין מחוברת עכשיו בבלוטות' לאתר / לאפליקציה (נשלח כל 10 דקות בזמן החיבור) — "מי מחובר עכשיו" בבק אופיס.
  --    לא נספר במגבלה לכתובת (חיבור ארוך היה ממלא אותה), אבל לא יותר מפעם ב-8 דקות לטלפון, ונמחק אחרי 3 ימים
  if p_kind = 'off_live' and (d = '' or coalesce(p_src, '') !~ '^(site|app)-bt$'
     or exists (select 1 from public.apk_downloads where dev = d and kind = 'off_live' and at > now() - interval '8 minutes')) then return false; end if;
  if p_kind = 'off_sync' and (d = '' or coalesce(p_src, '') !~ '^(site|app)-(bt|qr|code|file)$'
     or exists (select 1 from public.apk_downloads where dev = d and kind = 'off_sync' and src = p_src and at > now() - interval '6 hours')) then return false; end if;
  -- הגבלה: עד 10 בשעה מאותה כתובת, ועד 500 בשעה בסך הכל
  if (p_kind <> 'off_live' and v_ip <> '' and (select count(*) from public.apk_downloads a where a.ip = v_ip and a.at > now() - interval '1 hour') >= 10)
     or (select count(*) from public.apk_downloads where at > now() - interval '1 hour') >= 500 then return false; end if;
  -- אותו מכשיר לחץ שוב תוך 10 דקות — לא נספר פעמיים
  if p_kind = 'download' and d <> '' and exists (select 1 from public.apk_downloads where dev = d and kind = 'download' and at > now() - interval '10 minutes') then return false; end if;
  begin h := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb; cc := upper(coalesce(h->>'cf-ipcountry', '')); exception when others then null; end;
  insert into public.apk_downloads(kind, user_id, dev, ip, country, device, app_ver, src)
  values (p_kind, auth.uid(), d, v_ip, case when cc ~ '^[A-Z]{2}$' then cc else '' end,
          left(regexp_replace(coalesce(p_device, ''), '[^[:alnum:][:space:]·./()_-]', '', 'g'), 60),
          left(regexp_replace(coalesce(p_ver, ''), '[^0-9.]', '', 'g'), 12),
          case when p_src in ('login', 'menu', 'link', 'install', 'update', 'mail', 'offline') or p_src ~ '^(site|app)-(bt|qr|code|file)$' then p_src else '' end)
  on conflict do nothing;
  ok := found;  -- נשמר לפני הניקוי: ה-delete משנה את found, ואז פעם ב-100 הכניסה דווחה כלא נרשמה
  if random() < 0.01 then delete from public.apk_downloads where at < now() - interval '1 year' or (kind = 'off_live' and at < now() - interval '3 days'); end if;
  return ok;
end $$;
revoke all on function public.apk_log(text, text, text, text, text) from public;
grant execute on function public.apk_log(text, text, text, text, text) to anon, authenticated;
-- נכנס לחשבון אחרי שהאפליקציה נפתחה / אחרי שהוריד כאורח — מצרפים את החשבון לשורות של המכשיר הזה
create or replace function public.apk_claim(p_dev text) returns void
language sql volatile security definer set search_path = public as $$
  update public.apk_downloads set user_id = auth.uid()
   where auth.uid() is not null and coalesce(p_dev, '') ~ '^[0-9a-f-]{36}$' and dev = p_dev and user_id is null and at > now() - interval '30 days';
$$;
revoke all on function public.apk_claim(text) from public, anon;
grant execute on function public.apk_claim(text) to authenticated;
-- לבק אופיס: כל ההורדות והפתיחות. שם תמיד; מייל רק למי שמותר לו; IP ומיקום מדויק — רק למנהלים
-- via (רק בשורות "הותקנה ונפתחה"): site = כנראה הורד מהאתר שלנו (הייתה לחיצה על "הורדת האפליקציה" מאותה כתובת IP
--    או מאותו חשבון ב-3 הימים שלפני), other = הורד ממקום אחר (אתר של חבר כמו אוגן פליי, קובץ שהועבר בוואטסאפ וכו')
drop function if exists public.staff_apk_downloads(int);
create or replace function public.staff_apk_downloads(p_days int default 30)
returns table(id bigint, at timestamptz, kind text, user_id uuid, name text, email text, guest boolean, ip text, country text, geo jsonb, device text, app_ver text, src text, via text, dev text)
language plpgsql stable security definer set search_path = public, auth as $$
declare em boolean := public.staff_can('emails'); adm boolean := public.is_admin();
begin
  if not public.is_staff() or not public.staff_can('visitors') then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select a.id, a.at, a.kind, coalesce(a.user_id, g.converted_user),
         coalesce(p.name, '')::text, (case when em then coalesce(u.email, '') else '' end)::text,
         a.user_id is null,
         (case when adm then a.ip else '' end)::text, a.country,
         case when adm then a.geo else (case when a.geo ? 'city' then jsonb_build_object('city', a.geo->'city', 'country', a.geo->'country') end) end,
         a.device, a.app_ver, a.src,
         (case when a.kind = 'off_open' then
                 -- 📴 אופליין: "מהאתר" אם מי שסנכרן אותו (אותו חשבון / אותה רשת) הוריד את האופליין מהאתר ב-30 הימים שלפני
                 (case when exists (select 1 from public.apk_downloads d where d.kind = 'download' and d.src = 'offline'
                              and d.at between a.at - interval '30 days' and a.at + interval '5 minutes'
                              and ((a.ip <> '' and d.ip = a.ip) or (d.user_id is not null and d.user_id = coalesce(a.user_id, g.converted_user))))
                       then 'site' else 'other' end)
               when a.kind <> 'open' then ''
               when exists (select 1 from public.apk_downloads d where d.kind = 'download'
                              and d.at between a.at - interval '3 days' and a.at + interval '5 minutes'
                              and ((a.ip <> '' and d.ip = a.ip) or (d.user_id is not null and d.user_id = coalesce(a.user_id, g.converted_user))))
               then 'site' else 'other' end)::text,
         (case when a.kind in ('off_open', 'off_sync', 'off_live') then a.dev else '' end)::text
    from public.apk_downloads a
    left join public.guest_visits g on a.user_id is null and a.dev <> '' and g.id::text = a.dev
    left join public.profiles p on p.id = coalesce(a.user_id, g.converted_user)
    left join auth.users u on u.id = coalesce(a.user_id, g.converted_user)
   where a.at > now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 366))
   order by a.at desc limit 3000;
end $$;
revoke all on function public.staff_apk_downloads(int) from public, anon;
grant execute on function public.staff_apk_downloads(int) to authenticated;

-- 📱 שימוש באפליקציה — מכל מקום שממנו הורידו אותה (האתר שלנו, אוגן פליי, קובץ שהועבר...).
--    האפליקציה פותחת את האתר החי, ולכן כל טלפון עם האפליקציה (בכל גרסה) מדווח פעם ביום שהיא נפתחה: מזהה המכשיר, החשבון (אם מחובר) והגרסה.
--    כך רואים בבק אופיס ← 👀 מבקרים כמה טלפונים משתמשים בה בכל יום, ומי — גם מי שלא הוריד מהאתר. נשמר שנה.
create table if not exists public.apk_active (
  day date not null default ((now() at time zone 'Asia/Jerusalem')::date),
  dev text not null,
  user_id uuid references auth.users(id) on delete set null,
  app_ver text not null default '',
  device text not null default '',
  hits int not null default 1,
  last_at timestamptz not null default now(),
  primary key (day, dev)
);
create index if not exists apk_active_dev on public.apk_active (dev, day desc);
alter table public.apk_active enable row level security;
revoke all on public.apk_active from anon, authenticated;
-- 🔄 אילו גרסאות היו בכל טלפון ומתי כל גרסה נראתה לראשונה — כך רואים בבק אופיס מי עדכן (גם עדכון מתוך האפליקציה,
--    שלא עובר דרך כפתור ההורדה באתר) ומאיזו גרסה לאיזו. שורה אחת לכל טלפון + גרסה.
create table if not exists public.apk_versions (
  dev text not null,
  ver text not null,
  first_at timestamptz not null default now(),
  primary key (dev, ver)
);
alter table public.apk_versions enable row level security;
revoke all on public.apk_versions from anon, authenticated;
-- מילוי חד-פעמי ממה שכבר נרשם (ימי שימוש ופתיחות ראשונות) — רק מוסיף, לא משנה שורות קיימות
insert into public.apk_versions(dev, ver, first_at)
select dev, ver, min(at) from (
  select dev, app_ver as ver, (day::timestamp at time zone 'Asia/Jerusalem') + interval '12 hours' as at from public.apk_active
  union all
  select dev, app_ver, at from public.apk_downloads where kind = 'open' and dev ~ '^[0-9a-f-]{36}$'
) z where ver ~ '^[0-9]{1,4}(\.[0-9]{1,4}){0,3}$' group by dev, ver
on conflict (dev, ver) do nothing;
create or replace function public.apk_ping(p_dev text, p_ver text default '', p_device text default '') returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare d text := ''; t date := (now() at time zone 'Asia/Jerusalem')::date;
        v text := left(regexp_replace(coalesce(p_ver, ''), '[^0-9.]', '', 'g'), 12);
begin
  if coalesce(p_dev, '') ~ '^[0-9a-f-]{36}$' then d := p_dev; else return false; end if;
  if v !~ '^[0-9]{1,4}(\.[0-9]{1,4}){0,3}$' then v := ''; end if;
  -- הגבלה: עד 5,000 טלפונים חדשים ביום
  if not exists (select 1 from public.apk_active where day = t and dev = d)
     and (select count(*) from public.apk_active where day = t) >= 5000 then return false; end if;
  insert into public.apk_active(day, dev, user_id, app_ver, device)
  values (t, d, auth.uid(), v,
          left(regexp_replace(coalesce(p_device, ''), '[^[:alnum:][:space:]·./()_-]', '', 'g'), 60))
  on conflict (day, dev) do update set hits = least(public.apk_active.hits + 1, 10000), last_at = now(),
    user_id = coalesce(auth.uid(), public.apk_active.user_id),
    app_ver = case when excluded.app_ver <> '' then excluded.app_ver else public.apk_active.app_ver end;
  if v <> '' and (select count(*) from public.apk_versions where dev = d) < 30 then
    insert into public.apk_versions(dev, ver) values (d, v) on conflict (dev, ver) do nothing;
  end if;
  if random() < 0.005 then delete from public.apk_active where day < t - 366; delete from public.apk_versions where first_at < now() - interval '2 years'; end if;
  return true;
end $$;
revoke all on function public.apk_ping(text, text, text) from public;
grant execute on function public.apk_ping(text, text, text) to anon, authenticated;
-- 🟢 "מי מחובר עכשיו" גם באפליקציה: כל עוד האפליקציה פתוחה ומוצגת, היא מעדכנת כל 2 דקות את זמן השימוש האחרון
--    של הטלפון באותו יום (רק last_at — בלי להוסיף "פתיחות"). אין שורה להיום → מחזיר false, והאתר שולח apk_ping רגיל.
create or replace function public.apk_seen(p_dev text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
begin
  if coalesce(p_dev, '') !~ '^[0-9a-f-]{36}$' then return false; end if;
  update public.apk_active set last_at = now(), user_id = coalesce(auth.uid(), user_id)
   where day = (now() at time zone 'Asia/Jerusalem')::date and dev = p_dev and last_at < now() - interval '60 seconds';
  return found or exists (select 1 from public.apk_active where day = (now() at time zone 'Asia/Jerusalem')::date and dev = p_dev);
end $$;
revoke all on function public.apk_seen(text) from public;
grant execute on function public.apk_seen(text) to anon, authenticated;
-- לבק אופיס: לכל טלפון — מי, מתי השתמש לראשונה ולאחרונה, בכמה ימים, גרסה, ומאיפה הוריד (site / other / '' = לא ידוע)
-- vers: כל הגרסאות שהיו בטלפון הזה (מאז ומעולם), לפי הסדר: [{"v":"1.3","at":...},{"v":"1.5","at":...}] — יותר מאחת = עדכן
-- 🔁 הסרה והתקנה מחדש: כשמסירים את האפליקציה נמחק גם המזהה האקראי שלה, ולכן התקנה חדשה נראית כמו טלפון חדש.
--    בלי שום מזהה חומרה מחברים בין ההתקנות לפי מה שכבר נשמר: אותו חשבון (או, לאורחים, אותה כתובת IP בפתיחה הראשונה)
--    + אותו דגם טלפון, וההתקנה הקודמת הפסיקה לפני שהחדשה נפתחה. prev_at = מתי השתמשו לאחרונה בהתקנה הקודמת (= בערך מתי הוסרה),
--    next_at = ההתקנה הזו הוחלפה בהתקנה חדשה (= הוסרה), sure = לפי החשבון ואותו דגם (בלי sure = "כנראה").
drop function if exists public.staff_apk_activity(int);
create or replace function public.staff_apk_activity(p_days int default 30)
returns table(dev_no int, user_id uuid, name text, email text, first_day date, last_day date, last_at timestamptz,
              days_used int, opens int, app_ver text, device text, via text, daily jsonb, vers jsonb,
              prev_at timestamptz, prev_sure boolean, next_at timestamptz, next_sure boolean)
language plpgsql stable security definer set search_path = public, auth as $$
declare em boolean := public.staff_can('emails'); n int := least(greatest(coalesce(p_days, 30), 1), 366);
        t date := (now() at time zone 'Asia/Jerusalem')::date;
begin
  if not public.is_staff() or not public.staff_can('visitors') then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  with x as (
    select a.dev, max(a.user_id::text)::uuid as uid, min(a.day) as d0, max(a.day) as d1, max(a.last_at) as la,
           count(*)::int as nd, sum(a.hits)::int as nh,
           (array_agg(a.app_ver order by a.day desc))[1] as ver, (array_agg(a.device order by a.day desc))[1] as dv,
           jsonb_agg(a.day order by a.day) as days
      from public.apk_active a where a.day > t - n group by a.dev),
  o as (
    select distinct on (op.dev) op.dev, op.at, op.ip, op.user_id from public.apk_downloads op
     where op.kind = 'open' and op.dev <> '' and op.dev in (select x.dev from x) order by op.dev, op.at),
  -- כל ההתקנות בשנה האחרונה (גם מחוץ לטווח), עם מי, הדגם (מה שאחרי "Android · "), ה-IP והזמן של הפתיחה הראשונה
  ph as (
    select a.dev, max(a.user_id::text)::uuid as uid, max(a.last_at) as la, min(a.day) as d0,
           coalesce(substring((array_agg(a.device order by a.day desc))[1] from '^[^·]*·[^·]*· *(.+)$'), '') as model
      from public.apk_active a where a.day > t - 366 group by a.dev),
  pi as (
    select ph.dev, ph.la, ph.model,
           coalesce(ph.uid, fo.user_id, gv.converted_user) as who, coalesce(fo.ip, '') as ip,
           coalesce(fo.at, (ph.d0::timestamp at time zone 'Asia/Jerusalem')) as op_at
      from ph
      left join lateral (select f.user_id, f.ip, f.at from public.apk_downloads f where f.kind = 'open' and f.dev = ph.dev order by f.at limit 1) fo on true
      left join public.guest_visits gv on gv.id::text = ph.dev)
  select (row_number() over (order by x.la desc))::int,
         coalesce(x.uid, o.user_id, g.converted_user),
         coalesce(p.name, '')::text, (case when em then coalesce(u.email, '') else '' end)::text,
         x.d0, x.d1, x.la, x.nd, x.nh, x.ver, x.dv,
         (case when o.dev is null then ''
               when exists (select 1 from public.apk_downloads d where d.kind = 'download'
                              and d.at between o.at - interval '3 days' and o.at + interval '5 minutes'
                              and ((o.ip <> '' and d.ip = o.ip) or (d.user_id is not null and d.user_id = coalesce(x.uid, o.user_id, g.converted_user))))
               then 'site' else 'other' end)::text,
         x.days,
         coalesce((select jsonb_agg(jsonb_build_object('v', av.ver, 'at', av.first_at) order by string_to_array(av.ver, '.')::int[], av.first_at)
                     from public.apk_versions av where av.dev = x.dev), '[]'::jsonb),
         pr.la, pr.sure, nx.op_at, nx.sure
    from x
    left join o on o.dev = x.dev
    left join pi me on me.dev = x.dev
    -- ההתקנה הקודמת באותו טלפון: הסתיימה (שימוש אחרון) לפני שההתקנה הזו נפתחה
    left join lateral (
      select q.la, (q.who is not null and q.who = me.who and q.model <> '' and q.model = me.model) as sure from pi q
       where q.dev <> me.dev and q.la < me.op_at + interval '5 minutes' and q.op_at < me.op_at
         and (q.model = me.model or ((q.model = '' or me.model = '') and q.who = me.who))
         and ((me.who is not null and q.who = me.who) or (me.ip <> '' and q.ip = me.ip and me.model <> '' and (q.who is null or me.who is null)))
       order by 2 desc, q.la desc limit 1) pr on true
    -- ההתקנה הבאה באותו טלפון: נפתחה אחרי השימוש האחרון בהתקנה הזו — כלומר זו הוסרה
    left join lateral (
      select q.op_at, (q.who is not null and q.who = me.who and q.model <> '' and q.model = me.model) as sure from pi q
       where q.dev <> me.dev and q.op_at > me.la - interval '5 minutes' and q.op_at > me.op_at
         and (q.model = me.model or ((q.model = '' or me.model = '') and q.who = me.who))
         and ((me.who is not null and q.who = me.who) or (me.ip <> '' and q.ip = me.ip and me.model <> '' and (q.who is null or me.who is null)))
       order by 2 desc, q.op_at limit 1) nx on true
    left join public.guest_visits g on g.id::text = x.dev
    left join public.profiles p on p.id = coalesce(x.uid, o.user_id, g.converted_user)
    left join auth.users u on u.id = coalesce(x.uid, o.user_id, g.converted_user)
   order by x.la desc limit 3000;
end $$;
revoke all on function public.staff_apk_activity(int) from public, anon;
grant execute on function public.staff_apk_activity(int) to authenticated;

-- ---------- ⚠️ עדכון אפליקציה שנכשל (נובמבר 2026) ----------
-- כשהעדכון מתוך האפליקציה לא מצליח, הטלפון מדווח למה: סוג השגיאה (למשל http_418 = חסימה של סינון כמו נטפרי),
-- הגרסה שמותקנת, הגרסה שניסו להוריד, דגם הטלפון וסוג החיבור (wifi / סלולרי). בבק אופיס ← 👀 מבקרים רואים את זה.
create table if not exists public.app_update_errors (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  dev text not null default '',
  ip text not null default '',
  app_ver text not null default '',
  target_ver text not null default '',
  err text not null default '',
  net text not null default '',
  device text not null default ''
);
create index if not exists app_update_errors_at on public.app_update_errors (at desc);
alter table public.app_update_errors enable row level security;
revoke all on public.app_update_errors from public, anon, authenticated;

create or replace function public.app_update_fail(p_dev text, p_ver text, p_target text, p_err text, p_net text default '', p_device text default '') returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare v_ip text := public.req_ip(); d text := '';
begin
  if coalesce(p_dev, '') ~ '^[0-9a-f-]{36}$' then d := p_dev; end if;
  -- הגבלה: עד 10 בשעה מאותה כתובת או מאותו טלפון, ועד 300 בשעה בסך הכל
  if (v_ip <> '' and (select count(*) from public.app_update_errors a where a.ip = v_ip and a.at > now() - interval '1 hour') >= 10)
     or (d <> '' and (select count(*) from public.app_update_errors a where a.dev = d and a.at > now() - interval '1 hour') >= 10)
     or (select count(*) from public.app_update_errors where at > now() - interval '1 hour') >= 300 then return false; end if;
  insert into public.app_update_errors(user_id, dev, ip, app_ver, target_ver, err, net, device)
  values (auth.uid(), d, v_ip,
          left(regexp_replace(coalesce(p_ver, ''), '[^0-9.]', '', 'g'), 12),
          left(regexp_replace(coalesce(p_target, ''), '[^0-9.]', '', 'g'), 12),
          left(regexp_replace(coalesce(p_err, ''), '[^A-Za-z0-9 _.:/-]', '', 'g'), 120),
          case when p_net in ('wifi', 'cellular', 'ethernet', 'none', 'other') then p_net else '' end,
          left(regexp_replace(coalesce(p_device, ''), '[^[:alnum:][:space:]·./()_-]', '', 'g'), 60));
  if random() < 0.01 then delete from public.app_update_errors where at < now() - interval '1 year'; end if;
  return true;
end $$;
revoke all on function public.app_update_fail(text, text, text, text, text, text) from public;
grant execute on function public.app_update_fail(text, text, text, text, text, text) to anon, authenticated;

-- לבק אופיס: מי לא הצליח לעדכן ולמה. IP רק למנהלים, מייל רק למי שמותר לו
create or replace function public.staff_app_update_errors(p_days int default 30)
returns table(id bigint, at timestamptz, user_id uuid, name text, email text, ip text, app_ver text, target_ver text, err text, net text, device text)
language plpgsql stable security definer set search_path = public, auth as $$
declare em boolean := public.staff_can('emails'); adm boolean := public.is_admin();
begin
  if not public.is_staff() or not public.staff_can('visitors') then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select a.id, a.at, a.user_id, coalesce(p.name, '')::text, (case when em then coalesce(u.email, '') else '' end)::text,
         (case when adm then a.ip else '' end)::text, a.app_ver, a.target_ver, a.err, a.net, a.device
    from public.app_update_errors a
    left join public.profiles p on p.id = a.user_id
    left join auth.users u on u.id = a.user_id
   where a.at > now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 366))
   order by a.at desc limit 2000;
end $$;
revoke all on function public.staff_app_update_errors(int) from public, anon;
grant execute on function public.staff_app_update_errors(int) to authenticated;

-- ---------- 📧 מייל שבועי למשתמשים (דרך Resend) ----------
-- הפונקציה email שולחת לכל היותר X מיילים ביום (ברירת מחדל 95 — המכסה החינמית של Resend היא 100 ביום ו-3,000 בחודש),
-- כך שכל משתמש מקבל מייל בתורו, לכל היותר פעם בשבוע. לא בשבת ולא ביום טוב.
-- בכל מייל: קישור להסרה (גם בלחיצה אחת מתוך ג'ימייל), "אהבתי", ומעקב פתיחה ולחיצה.
create table if not exists public.email_subs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly boolean not null default true,
  status text not null default 'ok' check (status in ('ok', 'bounced', 'complained')),
  unsub_at timestamptz,
  unsub_how text not null default '' check (char_length(unsub_how) <= 20),
  unsub_reason text not null default '' check (char_length(unsub_reason) <= 300),
  updated_at timestamptz not null default now()
);
alter table public.email_subs enable row level security;
drop policy if exists "email subs admin read" on public.email_subs;
create policy "email subs admin read" on public.email_subs for select using (public.is_admin() and public.staff_can('emails'));
-- מתי ואיך המשתמש ביקש את המייל השבועי (מהאתר או מקישור "להירשם שוב" במייל). המייל יוצא לכל מי שלא הסיר את עצמו — החלטת הבעלים
alter table public.email_subs add column if not exists consent_at timestamptz;
alter table public.email_subs add column if not exists consent_how text not null default '';
do $$ begin
  alter table public.email_subs add constraint email_subs_consent_how_len check (char_length(consent_how) <= 20);
exception when duplicate_object then null; end $$;

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null default '' check (char_length(subject) <= 150),
  preheader text not null default '' check (char_length(preheader) <= 200),
  intro text not null default '' check (char_length(intro) <= 3000),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 8),
  outro text not null default '' check (char_length(outro) <= 1500),
  cta text not null default 'לכניסה לאתר' check (char_length(cta) <= 40),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'paused', 'done', 'canceled')),
  send_at timestamptz,
  auto boolean not null default false,
  note text not null default '' check (char_length(note) <= 200),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
alter table public.email_campaigns enable row level security;
drop policy if exists "email campaigns admin" on public.email_campaigns;
create policy "email campaigns admin" on public.email_campaigns for all using (public.is_admin()) with check (public.is_admin());
-- מייל שממשיך מאיפה שמייל קודם נעצר: מי שכבר קיבל את הקודם (או את מי שהוא המשיך) — לא מקבל את החדש
alter table public.email_campaigns add column if not exists continues uuid references public.email_campaigns(id) on delete set null;
alter table public.email_campaigns drop constraint if exists email_campaigns_continues_self;
alter table public.email_campaigns add constraint email_campaigns_continues_self check (continues is null or continues <> id);
-- רק מייל אחד בשליחה בכל רגע
create unique index if not exists email_campaigns_one_sending on public.email_campaigns ((true)) where status = 'sending';

create table if not exists public.email_sends (
  id bigserial primary key,
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null default '',
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  test boolean not null default false,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'bounced', 'complained')),
  provider_id text not null default '',
  error text not null default '',
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  opened_at timestamptz, opens int not null default 0,
  clicked_at timestamptz, clicks int not null default 0,
  liked_at timestamptz,
  unsub_at timestamptz,
  complained_at timestamptz,
  bounced_at timestamptz
);
create unique index if not exists email_sends_once on public.email_sends (campaign_id, user_id) where not test;
create index if not exists email_sends_user on public.email_sends (user_id, sent_at desc);
create index if not exists email_sends_provider on public.email_sends (provider_id) where provider_id <> '';
create index if not exists email_sends_time on public.email_sends (sent_at desc);
alter table public.email_sends enable row level security;
drop policy if exists "email sends admin read" on public.email_sends;
create policy "email sends admin read" on public.email_sends for select using (public.is_admin() and public.staff_can('emails'));

-- מצב הריצה האחרונה (לבק אופיס)
create table if not exists public.email_state (
  id int primary key default 1 check (id = 1),
  last_run timestamptz, last_sent timestamptz, last_error text not null default '', last_note text not null default ''
);
insert into public.email_state(id) values (1) on conflict do nothing;
alter table public.email_state add column if not exists last_cron timestamptz;
alter table public.email_state enable row level security;
drop policy if exists "email state admin read" on public.email_state;
create policy "email state admin read" on public.email_state for select using (public.is_admin());

-- המשתמש: האם לקבל את המייל השבועי (מתג בתפריט באתר ובאפליקציה)
create or replace function public.email_weekly_get() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select weekly and status = 'ok' from public.email_subs where user_id = auth.uid()), true);
$$;
revoke all on function public.email_weekly_get() from public, anon;
grant execute on function public.email_weekly_get() to authenticated;
create or replace function public.email_weekly_set(p_on boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.email_subs(user_id, weekly, status, unsub_at, unsub_how, updated_at, consent_at, consent_how)
  values (auth.uid(), coalesce(p_on, true), 'ok', case when p_on then null else now() end, case when p_on then '' else 'site' end, now(),
          case when p_on then now() end, case when p_on then 'site' else '' end)
  on conflict (user_id) do update set weekly = excluded.weekly, updated_at = now(),
    consent_at = case when excluded.weekly then now() else public.email_subs.consent_at end,
    consent_how = case when excluded.weekly then 'site' else public.email_subs.consent_how end,
    status = case when excluded.weekly then 'ok' else public.email_subs.status end,
    unsub_at = case when excluded.weekly then null else coalesce(public.email_subs.unsub_at, now()) end,
    unsub_how = case when excluded.weekly then '' when public.email_subs.weekly then 'site' else public.email_subs.unsub_how end,
    unsub_reason = case when excluded.weekly then '' else public.email_subs.unsub_reason end;
  return coalesce(p_on, true);
end $$;
revoke all on function public.email_weekly_set(boolean) from public, anon;
grant execute on function public.email_weekly_set(boolean) to authenticated;

-- מי מקבל עכשיו (רק פונקציית השרת): מייל מאומת, לא הסיר את עצמו, לא קיבל את המייל הזה, ולא קיבל מייל ב-6 הימים האחרונים.
-- קודם מי שלא קיבל מייל הכי הרבה זמן — כך כולם מקבלים בתורם.
-- סדר העדיפות (בבק אופיס): fair = מי שלא קיבל הכי הרבה זמן · inactive = מי שהכי פחות נכנס לאתר · active = הפעילים קודם · new = הנרשמים החדשים קודם
drop function if exists public.email_pick(uuid, int, boolean);
create or replace function public.email_pick(p_campaign uuid, p_limit int, p_gap boolean default true, p_order text default 'fair')
returns table(user_id uuid, email text, name text)
language sql stable security definer set search_path = public, auth as $$
  -- סדר עדיפות קבוע: בסדר "הכי פחות פעילים" / "הכי פעילים" / "חדשים" עוברים ברשימה לפי הסדר בדיוק.
  -- מי שקיבל מייל אחר ב-6 הימים האחרונים לא מדולג — עוצרים לפניו ומחכים, כדי שהסדר לא יתבלגן.
  -- בסדר "בתורות" (fair) מדלגים עליו וממשיכים לבא בתור.
  -- המייל הזה + המיילים שהוא ממשיך (שרשרת "ממשיך מאיפה שנעצר")
  with recursive chain(id, depth) as (
    select p_campaign, 0
    union
    select k.continues, chain.depth + 1 from public.email_campaigns k join chain on k.id = chain.id
     where k.continues is not null and chain.depth < 20
  ), c as (
    select u.id, u.email::text as email, coalesce(p.name, '')::text as name,
           (p_gap and exists (select 1 from public.email_sends e where e.user_id = u.id and not e.test and e.status <> 'failed' and e.sent_at > now() - interval '6 days')) as gapped,
           row_number() over (order by
             case when p_order = 'inactive' then extract(epoch from coalesce(p.last_seen, u.created_at)) end asc nulls last,
             case when p_order = 'active' then extract(epoch from coalesce(p.last_seen, u.created_at)) end desc nulls last,
             case when p_order = 'new' then extract(epoch from coalesce(p.created_at, u.created_at)) end desc nulls last,
             (select max(e.sent_at) from public.email_sends e where e.user_id = u.id and not e.test) nulls first, coalesce(p.created_at, u.created_at), u.id) as rn
      from auth.users u
      left join public.profiles p on p.id = u.id
      left join public.email_subs s on s.user_id = u.id
     where u.email_confirmed_at is not null and coalesce(u.email, '') like '%_@_%._%'
       and u.deleted_at is null and (u.banned_until is null or u.banned_until < now())
       and coalesce(u.is_anonymous, false) = false
       and lower(coalesce(u.email, '')) not like '%@nomail.yamshopping.com'
       and coalesce(s.weekly, true) and coalesce(s.status, 'ok') = 'ok'
       and not exists (select 1 from public.email_sends e where e.campaign_id in (select chain.id from chain) and e.user_id = u.id and not e.test)
  )
  select c.id, c.email, c.name from c
   where not c.gapped
     and (p_order not in ('inactive', 'active', 'new') or c.rn < coalesce((select min(g.rn) from c g where g.gapped), 9223372036854775807))
   order by c.rn
   limit greatest(coalesce(p_limit, 0), 0);
$$;
revoke all on function public.email_pick(uuid, int, boolean, text) from public, anon, authenticated;

-- כמה מיילים יצאו היום (שעון ישראל) וב-30 הימים האחרונים — כולל מיילי ניסיון, כי גם הם נספרים במכסה
create or replace function public.email_counts() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'today', (select count(*) from public.email_sends where status <> 'failed' and sent_at >= ((now() at time zone 'Asia/Jerusalem')::date::timestamp at time zone 'Asia/Jerusalem')),
    'month', (select count(*) from public.email_sends where status <> 'failed' and sent_at > now() - interval '30 days'));
$$;
revoke all on function public.email_counts() from public, anon, authenticated;

-- התראה למנהלים (למשל: "הטיוטה השבועית מוכנה")
create or replace function public.email_admin_push(p_title text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  for a in select distinct x from public.admin_ids() x loop
    perform public.push_enqueue(a, 'info', p_title, p_body, '/#admin', 'mail-draft');
  end loop;
exception when others then null;
end $$;
revoke all on function public.email_admin_push(text, text) from public, anon, authenticated;

-- לבק אופיס: סיכום לכל מייל
create or replace function public.email_campaign_stats()
returns table(campaign_id uuid, sent bigint, failed bigint, delivered bigint, opened bigint, clicked bigint, liked bigint, unsub bigint, complained bigint, bounced bigint, tests bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select e.campaign_id,
    count(*) filter (where not e.test and e.status <> 'failed' and e.status <> 'queued'),
    count(*) filter (where not e.test and e.status = 'failed'),
    count(*) filter (where not e.test and e.delivered_at is not null),
    count(*) filter (where not e.test and e.opened_at is not null),
    count(*) filter (where not e.test and e.clicked_at is not null),
    count(*) filter (where not e.test and e.liked_at is not null),
    count(*) filter (where not e.test and e.unsub_at is not null),
    count(*) filter (where not e.test and e.complained_at is not null),
    count(*) filter (where not e.test and e.bounced_at is not null),
    count(*) filter (where e.test)
  from public.email_sends e group by e.campaign_id;
end $$;
revoke all on function public.email_campaign_stats() from public, anon;
grant execute on function public.email_campaign_stats() to authenticated;

-- לבק אופיס: כמה יקבלו, כמה הסירו, כמה חזרו/דיווחו
create or replace function public.email_audience() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'confirmed', (select count(*) from auth.users u where u.email_confirmed_at is not null and u.deleted_at is null and coalesce(u.is_anonymous, false) = false),
    'unsub', (select count(*) from public.email_subs where not weekly),
    'bounced', (select count(*) from public.email_subs where weekly and status = 'bounced'),
    'complained', (select count(*) from public.email_subs where status = 'complained'),
    'counts', public.email_counts());
end $$;
revoke all on function public.email_audience() from public, anon;
grant execute on function public.email_audience() to authenticated;

-- לבק אופיס: למי נשלח מייל מסוים ומה עשו איתו (שם + מייל — רק עם הרשאת "מיילים")
create or replace function public.email_recipients(p_campaign uuid)
returns table(user_id uuid, name text, email text, test boolean, status text, sent_at timestamptz, delivered_at timestamptz, opened_at timestamptz, opens int,
              clicked_at timestamptz, clicks int, liked_at timestamptz, unsub_at timestamptz, complained_at timestamptz, bounced_at timestamptz, error text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_admin() and public.staff_can('emails')) then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select e.user_id, coalesce(p.name, '')::text, e.email, e.test, e.status, e.sent_at, e.delivered_at, e.opened_at, e.opens,
                      e.clicked_at, e.clicks, e.liked_at, e.unsub_at, e.complained_at, e.bounced_at, e.error
    from public.email_sends e left join public.profiles p on p.id = e.user_id
   where e.campaign_id = p_campaign order by e.sent_at desc limit 5000;
end $$;
revoke all on function public.email_recipients(uuid) from public, anon;
grant execute on function public.email_recipients(uuid) to authenticated;

-- לבק אופיס: מי הסיר את עצמו / מייל שחזר / דיווח ספאם
create or replace function public.email_unsubs()
returns table(user_id uuid, name text, email text, weekly boolean, status text, unsub_at timestamptz, unsub_how text, unsub_reason text, updated_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not (public.is_admin() and public.staff_can('emails')) then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select s.user_id, coalesce(p.name, '')::text, coalesce(u.email, '')::text, s.weekly, s.status, s.unsub_at, s.unsub_how, s.unsub_reason, s.updated_at
    from public.email_subs s left join public.profiles p on p.id = s.user_id left join auth.users u on u.id = s.user_id
   where not s.weekly or s.status <> 'ok' order by s.updated_at desc limit 3000;
end $$;
revoke all on function public.email_unsubs() from public, anon;
grant execute on function public.email_unsubs() to authenticated;

-- לבק אופיס: כמה נשלח בכל יום (יום = 00:00–00:00 שעון ישראל), לכל מייל בנפרד
create or replace function public.email_daily(p_days int default 14)
returns table(day date, campaign_id uuid, subject text, sent bigint, failed bigint, opened bigint, clicked bigint, liked bigint, unsub bigint, tests bigint, first_at timestamptz, last_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select (e.sent_at at time zone 'Asia/Jerusalem')::date, e.campaign_id, coalesce(c.subject, '')::text,
    count(*) filter (where not e.test and e.status not in ('failed', 'queued')),
    count(*) filter (where not e.test and e.status = 'failed'),
    count(*) filter (where not e.test and e.opened_at is not null),
    count(*) filter (where not e.test and e.clicked_at is not null),
    count(*) filter (where not e.test and e.liked_at is not null),
    count(*) filter (where not e.test and e.unsub_at is not null),
    count(*) filter (where e.test),
    min(e.sent_at), max(e.sent_at)
  from public.email_sends e left join public.email_campaigns c on c.id = e.campaign_id
  where e.sent_at >= (((now() at time zone 'Asia/Jerusalem')::date - greatest(0, least(coalesce(p_days, 14), 120)))::timestamp at time zone 'Asia/Jerusalem')
  group by 1, 2, 3 order by 1 desc, 11;
end $$;
revoke all on function public.email_daily(int) from public, anon;
grant execute on function public.email_daily(int) to authenticated;

-- לבק אופיס: למי נשלח ביום מסוים (שם + מייל — רק עם הרשאת "מיילים")
create or replace function public.email_day_recipients(p_day date)
returns table(user_id uuid, name text, email text, subject text, test boolean, status text, sent_at timestamptz, opened_at timestamptz, opens int,
              clicked_at timestamptz, liked_at timestamptz, unsub_at timestamptz, complained_at timestamptz, bounced_at timestamptz, error text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_admin() and public.staff_can('emails')) then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select e.user_id, coalesce(p.name, '')::text, e.email, coalesce(c.subject, '')::text, e.test, e.status, e.sent_at, e.opened_at, e.opens,
                      e.clicked_at, e.liked_at, e.unsub_at, e.complained_at, e.bounced_at, e.error
    from public.email_sends e left join public.profiles p on p.id = e.user_id left join public.email_campaigns c on c.id = e.campaign_id
   where e.sent_at >= (p_day::timestamp at time zone 'Asia/Jerusalem') and e.sent_at < ((p_day + 1)::timestamp at time zone 'Asia/Jerusalem')
   order by e.sent_at desc limit 3000;
end $$;
revoke all on function public.email_day_recipients(date) from public, anon;
grant execute on function public.email_day_recipients(date) to authenticated;

-- לבק אופיס: כמה עוד יקבלו את המייל — מוכנים עכשיו, ומחכים כי קיבלו מייל אחר ב-6 הימים האחרונים
create or replace function public.email_left(p_campaign uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r int; a int;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select count(*) into r from public.email_pick(p_campaign, 100000, true);
  select count(*) into a from public.email_pick(p_campaign, 100000, false);
  return jsonb_build_object('ready', r, 'waiting', greatest(0, a - r));
end $$;
revoke all on function public.email_left(uuid) from public, anon;
grant execute on function public.email_left(uuid) to authenticated;

-- לבק אופיס: האם השעון האוטומטי (pg_cron) קיים ורץ
create or replace function public.email_cron_info() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare j jsonb := '{}'::jsonb; runs jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if to_regclass('cron.job') is null then return jsonb_build_object('cron', false); end if;
  begin
    execute $q$select coalesce((select jsonb_build_object('schedule', schedule, 'active', active, 'jobid', jobid) from cron.job where jobname = 'yam-mail' limit 1), '{}'::jsonb)$q$ into j;
    if j ? 'jobid' and to_regclass('cron.job_run_details') is not null then
      execute $q$select coalesce(jsonb_agg(x order by x->>'start' desc), '[]'::jsonb) from (select jsonb_build_object('start', start_time, 'status', status, 'msg', left(coalesce(return_message, ''), 200)) x
                 from cron.job_run_details where jobid = $1 order by start_time desc limit 3) t$q$ into runs using (j->>'jobid')::bigint;
    end if;
  exception when others then return jsonb_build_object('cron', true, 'error', sqlerrm);
  end;
  return jsonb_build_object('cron', true, 'job', j, 'runs', runs);
end $$;
revoke all on function public.email_cron_info() from public, anon;
grant execute on function public.email_cron_info() to authenticated;

-- צילומי המסך למייל: דלי ציבורי mail (רק תמונות, עד 3MB). רק מנהלים מעלים ומוחקים
do $$ begin
  if to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('mail', 'mail', true, 3145728, array['image/jpeg','image/png','image/webp'])
      on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg','image/png','image/webp'];
    drop policy if exists "mail images read" on storage.objects;
    drop policy if exists "mail images admin insert" on storage.objects;
    drop policy if exists "mail images admin delete" on storage.objects;
    create policy "mail images read" on storage.objects for select to anon, authenticated using (bucket_id = 'mail');
    create policy "mail images admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'mail' and public.is_admin());
    create policy "mail images admin delete" on storage.objects for delete to authenticated using (bucket_id = 'mail' and public.is_admin());
  end if;
end $$;

-- "דפיקה" על פונקציית המייל כל שעה (היא בודקת לבד אם עכשיו מותר לשלוח)
create or replace function public.email_poke() returns void
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  select cron_key into k from public.auth_secret where id = 1;
  begin
    execute 'select net.http_post(url := $1, body := $2, headers := $3)'
      using 'https://ygyfodxfbebnkwdcbjrp.supabase.co/functions/v1/email', '{"run":true}'::jsonb,
            jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', coalesce(k, ''));
  exception when others then null;
  end;
end $$;
revoke all on function public.email_poke() from public, anon, authenticated;
do $$ begin
  if to_regnamespace('cron') is not null then
    execute $c$select cron.schedule('yam-mail', '*/5 * * * *', 'select public.email_poke()')$c$;
  end if;
exception when others then raise notice 'cron mail: %', sqlerrm; end $$;

-- =====================================================================
-- ===== 🙋 אישור כניסה ידני מהבק אופיס =====
-- מי שלא מצליח להיכנס (שכח את הקוד, אין לו מייל, נחסם אחרי כניסות כושלות, או נתקע באפליקציה)
-- שולח ממסך הכניסה "בקשת אישור כניסה". המנהל רואה את הבקשה בבק אופיס ← 🙋 אישור כניסה, מאשר — והמשתמש נכנס.
-- הכל עובר דרך auth-guard: הבקשה, האישור (רק מנהלים) והחיבור עצמו. אף אחד לא קורא או כותב כאן ישירות חוץ מקריאה של מנהלים.
-- =====================================================================
create table if not exists public.login_requests (
  id uuid primary key default gen_random_uuid(),
  secret_hash text not null,
  code text not null default '',
  name text not null default '',
  email text not null default '',
  note text not null default '',
  ip text not null default '',
  ua text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'used', 'expired', 'cancelled')),
  user_id uuid references auth.users(id) on delete set null,
  user_email text not null default '',
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
-- kind: request = בקשה מהמשתמש · pre = אישור מראש שהמנהל נתן למייל (נכנסים איתו פעם אחת עד expires_at, בלי קוד)
alter table public.login_requests add column if not exists kind text not null default 'request';
alter table public.login_requests add column if not exists expires_at timestamptz;
create index if not exists login_requests_status on public.login_requests (status, created_at desc);
create index if not exists login_requests_pre on public.login_requests (user_email, kind, status);
create index if not exists login_requests_ip on public.login_requests (ip, created_at desc);
alter table public.login_requests enable row level security;
revoke all on public.login_requests from anon, authenticated;
grant select, insert, update, delete on public.login_requests to service_role;
drop policy if exists "login requests admin read" on public.login_requests;
create policy "login requests admin read" on public.login_requests for select to authenticated using (public.is_admin());
grant select on public.login_requests to authenticated;

-- התראה לטלפון של המנהלים כשמגיעה בקשה חדשה (נקרא רק מ-auth-guard)
create or replace function public.login_request_push(p_name text, p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare a uuid;
begin
  for a in select distinct x from public.admin_ids() x loop
    perform public.push_enqueue(a, 'staff', '🙋 בקשת אישור כניסה',
      left(coalesce(nullif(trim(p_name), ''), 'משתמש'), 40) || ' מבקש/ת לאשר לו/ה כניסה (מספר ' || left(coalesce(p_code, ''), 6) || ')',
      '/#admin-loginreq', 'loginreq');
  end loop;
exception when others then null;
end $$;
revoke all on function public.login_request_push(text, text) from public, anon, authenticated;
grant execute on function public.login_request_push(text, text) to service_role;

-- בקשות ישנות נמחקות אחרי 90 יום
delete from public.login_requests where created_at < now() - interval '90 days';

-- ---------- 🤖 מעקב אחרי עדכוני האפליקציה לאנדרואיד ----------
-- מי שלחץ "לעקוב אחרי עדכונים" בחלון הורדת האפליקציה: כשעולה גרסה חדשה (download/app-version.json באתר)
-- הוא מקבל התראה בפעמון באתר, ומייל אחד (הפונקציה email שולחת בריצה של כל שעה, בתוך המכסה היומית, לא בשבת וחג).
-- follow_ver = הגרסה שהייתה כשהתחיל לעקוב (לא מתריעים לו עליה) · notified_ver = הגרסה האחרונה שנשלח עליה מייל
create table if not exists public.app_follows (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  follow_ver text not null default '' check (char_length(follow_ver) <= 20),
  notified_ver text not null default '' check (char_length(notified_ver) <= 20),
  mailed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.app_follows enable row level security;
revoke all on public.app_follows from anon, authenticated;
grant select, insert, update, delete on public.app_follows to service_role;

create or replace function public.app_follow_get() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('on', true, 'ver', follow_ver) from public.app_follows where user_id = auth.uid()), jsonb_build_object('on', false, 'ver', ''));
$$;
revoke all on function public.app_follow_get() from public, anon;
grant execute on function public.app_follow_get() to authenticated;

create or replace function public.app_follow_set(p_on boolean, p_ver text default '') returns boolean
language plpgsql security definer set search_path = public as $$
declare v text := left(regexp_replace(coalesce(p_ver, ''), '[^0-9.]', '', 'g'), 20);
begin
  if auth.uid() is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(p_on, false) then
    insert into public.app_follows(user_id, follow_ver, notified_ver) values (auth.uid(), v, v) on conflict (user_id) do nothing;
  else
    delete from public.app_follows where user_id = auth.uid();
  end if;
  return coalesce(p_on, false);
end $$;
revoke all on function public.app_follow_set(boolean, text) from public, anon;
grant execute on function public.app_follow_set(boolean, text) to authenticated;

-- לפונקציה email: למי עוד לא נשלח מייל על הגרסה p_ver (רק מייל אמיתי ומאומת, בלי מי שהמייל שלו חזר או דיווח ספאם)
create or replace function public.app_follow_pick(p_ver text, p_limit int)
returns table(user_id uuid, email text, name text, token text)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email::text, coalesce(p.name, '')::text, f.token
    from public.app_follows f
    join auth.users u on u.id = f.user_id
    left join public.profiles p on p.id = u.id
    left join public.email_subs s on s.user_id = u.id
   where f.notified_ver <> coalesce(p_ver, '') and f.follow_ver <> coalesce(p_ver, '')
     and u.email_confirmed_at is not null and coalesce(u.email, '') like '%_@_%._%'
     and u.deleted_at is null and (u.banned_until is null or u.banned_until < now())
     and coalesce(u.is_anonymous, false) = false
     and lower(coalesce(u.email, '')) not like '%@nomail.yamshopping.com'
     and coalesce(s.status, 'ok') = 'ok'
   order by f.created_at
   limit greatest(coalesce(p_limit, 0), 0);
$$;
revoke all on function public.app_follow_pick(text, int) from public, anon, authenticated;
grant execute on function public.app_follow_pick(text, int) to service_role;

-- לבק אופיס: כמה עוקבים
create or replace function public.app_follow_count() returns int
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() or not public.staff_can('visitors') then raise exception 'forbidden' using errcode = '42501'; end if;
  return (select count(*)::int from public.app_follows);
end $$;
revoke all on function public.app_follow_count() from public, anon;
grant execute on function public.app_follow_count() to authenticated;

-- ---------- "מה חדש באתר" גם למי שלא נכנס לחשבון (למשל רק התקין את האפליקציה) ----------
-- האתר מראה את זה בחלון "מה חדש", והאפליקציה לאנדרואיד (1.3 ומעלה) בודקת ברקע ושולחת התראה לטלפון.
-- רק עדכונים פעילים מ-60 הימים האחרונים, רק כותרת, תוכן ותאריך.
create or replace function public.updates_public()
returns table(id uuid, title text, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select u.id, u.title, u.body, u.created_at from public.site_updates u
   where u.active and u.created_at > now() - interval '60 days'
   order by u.created_at desc limit 5;
$$;
revoke all on function public.updates_public() from public;
grant execute on function public.updates_public() to anon, authenticated;

-- ---------- 💬 הודעות מהצוות כהתראה בטלפון, גם כשהאפליקציה סגורה (אפליקציה 1.8 ומעלה) ----------
-- כל טלפון עם האפליקציה מקבל מזהה סודי אקראי (נוצר בטלפון). אחרי כניסה לחשבון האתר מצמיד אותו לחשבון.
-- הבדיקה ברקע של האפליקציה שואלת עם המזהה בלבד: "יש הודעות חדשות מהצוות?", ואפשר לענות ולסמן כנקרא ישר מההתראה.
create table if not exists public.app_devices (
  token text primary key check (token ~ '^[0-9a-f]{48}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index if not exists app_devices_user on public.app_devices (user_id);
-- 📡 מתי הבדיקה ברקע של הטלפון (כשהאפליקציה סגורה) רצה לאחרונה — נרשם ב-app_notices_for
alter table public.app_devices add column if not exists bg_at timestamptz;
alter table public.app_devices enable row level security;
-- אין גישה ישירה לטבלה — רק דרך הפונקציות למטה
revoke all on public.app_devices from public, anon, authenticated;

-- האתר (אחרי כניסה): להצמיד את הטלפון הזה לחשבון שלי
create or replace function public.app_device_register(p_token text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_token is null or p_token !~ '^[0-9a-f]{48}$' then return 'bad'; end if;
  insert into public.app_devices(token, user_id) values (p_token, auth.uid())
  on conflict (token) do update set user_id = excluded.user_id, last_seen = now();
  -- לכל היותר 10 טלפונים לחשבון
  delete from public.app_devices where user_id = auth.uid() and token in (
    select token from public.app_devices where user_id = auth.uid() order by last_seen desc offset 10);
  return 'ok';
end $$;
revoke all on function public.app_device_register(text) from public, anon;
grant execute on function public.app_device_register(text) to authenticated;

-- יציאה מהחשבון: הטלפון כבר לא מקבל את ההודעות שלי
create or replace function public.app_device_forget(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from public.app_devices where token = p_token;
$$;
revoke all on function public.app_device_forget(text) from public;
grant execute on function public.app_device_forget(text) to anon, authenticated;

-- הבדיקה ברקע: הודעות מהצוות שעוד לא נקראו (14 ימים אחרונים)
create or replace function public.app_inbox(p_token text)
returns table(id uuid, body text, author_name text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  update public.app_devices d set last_seen = now() where d.token = p_token returning d.user_id into uid;
  if uid is null then return; end if;
  return query select m.id, m.body, m.author_name, m.created_at from public.support_messages m
    where m.user_id = uid and m.from_staff and not m.read_by_user and m.created_at > now() - interval '14 days'
    order by m.created_at desc limit 8;
end $$;
revoke all on function public.app_inbox(text) from public;
grant execute on function public.app_inbox(text) to anon, authenticated;

-- "סימון כנקרא" מההתראה
create or replace function public.app_inbox_read(p_token text) returns void
language sql security definer set search_path = public as $$
  update public.support_messages m set read_by_user = true
   from public.app_devices d where d.token = p_token and m.user_id = d.user_id and m.from_staff and not m.read_by_user;
$$;
revoke all on function public.app_inbox_read(text) from public;
grant execute on function public.app_inbox_read(text) to anon, authenticated;

-- "השב" מההתראה: התשובה נכנסת לצ'אט עם הצוות כאילו נכתבה באתר
create or replace function public.app_inbox_reply(p_token text, p_body text) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid; nm text;
begin
  select d.user_id into uid from public.app_devices d where d.token = p_token;
  if uid is null then return 'unknown'; end if;
  p_body := btrim(coalesce(p_body, ''));
  if char_length(p_body) < 1 or char_length(p_body) > 2000 then return 'bad'; end if;
  -- לא יותר מ-20 תשובות בשעה מטלפון אחד
  if (select count(*) from public.support_messages where user_id = uid and not from_staff and created_at > now() - interval '1 hour') >= 20 then return 'slow'; end if;
  select coalesce(p.name, '') into nm from public.profiles p where p.id = uid;
  insert into public.support_messages(user_id, from_staff, author_name, body, read_by_user, read_by_staff)
    values (uid, false, left(coalesce(nm, ''), 40), p_body, true, false);
  update public.support_messages set read_by_user = true where user_id = uid and from_staff and not read_by_user;
  return 'ok';
end $$;
revoke all on function public.app_inbox_reply(text, text) from public;
grant execute on function public.app_inbox_reply(text, text) to anon, authenticated;

-- ================= אפליקציה 1.9: שחרור גרסה לפי משתמשים =================
-- בבק אופיס ← 🚀 שחרור גרסה: לבחור למי מגיעה גרסה של האפליקציה. לכולם, רק למשתמשים מסוימים, או לכולם חוץ מכמה.
-- אם אין שחרור פעיל לגרסה, היא מגיעה לכולם כרגיל מתוך download/app-version.json.
-- אם יש שחרור פעיל לגרסה, היא מגיעה רק למי שמותר לו. האפליקציה (מ-1.9) שואלת את השרת עם המזהה הסודי של הטלפון.
create table if not exists public.app_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null check (version ~ '^[0-9]{1,3}(\.[0-9]{1,3}){1,2}$'),
  notes text not null default '' check (char_length(notes) <= 1000),
  audience text not null default 'all' check (audience in ('all','only','except')),
  users uuid[] not null default '{}' check (cardinality(users) <= 500),
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.app_releases enable row level security;
drop policy if exists "releases admin" on public.app_releases;
create policy "releases admin" on public.app_releases for all using (public.is_admin()) with check (public.is_admin());
revoke all on public.app_releases from public, anon;
grant select, insert, update, delete on public.app_releases to authenticated;

create or replace function public.app_ver_num(v text) returns bigint
language sql immutable set search_path = public as $$
  select coalesce(nullif(split_part(v, '.', 1), '')::bigint, 0) * 1000000
       + coalesce(nullif(split_part(v, '.', 2), '')::bigint, 0) * 1000
       + coalesce(nullif(split_part(v, '.', 3), '')::bigint, 0);
$$;

-- מה מגיע לטלפון הזה: offer = הגרסה הכי חדשה ששוחררה אליו. block = גרסאות ששוחררו רק לאחרים, ולכן לא מציעים לו אותן.
-- טלפון שלא מחובר לחשבון מקבל רק שחרור "לכולם" ו"לכולם חוץ מ…".
create or replace function public.app_release_for(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid; o record; blk jsonb;
begin
  if p_token ~ '^[0-9a-f]{48}$' then select d.user_id into uid from public.app_devices d where d.token = p_token; end if;
  with ok as (
    select a.version, a.notes, a.created_at, (a.audience = 'all' or (a.audience = 'only' and uid is not null and uid = any(a.users))
                    or (a.audience = 'except' and (uid is null or not (uid = any(a.users))))) as yes
      from public.app_releases a where a.active)
  select coalesce(jsonb_agg(distinct x.version), '[]'::jsonb) into blk
    from ok x where not x.yes and not exists (select 1 from ok y where y.yes and y.version = x.version);
  select a.version, a.notes into o from public.app_releases a
   where a.active and (a.audience = 'all' or (a.audience = 'only' and uid is not null and uid = any(a.users))
                       or (a.audience = 'except' and (uid is null or not (uid = any(a.users)))))
   order by public.app_ver_num(a.version) desc, a.created_at desc limit 1;
  if not found then return jsonb_build_object('offer', null, 'block', blk); end if;
  return jsonb_build_object('offer', jsonb_build_object('version', o.version, 'notes', o.notes,
           'url', '/download/yamshopping-' || o.version || '.apk'), 'block', blk);
end $$;
revoke all on function public.app_release_for(text) from public;
grant execute on function public.app_release_for(text) to anon, authenticated;

-- ================= אפליקציה 1.9: 📲 התראה לטלפון מהבק אופיס — לכולם / רק לכמה / לכולם חוץ מכמה =================
-- {שם} בכותרת או בהודעה מתחלף בשם של המשתמש. האפליקציה בודקת כל רבע שעה, גם כשהיא סגורה (לא בשבת ולא בלילה).
create table if not exists public.app_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  body text not null default '' check (char_length(body) <= 400),
  url text not null default '' check (url = '' or (url ~ '^/[^/]' and char_length(url) <= 300)),
  audience text not null default 'all' check (audience in ('all','only','except')),
  users uuid[] not null default '{}' check (cardinality(users) <= 500),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.app_notices enable row level security;
drop policy if exists "notices admin" on public.app_notices;
create policy "notices admin" on public.app_notices for all using (public.is_admin()) with check (public.is_admin());
revoke all on public.app_notices from public, anon;
grant select, insert, update, delete on public.app_notices to authenticated;

create or replace function public.app_notice_text(t text, nm text) returns text
language sql immutable set search_path = public as $$
  select case when coalesce(btrim(nm), '') = '' then btrim(regexp_replace(t, '\{שם\}[,،]?\s*', '', 'g'))
              else replace(t, '{שם}', btrim(nm)) end;
$$;

-- איזה טלפון כבר קיבל איזו התראה. ככה כל התראה מגיעה פעם אחת לכל טלפון, גם אם האתר בדק כשהאפליקציה פתוחה וגם אם הבדיקה ברקע בדקה,
-- ובבק אופיס רואים לכמה טלפונים כל התראה הגיעה
create table if not exists public.app_notice_hits (
  notice_id uuid not null references public.app_notices(id) on delete cascade,
  token text not null check (token ~ '^[0-9a-f]{48}$'),
  at timestamptz not null default now(),
  primary key (notice_id, token)
);
alter table public.app_notice_hits enable row level security;
revoke all on public.app_notice_hits from public, anon, authenticated;

-- מה מגיע לטלפון הזה: התראות מהיממה האחרונה שמיועדות לו ושהוא עוד לא קיבל, כולל מה שנשלח לפני שהטלפון עודכן ל-1.9.
-- טלפון בלי חשבון מקבל רק "לכולם" ו"לכולם חוץ מ…". p_since נשאר בשביל טלפון בלי מזהה תקין.
-- 🔔 התראות מהשרת (תור push_queue: מבצעים, מתכונים, תשובות מחנויות, תזכורות, התראות צוות) גם לטלפון עם האפליקציה.
-- האפליקציה לא יכולה לקבל Web Push, ולכן היא מושכת אותן כאן, יחד עם ההודעות מהבק אופיס. כל התראה מגיעה לכל טלפון פעם אחת.
create table if not exists public.app_push_hits (
  queue_id bigint not null references public.push_queue(id) on delete cascade,
  token text not null check (token ~ '^[0-9a-f]{48}$'),
  at timestamptz not null default now(),
  primary key (queue_id, token)
);
alter table public.app_push_hits enable row level security;
revoke all on public.app_push_hits from public, anon, authenticated;

drop function if exists public.app_notices_for(text, timestamptz);
create function public.app_notices_for(p_token text, p_since timestamptz)
returns table(id uuid, title text, body text, url text, created_at timestamptz)
language plpgsql volatile security definer set search_path = public as $$
declare uid uuid; nm text := ''; ok_tok boolean := coalesce(p_token ~ '^[0-9a-f]{48}$', false);
begin
  if ok_tok then select d.user_id into uid from public.app_devices d where d.token = p_token; end if;
  if uid is not null then select coalesce(p.name, '') into nm from public.profiles p where p.id = uid; end if;
  -- 📡 הבדיקה ברקע של האפליקציה שולחת p_since (האתר הפתוח שולח null) — שומרים מתי הטלפון בדק ברקע לאחרונה,
  --    כדי שבכרטיס ההתראות יהיה אפשר לראות אם הטלפון עוצר את האפליקציה כשהיא סגורה
  if ok_tok and p_since is not null and uid is not null then
    update public.app_devices d set bg_at = now() where d.token = p_token and (d.bg_at is null or d.bg_at < now() - interval '1 minute');
  end if;
  return query
  with picked as (
    select n.id, n.title, n.body, n.url, n.created_at from public.app_notices n
     where n.created_at > now() - interval '1 day'
       and (case when ok_tok then not exists (select 1 from public.app_notice_hits h where h.notice_id = n.id and h.token = p_token)
                 else n.created_at > coalesce(p_since, now()) end)
       and (n.audience = 'all' or (n.audience = 'only' and uid is not null and uid = any(n.users))
            or (n.audience = 'except' and (uid is null or not (uid = any(n.users)))))
     order by n.created_at limit 3),
  hit as (insert into public.app_notice_hits(notice_id, token) select p.id, p_token from picked p where ok_tok on conflict do nothing),
  -- התראות מהתור שנשלחו לחשבון הזה (אחרי שהטלפון הוצמד לחשבון). הודעות צ'אט מגיעות בנפרד (app_inbox), ולכן לא כאן
  pq as (
    select q.id, q.title, q.body, q.url, coalesce(q.sent_at, q.created_at) as sent_at from public.push_queue q
      join public.app_devices d on d.token = p_token and d.user_id = q.user_id
     -- "sent" מפונקציית push המעודכנת; וגם "skipped/no device" — מה שגרסה ישנה של push (שעוד לא הועלתה מחדש) סימנה
     -- לחשבון שיש לו רק טלפון עם האפליקציה. כך ההתראות מגיעות לטלפון גם בלי להעלות מחדש את push
     where ok_tok and uid is not null and q.kind not in ('chat', 'test')
       and (q.status = 'sent' or (q.status = 'skipped' and q.note = 'no device'))
       and coalesce(q.sent_at, q.created_at) > greatest(now() - interval '1 day', d.created_at)
       and not exists (select 1 from public.app_push_hits h where h.queue_id = q.id and h.token = p_token)
     order by coalesce(q.sent_at, q.created_at) limit 5),
  pq_hit as (insert into public.app_push_hits(queue_id, token) select x.id, p_token from pq x on conflict do nothing)
  select p.id, public.app_notice_text(p.title, nm), public.app_notice_text(p.body, nm), p.url, p.created_at from picked p
  union all
  select md5('pq:' || x.id)::uuid, x.title, x.body, x.url, x.sent_at from pq x
  order by 5;
end $$;
revoke all on function public.app_notices_for(text, timestamptz) from public;
grant execute on function public.app_notices_for(text, timestamptz) to anon, authenticated;

-- 📡 כרטיס ההתראות באפליקציה: מתי הבדיקה ברקע רצה לאחרונה בטלפונים שלי (null — אף פעם מאז שזה נרשם)
create or replace function public.my_app_bg() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('phones', count(*), 'bg_at', max(d.bg_at), 'linked_at', min(d.created_at))
    from public.app_devices d where d.user_id = auth.uid();
$$;
revoke all on function public.my_app_bg() from public, anon;
grant execute on function public.my_app_bg() to authenticated;

-- בבק אופיס: לכמה טלפונים הגיעה כל התראה
create or replace function public.app_notice_counts() returns table(notice_id uuid, phones int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select h.notice_id, count(*)::int from public.app_notice_hits h group by h.notice_id;
end $$;
revoke all on function public.app_notice_counts() from public, anon;
grant execute on function public.app_notice_counts() to authenticated;

-- ================= 📷 תמונות מוצרים לפי ברקוד (מצלמים בעצמנו — בלי בעיית זכויות) =================
-- משתמש מחובר מצלם מוצר בחלון בחירת המוצר; התמונה (JPEG מוקטן, עד ~90KB) ממתינה לאישור המנהל בבק אופיס ← 📷 תמונות מוצרים.
-- לכל ברקוד יש תמונה מאושרת אחת: אישור תמונה חדשה מחליף את הקודמת. כולם (גם אורחים) רואים רק תמונות מאושרות.
create table if not exists public.product_photos (
  id uuid primary key default gen_random_uuid(),
  barcode text not null check (barcode ~ '^[0-9]{7,14}$'),
  name text not null default '' check (char_length(name) <= 80),
  image text not null check (image like 'data:image/jpeg;base64,%' and char_length(image) <= 120000),
  by_id uuid default auth.uid() references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);
create unique index if not exists product_photos_one_approved on public.product_photos (barcode) where status = 'approved';
create index if not exists product_photos_status on public.product_photos (status, created_at desc);
create index if not exists product_photos_by on public.product_photos (by_id, created_at desc);
alter table public.product_photos enable row level security;
drop policy if exists "pphotos read" on public.product_photos;
drop policy if exists "pphotos submit" on public.product_photos;
drop policy if exists "pphotos own delete" on public.product_photos;
drop policy if exists "pphotos admin" on public.product_photos;
create policy "pphotos read" on public.product_photos for select using (status = 'approved' or by_id = auth.uid() or public.is_admin());
create policy "pphotos submit" on public.product_photos for insert to authenticated with check (by_id = auth.uid() and public.not_banned());
create policy "pphotos own delete" on public.product_photos for delete to authenticated using (by_id = auth.uid() and status = 'pending');
create policy "pphotos admin" on public.product_photos for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.product_photos from anon, authenticated;
grant select on public.product_photos to anon;
grant select, insert, update, delete on public.product_photos to authenticated;

create or replace function public.product_photos_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and not coalesce(public.is_admin(), false) then
    -- משתמש רגיל: תמיד ממתין לאישור, ועד 30 תמונות ביום
    new.status := 'pending'; new.reviewed_at := null; new.reviewed_by := null; new.by_id := auth.uid();
    if (select count(*) from public.product_photos p where p.by_id = auth.uid() and p.created_at > now() - interval '1 day') >= 30 then
      raise exception 'אפשר לשלוח עד 30 תמונות ביום' using errcode = '54000';
    end if;
  end if;
  if new.status <> 'pending' and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    new.reviewed_at := now(); new.reviewed_by := auth.uid();
  end if;
  -- אישור תמונה חדשה: התמונה המאושרת הקודמת של אותו ברקוד יוצאת
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    update public.product_photos p set status = 'rejected' where p.barcode = new.barcode and p.status = 'approved' and p.id <> new.id;
  end if;
  return new;
end $$;
drop trigger if exists product_photos_guard on public.product_photos;
create trigger product_photos_guard before insert or update on public.product_photos for each row execute function public.product_photos_guard();

-- 📷 מוניטין על תמונות: כל תמונה שהמנהל מאשר נותנת למצלם 3 נקודות.
-- תמונה שהוחלפה בתמונה חדשה יותר מסומנת "replaced" — והנקודות נשארות. תמונה שהמנהל דוחה לא נותנת נקודות.
alter table public.product_photos drop constraint if exists product_photos_status_check;
alter table public.product_photos add constraint product_photos_status_check check (status in ('pending','approved','rejected','replaced'));
create or replace function public.product_photos_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and not coalesce(public.is_admin(), false) then
    -- משתמש רגיל: תמיד ממתין לאישור, ועד 30 תמונות ביום
    new.status := 'pending'; new.reviewed_at := null; new.reviewed_by := null; new.by_id := auth.uid();
    if (select count(*) from public.product_photos p where p.by_id = auth.uid() and p.created_at > now() - interval '1 day') >= 30 then
      raise exception 'אפשר לשלוח עד 30 תמונות ביום' using errcode = '54000';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.status = 'replaced' and old.status is distinct from 'replaced' and not coalesce(public.is_admin(), false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if new.status in ('approved','rejected') and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    new.reviewed_at := now(); new.reviewed_by := auth.uid();
  end if;
  -- אישור תמונה חדשה: התמונה המאושרת הקודמת של אותו ברקוד מוחלפת (והמצלם שומר את הנקודות)
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    update public.product_photos p set status = 'replaced' where p.barcode = new.barcode and p.status = 'approved' and p.id <> new.id;
    if new.by_id is not null and new.by_id is distinct from auth.uid() then
      perform public.push_enqueue(new.by_id, 'photo', '📷 התמונה שלך אושרה!', coalesce(nullif(new.name, ''), 'המוצר') || ' — עכשיו כולם רואים אותה. קיבלת ' || coalesce(public.pro_cfg()->>'pts_photo', '3') || ' נקודות מוניטין', '/#me-rep', 'photo:' || new.id);
    end if;
  end if;
  return new;
end $$;
-- דירוג המדווחים + תמונות שאושרו (3 נקודות לכל אחת)
drop function if exists public.reporter_scores();
create function public.reporter_scores() returns table(user_id uuid, name text, reports int, confirms int, bonus int, score int, photos int)
language sql stable security definer set search_path = public as $$
  select p.id, case when public.is_staff() or p.id = auth.uid() or public.credit_default('prices') then p.name else '' end,
         count(pr.id)::int, coalesce(sum(pr.confirms),0)::int, p.rep_bonus,
         (count(pr.id) + 2*coalesce(sum(pr.confirms),0) + p.rep_bonus + 3*coalesce(ph.n,0))::int,
         coalesce(ph.n,0)::int
  from public.profiles p
  left join public.prices pr on pr.by_id = p.id and pr.status = 'approved'
  left join (select by_id, count(*) n from public.product_photos where status in ('approved','replaced') group by by_id) ph on ph.by_id = p.id
  where auth.uid() is not null
  group by p.id, p.name, p.rep_bonus, ph.n
  having count(pr.id) > 0 or p.rep_bonus <> 0 or coalesce(ph.n,0) > 0
  order by 6 desc limit 500;
$$;
-- 📷 קרדיט על התמונה: בזמן ההעלאה שואלים את המצלם אם הוא רוצה קרדיט ואיך לכתוב אותו (ריק = בלי קרדיט)
alter table public.product_photos add column if not exists credit text not null default '' check (char_length(credit) <= 40);

-- ================= ⭐ פרו (עיצוב 2.0) =================
-- 🏅 מוניטין = ספירה אחת בלבד. אותו מספר מוצג ב"המוניטין שלי", בתגים ליד שם המדווח, בדירוג בבק אופיס, ומשמש לפרו.
-- הסולם הקטן של המוניטין הישן נשמר (מחיר 1, אישור 2, תמונה 3, בונוס מהמנהל 1 ליחידה), ונוספו לו חברים, שיתופים ותרומה לקהילה.
-- משתמש פרו יכול לבחור ערכת צבעים (תכלת / מנטה / לילך / לילה) שמשנה יחד את האתר, האפליקציה, הלוגו ואייקון האפליקציה.
-- כל מה שחינם נשאר חינם — פרו רק מוסיף. מקבלים פרו אוטומטית באחת משלוש הדרכים:
--   א. המסלול: לפחות 25 מוניטין + לפחות 5 תמונות מוצרים שאושרו + שיתוף אחד לפחות לקהילה (רשימה מהקהילה / טיפ / מתכון / דבר תורה שאושרו)
--   ב. 70 מוניטין ומעלה — פרו גם בלי שאר תנאי המסלול (solo_points, 0 = כבוי)
-- שיתוף האתר נותן נקודות רק כשמשתמש חדש נרשם מהקישור ששותף.
--   ג. מסלול מהיר: 10 חברים שנרשמו בפועל דרך הקישור האישי = פרו מיד (שליחת קישור בלבד לא נחשבת חבר)
-- החישוב חי (בכל קריאה), כך שהכללים חלים מיד גם על משתמשים קיימים.
-- מנהלים וצוות — פרו אוטומטית. הבעלים יכול לתת או להוריד פרו ידנית לכל משתמש (pro_manual: null = אוטומטי).
-- הנקודות מחושבות מתוך מה שכבר קיים במסד (דיווחי מחירים, תמונות, הזמנות, שיתופים), כך שאין טבלה נוספת שאפשר לזייף.
-- כל המספרים נקבעים בבק אופיס ← ⭐ מוניטין ופרו (נשמר ב-site_config, המפתח 'rep' — מפתח חדש, כדי שהגדרות ישנות בסולם הגדול לא ידרסו את הסולם הקטן).
alter table public.profiles add column if not exists pro_manual boolean;
alter table public.profiles drop constraint if exists profiles_color_theme_check;
alter table public.profiles add constraint profiles_color_theme_check check (color_theme in ('sea','forest','night','sunset','sky','mint','lilac'));

-- ההגדרות, עם ברירות מחדל לכל מספר שלא נקבע
create or replace function public.pro_cfg() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('min_points',25,'min_photos',5,'min_shared',1,'fast_friends',10,'solo_points',70,
    'pts_friend',3,'pts_friend2',2,'pts_share',1,'share_day_max',3,'pts_photo',3,'pts_price',1,'pts_recipe',4,'pts_shared',2,
    'pts_confirm',2,'pts_bonus',1)
    || coalesce((select jsonb_object_agg(k, v) from jsonb_each((select value from public.site_config where key = 'rep')) as e(k, v)
                 where k in ('min_points','min_photos','min_shared','fast_friends','solo_points','pts_friend','pts_friend2','pts_share','share_day_max',
                             'pts_photo','pts_price','pts_recipe','pts_shared','pts_confirm','pts_bonus')
                   and jsonb_typeof(v) = 'number' and (v::text)::numeric between 0 and 100000), '{}'::jsonb);
$$;
revoke all on function public.pro_cfg() from public, anon;
grant execute on function public.pro_cfg() to authenticated;

-- החישוב לכל המשתמשים בבת אחת (או למשתמש אחד): כמה מכל פעולה, כמה נקודות, והאם פרו ולמה.
-- פנימי בלבד — משתמש רגיל רואה רק את עצמו דרך pro_status(), ומנהל דרך admin_pro_users()
-- סוג ההחזרה השתנה (נוספו confirms, bonus) — לכן מוחקים קודם, אחרת Postgres לא מאפשר להחליף
drop function if exists public.pro_calc(uuid);
create function public.pro_calc(p_user uuid default null)
returns table(user_id uuid, prices int, photos int, recipes int, shared int, friends int, friends2 int, shares int, points int,
              staff boolean, manual boolean, pro boolean, reason text, confirms int, bonus int)
language sql stable security definer set search_path = public, auth as $$
  with c as (select public.pro_cfg() j),
  u as (select p.id, p.pro_manual, p.rep_bonus from public.profiles p where p_user is null or p.id = p_user),
  pr as (select by_id, count(*)::int n, coalesce(sum(confirms), 0)::int cf from public.prices where status = 'approved' and by_id in (select id from u) group by by_id),
  ph as (select by_id, count(*)::int n from public.product_photos where status in ('approved','replaced') and by_id in (select id from u) group by by_id),
  rc as (select author_id, count(*)::int n from public.recipes where status = 'approved' and author_id in (select id from u) group by author_id),
  sh as (select a, count(*)::int n from (
           select author_id a from public.shared_lists where status = 'approved'
           union all select created_by from public.saving_tips where status = 'approved'
           union all select author_id from public.divrei_torah where status = 'approved') x
         where a in (select id from u) group by a),
  fr as (select referrer, count(*)::int n from public.referrals where referrer in (select id from u) group by referrer),
  f2 as (select r1.referrer, count(*)::int n from public.referrals r1
         where r1.referrer in (select id from u) and exists (select 1 from public.referrals r2 where r2.referrer = r1.referred)
         group by r1.referrer),
  sd as (select sharer, sum(least(d.n, (select (j->>'share_day_max')::int from c)))::int n
         from (select sharer, (created_at at time zone 'Asia/Jerusalem')::date, count(*)::int n from public.share_links l
               where sharer in (select id from u)
                 -- שיתוף נספר רק אם משתמש חדש נרשם דרכו, לא על עצם השליחה או על כניסה בלבד
                 and exists (select 1 from public.share_joins sj where sj.token = l.token and sj.is_new and sj.user_id is distinct from l.sharer)
               group by 1, 2) d group by sharer),
  st as (select s.user_id from public.staff s
         union select au.id from auth.users au where public.yam_owner_match(au.email, au.raw_app_meta_data) and au.email_confirmed_at is not null),
  t as (
    select u.id, coalesce(pr.n,0) prices, coalesce(ph.n,0) photos, coalesce(rc.n,0) recipes, coalesce(sh.n,0) + coalesce(rc.n,0) shared,
           coalesce(fr.n,0) friends, coalesce(f2.n,0) friends2, coalesce(sd.n,0) shares, u.pro_manual,
           coalesce(pr.cf,0) confirms, u.rep_bonus,
           exists (select 1 from st where st.user_id = u.id) staff
    from u left join pr on pr.by_id = u.id left join ph on ph.by_id = u.id left join rc on rc.author_id = u.id
      left join sh on sh.a = u.id left join fr on fr.referrer = u.id left join f2 on f2.referrer = u.id left join sd on sd.sharer = u.id),
  p as (
    select t.*, (t.prices*(j->>'pts_price')::int + t.photos*(j->>'pts_photo')::int + t.recipes*(j->>'pts_recipe')::int
                 + (t.shared - t.recipes)*(j->>'pts_shared')::int + t.friends*(j->>'pts_friend')::int
                 + t.friends2*(j->>'pts_friend2')::int + t.shares*(j->>'pts_share')::int
                 + t.confirms*(j->>'pts_confirm')::int + t.rep_bonus*(j->>'pts_bonus')::int)::int pts, j
    from t, c)
  select p.id, p.prices, p.photos, p.recipes, p.shared, p.friends, p.friends2, p.shares, p.pts, p.staff, p.pro_manual,
    case when p.pro_manual is not null then p.pro_manual
         when p.staff then true
         when p.friends >= (j->>'fast_friends')::int and (j->>'fast_friends')::int > 0 then true
         when p.pts >= (j->>'solo_points')::int and (j->>'solo_points')::int > 0 then true
         else p.pts >= (j->>'min_points')::int and p.photos >= (j->>'min_photos')::int and p.shared >= (j->>'min_shared')::int end,
    case when p.pro_manual is true then 'manual' when p.pro_manual is false then 'removed' when p.staff then 'staff'
         when p.friends >= (j->>'fast_friends')::int and (j->>'fast_friends')::int > 0 then 'fast'
         when p.pts >= (j->>'min_points')::int and p.photos >= (j->>'min_photos')::int and p.shared >= (j->>'min_shared')::int then 'earned'
         when p.pts >= (j->>'solo_points')::int and (j->>'solo_points')::int > 0 then 'points'
         else '' end,
    p.confirms, (p.rep_bonus * (j->>'pts_bonus')::int)::int
  from p;
$$;
revoke all on function public.pro_calc(uuid) from public, anon, authenticated;

-- המשתמש עצמו: איפה הוא עומד, ומה חסר לו
create or replace function public.pro_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else
    (select to_jsonb(x) - 'user_id' || jsonb_build_object('cfg', public.pro_cfg()) from public.pro_calc(auth.uid()) x) end;
$$;
revoke all on function public.pro_status() from public, anon;
grant execute on function public.pro_status() to authenticated;

-- בק אופיס: סיכום, חיפוש משתמשים, ופרו ידני (מנהלים בלבד)
create or replace function public.admin_pro_summary() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not public.is_admin() then null else (
    select jsonb_build_object('pro', count(*) filter (where pro), 'manual', count(*) filter (where manual is true),
      'close', count(*) filter (where not pro and points >= 0.6 * (public.pro_cfg()->>'min_points')::int),
      'joined_month', (select count(*) from public.referrals where created_at > date_trunc('month', now())))
    from public.pro_calc(null)) end;
$$;
revoke all on function public.admin_pro_summary() from public, anon;
grant execute on function public.admin_pro_summary() to authenticated;

create or replace function public.admin_pro_users(p_q text default '', p_filter text default '')
returns table(user_id uuid, name text, email text, points int, photos int, shared int, friends int, staff boolean, manual boolean, pro boolean, reason text)
language sql stable security definer set search_path = public, auth as $$
  select x.user_id, coalesce(p.name, ''), coalesce(au.email, ''), x.points, x.photos, x.shared, x.friends, x.staff, x.manual, x.pro, x.reason
  from public.pro_calc(null) x join public.profiles p on p.id = x.user_id left join auth.users au on au.id = x.user_id
  where public.is_admin()
    and (coalesce(p_q, '') = '' or p.name ilike '%' || p_q || '%' or au.email ilike '%' || p_q || '%')
    and (coalesce(p_filter, '') = '' or (p_filter = 'pro' and x.pro) or (p_filter = 'manual' and x.manual is not null)
         or (p_filter = 'close' and not x.pro and x.points >= 0.6 * (public.pro_cfg()->>'min_points')::int))
  order by x.pro desc, x.points desc limit 200;
$$;
revoke all on function public.admin_pro_users(text, text) from public, anon;
grant execute on function public.admin_pro_users(text, text) to authenticated;

-- p_val: true = לתת פרו, false = להוריד, null = לחזור לאוטומטי. רק הבעלים
create or replace function public.admin_pro_set(p_user uuid, p_val boolean) returns boolean
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.profiles set pro_manual = p_val where id = p_user;
  if found and p_val is true then
    perform public.push_enqueue(p_user, 'info', '⭐ קיבלת Yam shopping PRO!', 'עכשיו אפשר לבחור ערכת צבעים לאתר, לאפליקציה ולאייקון — בהגדרות ← ערכת צבעים', '/#pro', 'pro:' || p_user || ':' || extract(epoch from now())::bigint);
  end if;
  return found;
end $$;
revoke all on function public.admin_pro_set(uuid, boolean) from public, anon;
grant execute on function public.admin_pro_set(uuid, boolean) to authenticated;
-- משתמש רגיל לא יכול לשנות לעצמו את pro_manual (הרשאת עדכון של profiles ניתנת רק לעמודות מסוימות)
revoke update (pro_manual) on public.profiles from authenticated;
create or replace function public.profiles_pro_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(public.is_owner(), false) then
    if tg_op = 'INSERT' then new.pro_manual := null; else new.pro_manual := old.pro_manual; end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_pro_guard on public.profiles;
create trigger profiles_pro_guard before insert or update of pro_manual on public.profiles for each row execute function public.profiles_pro_guard();

-- 🏅 דירוג המדווחים / התגים ליד השם: אותו מוניטין בדיוק כמו בפרו (pro_calc), במקום החישוב הישן.
-- כל משתמש מחובר מקבל את המספר (לתג), אבל השם רק לפי ההרשאות כמו קודם.
drop function if exists public.reporter_scores();
create function public.reporter_scores() returns table(user_id uuid, name text, reports int, confirms int, bonus int, score int, photos int)
language sql stable security definer set search_path = public as $$
  select x.user_id, case when public.is_staff() or x.user_id = auth.uid() or public.credit_default('prices') then p.name else '' end,
         x.prices, x.confirms, x.bonus, x.points, x.photos
  from public.pro_calc(null) x join public.profiles p on p.id = x.user_id
  where auth.uid() is not null and x.points > 0
  order by x.points desc limit 500;
$$;
revoke all on function public.reporter_scores() from public, anon;
grant execute on function public.reporter_scores() to authenticated;

-- 💬 נתונים אישיים שמסונכרנים בין המכשירים של אותו משתמש — היום: השיחות עם יאמי.
--    הכל נשמר קודם במכשיר (עובד גם בלי אינטרנט), ונשלח לכאן כשיש חיבור, כדי שהשיחות לא ייעלמו בהתקנה מחדש או במכשיר חדש.
--    רק המשתמש עצמו קורא וכותב את השורה שלו (גם מנהלים לא), לא עובר לרשימה המשותפת עם המשפחה, ונמחק עם החשבון.
create table if not exists public.user_sync (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 1500000),
  updated_by text not null default '' check (char_length(updated_by) <= 40),
  updated_at timestamptz not null default now()
);
alter table public.user_sync enable row level security;
drop policy if exists "user sync own" on public.user_sync;
create policy "user sync own" on public.user_sync for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.user_sync from anon;
grant select, insert, update, delete on public.user_sync to authenticated;

-- ---------- 💬 תשובה מהצוות מגיעה מיד (זמן אמת) ----------
-- האתר והאפליקציה מאזינים להודעות חדשות בצ'אט עם הצוות, וכך "צוות האתר ענה לך" קופץ מיד ולא אחרי דקה וחצי.
-- זמן אמת של Supabase שומר על אותן הרשאות (RLS): כל משתמש מקבל רק את ההודעות של השיחה שלו.
do $$ begin
  alter publication supabase_realtime add table public.support_messages;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- ---------- הסכמה למייל השבועי (חוק התקשורת, סעיף 30א) ----------
-- 'yes' ביקש · 'no' סירב או הסיר את עצמו · 'ask' עוד לא נשאל (משתמש ותיק, או נרשם עם גוגל) — האתר שואל פעם אחת. עד שעונה, המייל ממשיך להגיע
create or replace function public.email_consent_state() returns text
language sql stable security definer set search_path = public as $$
  select case when s.user_id is null then 'ask'
              when not s.weekly then 'no'
              when s.consent_at is null then 'ask'
              else 'yes' end
    from (select auth.uid() uid) me left join public.email_subs s on s.user_id = me.uid
   where me.uid is not null;
$$;
revoke all on function public.email_consent_state() from public, anon;
grant execute on function public.email_consent_state() to authenticated;

-- בהרשמה עם מייל וקוד: תיבת הסימון נשלחת בתוך פרטי המשתמש כ-weekly_ok — מסומנת = מקבל, לא מסומנת = לא מקבל
create or replace function public.email_consent_on_signup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_user_meta_data->>'weekly_ok', '') = 'true' then
    insert into public.email_subs(user_id, weekly, status, consent_at, consent_how, updated_at)
    values (new.id, true, 'ok', now(), 'signup', now())
    on conflict (user_id) do update set weekly = true, consent_at = now(), consent_how = 'signup', updated_at = now();
  elsif coalesce(new.raw_user_meta_data->>'weekly_ok', '') = 'false' then
    insert into public.email_subs(user_id, weekly, status, unsub_at, unsub_how, updated_at)
    values (new.id, false, 'ok', now(), 'signup', now())
    on conflict (user_id) do update set weekly = false, unsub_at = now(), unsub_how = 'signup', updated_at = now();
  end if;
  return new;
exception when others then return new;  -- ההרשמה לא נכשלת בגלל זה
end $$;
revoke all on function public.email_consent_on_signup() from public, anon, authenticated;
drop trigger if exists email_consent_on_signup on auth.users;
create trigger email_consent_on_signup after insert on auth.users for each row execute function public.email_consent_on_signup();

-- ---------- חיזוק: פונקציות ניהול — אורחים לא מחוברים לא יכולים אפילו להפעיל אותן (הן גם בודקות בעצמן מי מנהל) ----------
do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('backup_rooms', 'restore_room', 'biz_set_active', 'rep_bonus_add', 'staff_add', 'staff_list',
              'staff_remove', 'store_api_key_info', 'store_manager_auto', 'store_manager_list', 'store_manager_remove', 'store_manager_set',
              'update_read_count', 'torah_list', 'delete_my_account', 'mark_updates_seen') loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- =====================================================================================================
-- 🛡️ בוטים ואבטחה: הגנה מעומסים ומבוטים (בק אופיס ← 🛡️ בוטים ואבטחה)
--   • security_events — כל מה שקרה: הצפה שנחסמה, פנייה ישירה לשרת, ניסיון פריצה, עומס, נפילה, חסימה במסד.
--     השומר בשרת (collector/bin/yam-shield) כותב לכאן במפתח השירות, ופונקציית הבקשות (yam_pre_request) כותבת חסימות במסד.
--     כל שורה חדשה שולחת מיד התראה לטלפון ולתוסף של המנהלים (בלי הצפה: אותו סוג ואותה כתובת פעם בחצי שעה).
--   • shield_load — מדידה כל דקה מהשרת: חיבורים חדשים, נחסמו, עומס מעבד וזיכרון. נשמר 3 ימים.
--   • rate_hits / rate_blocks — הגבלת קצב לכתיבה ב-Supabase: מעל הסף בדקה (לפי חשבון, ולאורח לפי IP) — חסימה ל-10 דקות.
--     קריאה לא נספרת (בקשת קריאה לא יכולה לכתוב), אבל מי שנחסם נחסם גם בקריאה. כתובות ב"לא מוגבלות" (נטפרי) לא נחסמות,
--     מנהלים ומפתח השירות לא נחסמים, וכל תקלה בבדיקה עצמה — מאשרים את הבקשה (האתר לעולם לא נופל בגלל ההגנה).
--   • ההגדרות ב-site_config 'shield' (רק מנהל קורא וכותב).
-- =====================================================================================================
create table if not exists public.security_events (
  id bigserial primary key,
  at timestamptz not null default now(),
  src text not null default 'server' check (src in ('server', 'api', 'db')),
  kind text not null check (char_length(kind) <= 20),
  ip text not null default '' check (char_length(ip) <= 64),
  n int not null default 0,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists security_events_at on public.security_events (at desc);
create index if not exists security_events_ip on public.security_events (ip, at desc);
alter table public.security_events enable row level security;
drop policy if exists "security events admin" on public.security_events;
create policy "security events admin" on public.security_events for select using (public.is_admin());
revoke insert, update, delete on public.security_events from anon, authenticated;

create table if not exists public.shield_load (
  at timestamptz primary key,
  data jsonb not null default '{}'::jsonb
);
alter table public.shield_load enable row level security;
drop policy if exists "shield load admin" on public.shield_load;
create policy "shield load admin" on public.shield_load for select using (public.is_admin());
revoke insert, update, delete on public.shield_load from anon, authenticated;

create unlogged table if not exists public.rate_hits (
  k text not null,
  w bigint not null,
  n int not null default 0,
  primary key (k, w)
);
alter table public.rate_hits enable row level security;
revoke all on public.rate_hits from anon, authenticated;

create table if not exists public.rate_blocks (
  k text primary key,
  ip text not null default '',
  until timestamptz not null,
  n int not null default 0,
  at timestamptz not null default now()
);
create index if not exists rate_blocks_ip on public.rate_blocks (ip) where ip <> '';
alter table public.rate_blocks enable row level security;
drop policy if exists "rate blocks admin" on public.rate_blocks;
create policy "rate blocks admin" on public.rate_blocks for select using (public.is_admin());
drop policy if exists "rate blocks admin del" on public.rate_blocks;
create policy "rate blocks admin del" on public.rate_blocks for delete using (public.is_admin());
revoke insert, update on public.rate_blocks from anon, authenticated;

-- ההגדרות של השומר — רק למנהל (כמו ai / security / scrape)
drop policy if exists "config read" on public.site_config;
create policy "config read" on public.site_config for select using (key not in ('ai', 'security', 'scrape', 'shield') or public.is_admin());

-- כתובת ברשימת "לא מוגבלות" (בק אופיס ← 🔐 אבטחה, או 🛡️ ← כתובות מותרות). תומך גם בטווח 1.2.3.0/24
create or replace function public.shield_allowed_ip(p_ip text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare x text; a inet;
begin
  if coalesce(p_ip, '') = '' then return false; end if;
  begin a := p_ip::inet; exception when others then return false; end;
  for x in
    select jsonb_array_elements_text(case when jsonb_typeof(value->'ip_allow') = 'array' then value->'ip_allow' else '[]'::jsonb end)
      from public.site_config where key = 'security'
    union all
    select coalesce(e->>'ip', '') from public.site_config c,
           jsonb_array_elements(case when jsonb_typeof(c.value->'allow') = 'array' then c.value->'allow' else '[]'::jsonb end) e
     where c.key = 'shield'
  loop
    begin
      if a <<= trim(x)::inet then return true; end if;
    exception when others then null;
    end;
  end loop;
  return false;
end $$;
revoke all on function public.shield_allowed_ip(text) from public, anon, authenticated;

-- רץ לפני כל בקשה ל-Supabase (pgrst.db_pre_request). חסום → 429. כל תקלה פנימית → הבקשה עוברת כרגיל.
create or replace function public.yam_pre_request() returns void
language plpgsql security definer set search_path = public as $$
declare
  claims jsonb; uid text := ''; v_ip text := ''; v_key text := ''; c jsonb; m text; lim int; mins int; cnt int;
  v_w bigint; stop boolean := false;
begin
  begin
    begin claims := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb; exception when others then claims := '{}'::jsonb; end;
    if coalesce(claims->>'role', '') = 'service_role' then return; end if;
    c := coalesce((select value from public.site_config where key = 'shield'), '{}'::jsonb);
    if coalesce(c->>'db_off', '') = 'true' then return; end if;
    if coalesce(claims->>'sub', '') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then uid := claims->>'sub'; end if;
    v_ip := public.req_ip();
    v_key := case when uid <> '' then 'u:' || uid when v_ip <> '' then 'ip:' || v_ip else '' end;
    if v_key = '' then return; end if;
    -- כבר חסום (החשבון, או הכתובת כשמדובר באורח)?
    if exists (select 1 from public.rate_blocks b where b.until > now() and (b.k = v_key or (uid = '' and v_ip <> '' and b.ip = v_ip and b.k like 'ip:%'))) then
      stop := not public.shield_allowed_ip(v_ip);
    end if;
    m := upper(coalesce(current_setting('request.method', true), ''));
    if not stop and m in ('POST', 'PATCH', 'PUT', 'DELETE') and current_setting('transaction_read_only', true) = 'off' then
      lim := case when uid <> '' then case when coalesce(c->>'db_user_per_min', '') ~ '^\d{1,6}$' then (c->>'db_user_per_min')::int else 600 end
                  else case when coalesce(c->>'db_ip_per_min', '') ~ '^\d{1,6}$' then (c->>'db_ip_per_min')::int else 600 end end;
      if lim > 0 then
        v_w := floor(extract(epoch from now()) / 60);
        insert into public.rate_hits as h (k, w, n) values (v_key, v_w, 1)
          on conflict (k, w) do update set n = h.n + 1 returning h.n into cnt;
        -- בדיוק כשעוברים את הסף: נרשמת חסימה ואירוע (הבקשה הזו עוד עוברת, כדי שהרישום יישמר; הבאות נחסמות)
        if cnt = lim + 1 and not public.shield_allowed_ip(v_ip) and not (uid <> '' and public.is_admin()) then
          mins := case when coalesce(c->>'db_block_min', '') ~ '^\d{1,4}$' then greatest(1, (c->>'db_block_min')::int) else 10 end;
          insert into public.rate_blocks as b (k, ip, until, n, at) values (v_key, v_ip, now() + make_interval(mins => mins), cnt, now())
            on conflict (k) do update set until = excluded.until, n = excluded.n, at = now(), ip = excluded.ip;
          insert into public.security_events (src, kind, ip, n, detail)
          values ('db', 'db_rate', v_ip, cnt, jsonb_build_object('user', uid, 'path', left(coalesce(current_setting('request.path', true), ''), 80), 'min', mins, 'limit', lim));
        end if;
        if random() < 0.002 then delete from public.rate_hits where rate_hits.w < v_w - 3; end if;
      end if;
    end if;
  exception when others then
    return;  -- ההגנה לעולם לא מפילה את האתר
  end;
  if stop then
    raise sqlstate 'PT429' using message = 'יותר מדי בקשות. נסו שוב בעוד כמה דקות', detail = 'rate_limited';
  end if;
end $$;
revoke all on function public.yam_pre_request() from public;
grant execute on function public.yam_pre_request() to anon, authenticated, service_role;

-- התראה מיידית למנהלים על כל אירוע. בלי הצפה: אותו סוג ואותה כתובת פעם בחצי שעה, וכל סוג לכל היותר פעם ב-3 דקות
create or replace function public.security_event_alert() returns trigger
language plpgsql security definer set search_path = public as $$
declare c jsonb; s jsonb; kk text; t text; b text; a record; more int;
begin
  s := coalesce((select value from public.site_config where key = 'security'), '{}'::jsonb);
  if coalesce(s->>'alerts_off', '') = 'true' then return null; end if;
  c := coalesce((select value from public.site_config where key = 'shield'), '{}'::jsonb);
  if coalesce(c->'alerts'->>new.kind, case when new.kind in ('flood', 'ddos', 'probe', 'load', 'down', 'up', 'db_rate') then 'true' else 'false' end) <> 'true' then return null; end if;
  kk := 'sh:' || new.kind || ':' || coalesce(new.ip, '');
  if new.kind not in ('down', 'up') then
    if exists (select 1 from public.admin_alerts_sent where kind = kk and sent_at > now() - interval '30 minutes') then return null; end if;
    if exists (select 1 from public.admin_alerts_sent where kind = 'sh:' || new.kind and sent_at > now() - interval '3 minutes') then return null; end if;
  end if;
  insert into public.admin_alerts_sent(kind, sent_at, n) values (kk, now(), new.n) on conflict (kind) do update set sent_at = now(), n = excluded.n;
  insert into public.admin_alerts_sent(kind, sent_at, n) values ('sh:' || new.kind, now(), new.n) on conflict (kind) do update set sent_at = now(), n = excluded.n;
  select count(*)::int into more from public.security_events e where e.kind = new.kind and e.at > now() - interval '10 minutes' and e.id <> new.id;
  t := case new.kind
         when 'flood'   then '🛡️ הצפה נחסמה: ' || new.ip
         when 'ddos'    then '🚨 התקפת עומס (DDoS) על האתר — ההגנה הוחמרה'
         when 'probe'   then '🚨 ניסיון פריצה נחסם: ' || new.ip
         when 'direct'  then '⚡ פנייה ישירה לשרת נחסמה: ' || new.ip
         when 'load'    then '🔥 עומס גבוה על השרת'
         when 'down'    then '🔴 האתר לא עונה!'
         when 'up'      then '🟢 האתר חזר לעבוד'
         when 'db_rate' then '🛡️ הצפת בקשות למסד נחסמה' || case when new.ip <> '' then ': ' || new.ip else '' end
         when 'ssh'     then '🚨 ניסיונות כניסה לשרת: ' || new.ip
         else '🛡️ ' || new.kind end;
  b := case new.kind
         when 'flood'   then 'יותר מדי חיבורים בבת אחת. הכתובת חסומה ל-' || coalesce(new.detail->>'min', '10') || ' דקות.'
         when 'ddos'    then new.n || ' חיבורים חדשים בדקה (בדרך כלל ' || coalesce(new.detail->>'base', '?') || '). ' || coalesce(new.detail->>'blocked', '0') || ' כתובות נחסמו.'
         when 'probe'   then 'חיפש ' || left(coalesce(new.detail->>'path', ''), 60) || '. חסום ל-24 שעות.'
         when 'direct'  then left(coalesce(new.detail->>'path', ''), 60)
         when 'load'    then left(coalesce(new.detail->>'why', ''), 120)
         when 'down'    then left(coalesce(new.detail->>'why', 'השומר בשרת לא מקבל תשובה מהאתר'), 120)
         when 'up'      then 'האתר עונה שוב.'
         when 'db_rate' then new.n || ' בקשות כתיבה בדקה. חסום ל-' || coalesce(new.detail->>'min', '10') || ' דקות.'
         when 'ssh'     then new.n || ' ניסיונות כושלים.'
         else '' end || case when more > 0 then ' (ועוד ' || more || ' ב-10 הדקות האחרונות)' else '' end;
  for a in select distinct id from public.admin_ids() id loop
    perform public.push_enqueue(a.id, 'staff', t, b, '/#admin-shield', 'shield:' || new.kind);
  end loop;
  return null;
exception when others then return null;  -- התראה שנכשלה לא מבטלת את הרישום
end $$;
revoke all on function public.security_event_alert() from public, anon, authenticated;
drop trigger if exists security_event_alert on public.security_events;
create trigger security_event_alert after insert on public.security_events for each row execute function public.security_event_alert();

-- כתובות משותפות (כמו נטפרי): מאותה כתובת נכנסו 3 חשבונות שונים ומעלה ב-30 יום — השומר נותן להן סף גבוה פי 10.
-- וגם הכתובות שמהן מנהל נכנס לאתר ב-14 הימים האחרונים (admin) — אלה לא נחסמות בכלל, כדי שלא תינעל מחוץ לשרת.
create or replace function public.shield_known_ips() returns table(ip text, accounts int, admin boolean)
language sql stable security definer set search_path = public as $$
  select e.ip, count(distinct lower(e.email))::int,
         bool_or(e.user_id in (select public.admin_ids()) and e.created_at > now() - interval '14 days')
    from public.auth_events e
   where e.kind in ('login', 'google_login', 'signup') and e.created_at > now() - interval '30 days' and e.ip <> '' and e.email <> ''
   group by e.ip
  having count(distinct lower(e.email)) >= 3 or bool_or(e.user_id in (select public.admin_ids()) and e.created_at > now() - interval '14 days')
   order by 2 desc limit 3000;
$$;
revoke all on function public.shield_known_ips() from public, anon, authenticated;
grant execute on function public.shield_known_ips() to service_role;

-- ניקוי: אירועים 90 יום, מדידות 3 ימים, חסימות במסד שפגו לפני יום
create or replace function public.shield_cleanup() returns void
language sql security definer set search_path = public as $$
  delete from public.security_events where at < now() - interval '90 days';
  delete from public.shield_load where at < now() - interval '3 days';
  delete from public.rate_blocks where until < now() - interval '1 day';
  delete from public.rate_hits where w < floor(extract(epoch from now()) / 60) - 3;
$$;
revoke all on function public.shield_cleanup() from public, anon, authenticated;
grant execute on function public.shield_cleanup() to service_role;

-- מפעילים את הבדיקה לפני כל בקשה. לכיבוי מיידי בלי SQL: בק אופיס ← 🛡️ ← "הגבלה במסד" (db_off).
-- לביטול מלא: alter role authenticator reset pgrst.db_pre_request; notify pgrst, 'reload config';
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    execute 'alter role authenticator set pgrst.db_pre_request = ''public.yam_pre_request''';
    notify pgrst, 'reload config';
  end if;
exception when others then raise notice 'db_pre_request: %', sqlerrm; end $$;

-- =====================================================================
-- אתר הבית של יסוד שביסוד (/yesod/): טופס "צרו קשר" לציבור, גם בלי חשבון.
-- הפנייה נשמרת ב-feedback (בלי user_id) ומופיעה בבק אופיס יחד עם שאר ההודעות.
-- הגנה מספאם: שדה מלכודת, זמן מילוי מינימלי, עד 3 פניות ב-10 דקות ו-8 ביום מאותה כתובת, ועד 60 ביום בסך הכל.
-- פרטיות: נשמר רק מה שהפונה כתב + שעת ההסכמה. פניות מהאתר נמחקות אחרי 12 חודשים (כך כתוב בהודעת הפרטיות).
-- =====================================================================
create table if not exists public.studio_contact_hits (ip text not null, at timestamptz not null default now());
create index if not exists studio_contact_hits_ip on public.studio_contact_hits (ip, at);
alter table public.studio_contact_hits enable row level security;

create or replace function public.studio_contact(p_name text, p_contact text, p_topic text, p_message text,
                                                 p_consent boolean, p_hp text default '', p_ms int default 0) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_ip text := coalesce(public.req_ip(), ''); fid uuid; nm text; ct text; msg text; tp text;
begin
  -- בוט: מילא את שדה המלכודת או שלח תוך פחות מ-3 שניות. עונים "נשלח" ולא שומרים
  if coalesce(p_hp, '') <> '' or coalesce(p_ms, 0) < 3000 then return true; end if;
  if p_consent is not true then raise exception 'צריך לאשר את הודעת הפרטיות' using errcode = 'P0001'; end if;
  nm := left(btrim(regexp_replace(coalesce(p_name, ''), '[\r\n\t<>]+', ' ', 'g')), 60);
  ct := left(btrim(regexp_replace(coalesce(p_contact, ''), '[\r\n\t<>]+', ' ', 'g')), 120);
  msg := btrim(coalesce(p_message, ''));
  tp := case when p_topic in ('app', 'yam', 'other') then p_topic else 'other' end;
  if char_length(nm) < 2 then raise exception 'נא לכתוב שם' using errcode = 'P0001'; end if;
  if ct !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' and regexp_replace(ct, '[^0-9]', '', 'g') !~ '^(0[2-9][0-9]{7,8}|972[2-9][0-9]{7,8})$' then
    raise exception 'נא לכתוב טלפון או כתובת מייל תקינים' using errcode = 'P0001';
  end if;
  if char_length(msg) < 5 or char_length(msg) > 2000 then raise exception 'ההודעה צריכה להיות בין 5 ל-2000 תווים' using errcode = 'P0001'; end if;

  delete from public.studio_contact_hits where at < now() - interval '1 day';
  delete from public.feedback where user_id is null and message like '🌐 פנייה מאתר יסוד שביסוד%' and created_at < now() - interval '12 months';
  if v_ip <> '' and ((select count(*) from public.studio_contact_hits where ip = v_ip and at > now() - interval '10 minutes') >= 3
               or (select count(*) from public.studio_contact_hits where ip = v_ip) >= 8) then
    raise exception 'נשלחו כבר כמה פניות מהמכשיר הזה. נסו שוב מאוחר יותר' using errcode = 'P0001', hint = 'rate_limit';
  end if;
  if (select count(*) from public.studio_contact_hits) >= 60 then
    raise exception 'הטופס עמוס כרגע. נסו שוב מחר' using errcode = 'P0001', hint = 'rate_limit';
  end if;
  insert into public.studio_contact_hits (ip) values (v_ip);

  insert into public.feedback (user_id, name, email, message)
  values (null, nm, ct,
          '🌐 פנייה מאתר יסוד שביסוד · ' ||
          case tp when 'app' then 'אפליקציה' when 'yam' then 'רשימת קניות' else 'אחר' end ||
          E'\n' || msg || E'\n\n(אישר/ה את הודעת הפרטיות ' || to_char(now() at time zone 'Asia/Jerusalem', 'DD.MM.YYYY HH24:MI') || ')')
  returning id into fid;
  -- הטריגר fill_author ממלא שם ומייל מהחשבון; כאן הפונה כתב אותם בעצמו
  update public.feedback set user_id = null, name = nm, email = ct where id = fid;
  return true;
end $$;
revoke all on function public.studio_contact(text, text, text, text, boolean, text, int) from public;
grant execute on function public.studio_contact(text, text, text, text, boolean, text, int) to anon, authenticated;

-- =====================================================================
-- אתר יסוד שביסוד (yesod.yamshopping.com): סטטיסטיקה אנונימית של כניסות ולחיצות על הורדה.
-- לא נשמר שום מזהה: לא חשבון, לא כתובת IP. רק סוג האירוע, מאיזה מקור/קישור, וסוג המכשיר. נשמר 180 יום.
-- =====================================================================
create table if not exists public.yesod_events (
  id bigserial primary key,
  kind text not null check (kind in ('view','download')),
  item text not null default '',
  src text not null default 'direct',
  referrer text not null default '',
  device text not null default '',
  at timestamptz not null default now()
);
create index if not exists yesod_events_at on public.yesod_events (at desc);
alter table public.yesod_events enable row level security;
revoke all on public.yesod_events from anon, authenticated;

create or replace function public.yesod_event(p_kind text, p_item text default '', p_src text default '', p_referrer text default '', p_device text default '')
returns void language plpgsql volatile security definer set search_path = public as $$
declare it text;
begin
  if p_kind = 'view' then it := '';
  elsif p_kind = 'download' and p_item in ('apk', 'offline', 'web') then it := p_item;
  else return; end if;
  -- הגנה מהצפה: עד 2000 אירועים בשעה בסך הכל
  if (select count(*) from public.yesod_events where at > now() - interval '1 hour') >= 2000 then return; end if;
  insert into public.yesod_events(kind, item, src, referrer, device)
  values (p_kind, it, coalesce(public.visit_src_clean(p_src), 'direct'), public.visit_url_clean(p_referrer),
          left(regexp_replace(coalesce(p_device, ''), '[^[:alnum:][:space:]·./()_-]', '', 'g'), 60));
  if random() < 0.01 then delete from public.yesod_events where at < now() - interval '180 days'; end if;
end $$;
revoke all on function public.yesod_event(text, text, text, text, text) from public;
grant execute on function public.yesod_event(text, text, text, text, text) to anon, authenticated;

-- לצוות עם הרשאת "מבקרים": האירועים בטווח הימים שנבחר
create or replace function public.staff_yesod_events(p_days int default 30)
returns table(at timestamptz, kind text, item text, src text, referrer text, device text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() or not public.staff_can('visitors') then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select e.at, e.kind, e.item, e.src, e.referrer, e.device from public.yesod_events e
    where e.at > now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 180))
    order by e.at desc limit 10000;
end $$;
revoke all on function public.staff_yesod_events(int) from public, anon;
grant execute on function public.staff_yesod_events(int) to authenticated;

-- ================= 💌 תשובה לפנייה ישר מהבק אופיס (נובמבר 2026) =================
-- מנהל כותב תשובה מתחת להערה / לפנייה מאתר יסוד שביסוד, ופונקציית email שולחת אותה במייל לפונה (דרך Resend),
-- עם ההודעה המקורית מצוטטת. כאן נשמרות התשובות, כדי שבבק אופיס יראו מה כבר נענה. רק הפונקציה (service role) כותבת.
-- זו תשובה חד-פעמית למי שפנה בעצמו, לא דבר פרסומת. התשובות נמחקות יחד עם ההערה (on delete cascade, כולל הניקוי של 12 חודשים).
create table if not exists public.feedback_replies (
  id bigserial primary key,
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  sent_by uuid,
  sent_at timestamptz not null default now(),
  provider_id text not null default ''
);
create index if not exists feedback_replies_fb on public.feedback_replies (feedback_id, sent_at);
create index if not exists feedback_replies_at on public.feedback_replies (sent_at desc);
alter table public.feedback_replies enable row level security;
drop policy if exists "feedback replies admin read" on public.feedback_replies;
create policy "feedback replies admin read" on public.feedback_replies for select using (public.is_admin());
revoke insert, update, delete on public.feedback_replies from anon, authenticated;

-- ================= 🛡️ יומן התקלות בלי חסימות של נטפרי (נובמבר 2026) =================
-- מוחק דיווחי CSP ישנים על הסקריפט שנטפרי מזריק (netfree.link). מעכשיו הם לא נרשמים בכלל (באתר וב-log_client_error)
delete from public.client_errors where msg ~* 'CSP[^:]*: script-src.*netfree\.[a-z]+';

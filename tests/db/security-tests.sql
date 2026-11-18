-- v19 security tests. Each line printed is "PASS <label>"; any failure aborts with "FAIL <label>".
\pset tuples_only on
\pset format unaligned
create schema if not exists tst;
grant usage on schema tst to anon, authenticated, service_role;
create or replace function tst.ok(c boolean, l text) returns text language plpgsql as $$
begin if c is distinct from true then raise exception 'FAIL %', l; end if; return 'PASS ' || l; end $$;
create or replace function tst.err(q text, l text) returns text language plpgsql as $$
begin
  begin execute q; exception when others then return 'PASS ' || l || '  [blocked: ' || left(sqlerrm, 70) || ']'; end;
  raise exception 'FAIL % (no error)', l;
end $$;
create or replace function tst.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
grant execute on all functions in schema tst to anon, authenticated, service_role;

-- (v20) site signups must carry the auth-guard HMAC mark; the owner signs in with Google
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data)
select v.id::uuid, v.email, case when v.conf then now() end,
       jsonb_build_object('name', v.nm, 'guard', encode(extensions.hmac(v.email, (select pepper from public.auth_secret where id = 1), 'sha256'), 'hex')),
       case when v.email = 'owner@x.com' then '{"provider":"google","yam_owner":true}' else '{}' end::jsonb
from (values
  ('00000000-0000-0000-0000-000000000001','owner@x.com','Owner',true),
  ('00000000-0000-0000-0000-000000000002','mod@x.com','Mod',true),
  ('00000000-0000-0000-0000-000000000003','mgr@x.com','Mgr',true),
  ('00000000-0000-0000-0000-000000000004','mgr2@x.com','Mgr2',true),
  ('00000000-0000-0000-0000-00000000000a','a@x.com','Alice',true),
  ('00000000-0000-0000-0000-00000000000b','b@x.com','Bob',true),
  ('00000000-0000-0000-0000-00000000000c','c@x.com','Carol',true),
  ('00000000-0000-0000-0000-00000000000d','d@x.com','Dan',true),
  ('00000000-0000-0000-0000-00000000000e','e@x.com','Eve',true),
  ('00000000-0000-0000-0000-00000000000f','f@x.com','Fay',true),
  ('00000000-0000-0000-0000-000000000010','g@x.com','Gil',true),
  ('00000000-0000-0000-0000-000000000011','unconf@x.com','Unconfirmed',false)) v(id, email, nm, conf);
insert into public.staff(user_id, role) values ('00000000-0000-0000-0000-000000000002','moderator');
insert into public.chains(name, kind) values ('רמי לוי','store'),('יש חסד','store') on conflict do nothing;
insert into public.store_managers(user_id, chain, auto_approve) values
  ('00000000-0000-0000-0000-000000000003','רמי לוי',false), ('00000000-0000-0000-0000-000000000004','יש חסד',true);
insert into public.store_orders(chain, user_id, name, phone, items) values ('רמי לוי','00000000-0000-0000-0000-00000000000a','Alice','0501234567','[{"name":"x","qty":1}]');

-- ======== 1. images ========
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.err($$insert into public.recipes(name, steps, author_id, image) values ('r','s',auth.uid(),'data:image/png;base64,x" onerror="alert(1)')$$, '1 recipe image XSS');
select tst.err($$insert into public.my_products(pkey, image) values ('k','data:image/png;base64,AAAA"><script>')$$, '1 my_products image XSS');
insert into public.recipes(name, steps, author_id, image) values ('legit','s',auth.uid(),'data:image/png;base64,iVBORw0KGgo=');
select tst.ok(true, '1 legit recipe image accepted');
insert into public.my_products(pkey, image) values ('k1','data:image/jpeg;base64,/9j/4AAQ+/==');
select tst.ok(true, '1 legit my_products image accepted');
select tst.err($$insert into public.store_posts(chain, kind, title, image, created_by) values ('רמי לוי','deal','t','https://x.com/a.png" onerror="x',auth.uid())$$, '1 store_posts https image with quote');
insert into public.store_posts(chain, kind, title, image, created_by) values ('רמי לוי','deal','t','https://x.com/a.png',auth.uid());
select tst.ok(true, '1 store_posts legit https image accepted');
select tst.as_user('00000000-0000-0000-0000-000000000003');
select tst.ok(public.store_settings('רמי לוי', '{"logo":"data:image/png;base64,AA\" onerror=x"}') = 'bad_logo', '1 store_settings bad logo -> bad_logo');
select tst.ok(public.store_settings('רמי לוי', '{"logo":"data:image/png;base64,AAAA"}') = 'ok', '1 store_settings legit logo ok');
select tst.err($$update public.store_inventory set image = 'data:image/png;base64,A"<' where false; insert into public.store_inventory(chain, name, image) values ('רמי לוי','n','data:image/webp;base64,A <svg>')$$, '1 store_inventory image XSS');
-- ======== 2. URLs ========
select tst.ok(public.store_settings('רמי לוי', '{"website":"javascript:alert(1)"}') = 'bad_url', '2 store_settings website javascript: -> bad_url');
select tst.ok(public.store_settings('רמי לוי', '{"website":"https://x.com/\"onmouseover=x"}') = 'bad_url', '2 store_settings website with quote -> bad_url');
select tst.ok(public.store_profile_update('רמי לוי', '{"website":"https://a.com/ x"}') = 'bad_url', '2 store_profile_update website with space -> bad_url');
select tst.ok(public.store_settings('רמי לוי', '{"website":"https://rami-levy.co.il/he"}') = 'ok', '2 legit website ok');
select tst.ok(public.store_inventory_settings('רמי לוי', true, false, '', 'https://x.com/"x') = 'bad_url', '2 store_inventory_settings bad url');
select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.err($$insert into public.chains(name, website, created_by) values ('evil','javascript:alert(1)',auth.uid())$$, '2 chains insert javascript: website');
select tst.err($$insert into public.clothing_shops(name, website, created_by) values ('evil','https://a.com/"><img',auth.uid())$$, '2 clothing_shops bad website');
insert into public.clothing_shops(name, website, created_by) values ('good','https://shop.co.il',auth.uid());
select tst.ok(true, '2 clothing_shops legit website ok');
reset role;
select tst.err($$insert into public.ads(title, link_url) values ('x','https://a.com/" onclick=x')$$, '2 ads link_url with quote (even admin)');
select tst.err($$insert into public.ads(title, emoji) values ('x','<img>')$$, '2 ads emoji with markup rejected');
select tst.err($$insert into public.ads(title, theme) values ('x','pink;')$$, '2 ads unknown theme rejected');
select tst.err($$insert into public.ads(title, placement) values ('x','everywhere')$$, '2 ads unknown placement rejected');
insert into public.ads(id, title, placement, emoji, theme) values ('44444444-4444-4444-4444-444444444444','side','side','🥛','blue');
select tst.ok(true, '2 ads side placement with emoji + theme ok');
delete from public.ads where id = '44444444-4444-4444-4444-444444444444';
-- 🎬 פרסומות וידאו: רק כתובת מהדלי ad-videos ב-Supabase Storage; העלאה ומחיקה רק למנהל
select tst.err($$insert into public.ads(title, video) values ('x','https://evil.com/a.mp4')$$, '2 ads video from foreign host rejected');
select tst.err($$insert into public.ads(title, video) values ('x','https://abc.supabase.co/storage/v1/object/public/ad-videos/a.mp4" onerror=x')$$, '2 ads video with quote rejected');
insert into public.ads(id, title, video) values ('45454545-4545-4545-4545-454545454545','vid','https://abc.supabase.co/storage/v1/object/public/ad-videos/1729-ab12.mp4');
select tst.ok(true, '2 ads video from own storage ok');
delete from public.ads where id = '45454545-4545-4545-4545-454545454545';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.err($$insert into storage.objects(bucket_id, name) values ('ad-videos','x.mp4')$$, '2 regular user cannot upload ad video');
select tst.as_user('00000000-0000-0000-0000-000000000001');
insert into storage.objects(bucket_id, name) values ('ad-videos','owner.mp4');
select tst.ok(true, '2 owner uploads ad video');
select tst.as_user('00000000-0000-0000-0000-00000000000a');
delete from storage.objects where name = 'owner.mp4';
reset role;
select tst.ok(exists(select 1 from storage.objects where name = 'owner.mp4'), '2 regular user cannot delete ad video');
delete from storage.objects where name = 'owner.mp4';
-- 🎬 דלי clips (סרטונים חדשים — לא נחסם בחוסמי פרסומות)
insert into public.ads(id, title, video) values ('45454545-4545-4545-4545-454545454546','vid2','https://abc.supabase.co/storage/v1/object/public/clips/1729-ab12.mp4');
select tst.ok(true, '2 ads video from clips bucket ok');
delete from public.ads where id = '45454545-4545-4545-4545-454545454546';
select tst.ok((select public from storage.buckets where id = 'clips'), '2 clips bucket exists and is public');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.err($$insert into storage.objects(bucket_id, name) values ('clips','x.mp4')$$, '2 regular user cannot upload to clips');
select tst.as_user('00000000-0000-0000-0000-000000000001');
insert into storage.objects(bucket_id, name) values ('clips','owner2.mp4');
select tst.ok(true, '2 owner uploads to clips');
reset role; delete from storage.objects where name = 'owner2.mp4';

-- ======== 3. rooms ========
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select set_config('tst.code', public.ensure_my_room(), false);
select tst.ok(current_setting('tst.code') ~ '^YAM[0-9A-F]{16}$', '3c new room code is YAM+16 hex');
update public.rooms set data = '{"lists":[{"id":"L1","name":"x","items":[{"id":"i1","n":"milk","done":false},{"id":"i2","n":"bread","done":true}]}],"history":[]}' where code = current_setting('tst.code');
-- B joins with code (family feature) as full
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok(public.join_room(current_setting('tst.code')), '3 legit join_room with code works');
select tst.ok((select role from public.my_rooms() where code = current_setting('tst.code')) = 'full', '3 code joiner is full');
-- A removes B -> B cannot re-join with code
select tst.as_user('00000000-0000-0000-0000-00000000000a');
select set_config('tst.code0', current_setting('tst.code'), false);
select tst.ok(public.room_member_remove('00000000-0000-0000-0000-00000000000b'), '3 owner removes B');
select set_config('tst.code', public.ensure_my_room(), false);
select tst.ok(current_setting('tst.code') <> current_setting('tst.code0'), '20.1 removing a full member rotates the room code');
select tst.ok((select code from public.my_rooms() where role = 'owner') = current_setting('tst.code'), '20.1 owner refresh: my_rooms returns the new code');
select tst.ok((select data->'lists'->0->>'id' from public.rooms where code = current_setting('tst.code')) = 'L1', '20.1 data kept after automatic rotation');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok(not public.join_room(current_setting('tst.code0')), '3a removed member cannot re-join with code');
select tst.ok(not public.join_room(current_setting('tst.code')), '20.1 removed member cannot join the new code either (ban moved)');
-- invite as secondary (clears ban)
select tst.as_user('00000000-0000-0000-0000-00000000000a');
select set_config('tst.inv', public.room_invite_create('{"act":{"add":false,"check":false,"delete":false,"finish":false}}')::text, false);
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select set_config('tst.aliasB', public.room_invite_accept(current_setting('tst.inv')::jsonb->>'token', current_setting('tst.inv')::jsonb->>'otp', 'Bob')->>'code', false);
select tst.ok(current_setting('tst.aliasB') ~ '^S[0-9A-F]{16}$', '3a invite accept works after ban (ban cleared) and returns an alias');
select tst.ok(current_setting('tst.aliasB') <> current_setting('tst.code'), '20.1 secondary never gets the real room code');
select tst.ok((select role from public.my_rooms() where code = current_setting('tst.aliasB')) = 'secondary', '3 invited user is secondary');
select tst.ok(not exists (select 1 from public.my_rooms() where code = current_setting('tst.code')), '20.1 my_rooms does not show the real code to a secondary');
select tst.ok((select count(*) from public.room_members) = 0, '20.1 secondary cannot read its room_members row (has the real code)');
select tst.ok(public.room_access(current_setting('tst.aliasB'))->>'role' = 'secondary' and public.room_access(current_setting('tst.code')) is null
          and public.room_get(current_setting('tst.code')) is null, '20.1 room_access/room_get: alias works, real code refused for a secondary');
select tst.ok(public.join_room(current_setting('tst.code')) and (select role from public.my_rooms() where code = current_setting('tst.aliasB')) = 'secondary', '3a join_room while secondary does not upgrade to full');

-- ======== 4. room_put per-action perms (B: no add/check/delete/finish) ========
select tst.ok(not public.room_put(current_setting('tst.aliasB'),
  '{"lists":[{"id":"L1","name":"x","items":[{"id":"i1","n":"milk","done":true},{"id":"i9","n":"evil","done":false}]},{"id":"L2","name":"new","items":[]}],"history":[{"ts":1,"items":[{"n":"bread"}]}]}', 'Bob'),
  '4 secondary violating put returns false');
reset role;
select tst.ok((select data->'lists' from public.rooms where code = current_setting('tst.code')) =
  '[{"id":"L1","name":"x","items":[{"id":"i1","n":"milk","done":false},{"id":"i2","n":"bread","done":true}]}]'::jsonb,
  '4 no-add/no-check/no-delete: new item+list dropped, done reverted, deleted item restored');
select tst.ok((select data->'history' from public.rooms where code = current_setting('tst.code')) = '[]'::jsonb, '4 no-finish: history did not grow');
-- default perms: add/check/finish yes, delete no
update public.room_members set perms = public.room_default_perms() where user_id = '00000000-0000-0000-0000-00000000000b';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok(public.room_put(current_setting('tst.aliasB'),
  '{"lists":[{"id":"L1","name":"x","items":[{"id":"i1","n":"milk","done":true},{"id":"i3","n":"eggs","done":false}]}],"history":[{"ts":5,"items":[{"n":"bread"}]}]}', 'Bob'),
  '4 legit secondary flow (add, check, finish done item) returns true');
reset role;
select tst.ok((select data->'lists'->0->'items' from public.rooms where code = current_setting('tst.code')) =
  '[{"id":"i1","n":"milk","done":true},{"id":"i3","n":"eggs","done":false}]'::jsonb, '4 legit changes saved');
select tst.ok((select (data->'tomb'->'items'->>'i2')::numeric between extract(epoch from now()) * 1000 - 60000 and extract(epoch from now()) * 1000 + 60000
               from public.rooms where code = current_setting('tst.code')), '20.2 finished item i2 got a server-time tombstone');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok((public.room_get(current_setting('tst.aliasB'))->'tomb'->'items') ? 'i2', '20.2 room_get returns the tombstones to the secondary');
select tst.ok(not public.room_put(current_setting('tst.aliasB'), '{"lists":[{"id":"L1","name":"x","items":[{"id":"i1","n":"milk","done":true}]}]}', 'Bob'), '4 no-delete: deleting undone item returns false');
reset role;
select tst.ok((select jsonb_array_length(data->'lists'->0->'items') from public.rooms where code = current_setting('tst.code')) = 2, '4 no-delete: item restored');
-- ======== 5. room size ========
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.err($$update public.rooms set data = jsonb_build_object('junk', (select jsonb_agg(md5(g::text) || md5((g*7)::text)) from generate_series(1, 60000) g)) where code = current_setting('tst.code')$$, '5 owner writes >2MB room data');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.err($$select public.room_put(current_setting('tst.aliasB'), jsonb_build_object('stats', (select jsonb_object_agg('k'||g, md5(g::text) || md5((g*3)::text)) from generate_series(1, 60000) g)), 'Bob')$$, '5 secondary room_put oversized');
-- leave as secondary -> banned from code-join
select public.leave_room(current_setting('tst.aliasB'));
select tst.ok(not public.join_room(current_setting('tst.code')), '3a secondary who left cannot re-join as full with code');
-- D joins as full, A rotates
select tst.as_user('00000000-0000-0000-0000-00000000000d');
select tst.ok(public.join_room(current_setting('tst.code')), '3 D joins with code');
select tst.err($$select public.room_rotate_code(current_setting('tst.code'))$$, '3d non-owner cannot rotate code');
select tst.as_user('00000000-0000-0000-0000-00000000000a');
select set_config('tst.code2', public.room_rotate_code(current_setting('tst.code')), false);
select tst.ok(current_setting('tst.code2') <> current_setting('tst.code') and public.ensure_my_room() = current_setting('tst.code2'), '3d owner rotated code; ensure_my_room returns new code');
select tst.ok((select data->'lists'->0->>'id' from public.rooms where code = current_setting('tst.code2')) = 'L1', '3d data kept after rotate');
select tst.as_user('00000000-0000-0000-0000-00000000000d');
select tst.ok(not public.join_room(current_setting('tst.code')), '3d old code no longer works');
select tst.ok((select code from public.my_rooms() where role = 'full') = current_setting('tst.code2'), '3e member finds new code via my_rooms()');
select tst.ok((select count(*) from public.rooms where code = current_setting('tst.code2')) = 1, '3d member can still read room under new code');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok(not public.join_room(current_setting('tst.code2')), '3d ban moved to new code');
-- rate limit join failures
select tst.as_user('00000000-0000-0000-0000-00000000000c');
select count(*) from generate_series(1, 20) g where public.join_room('YAMNOPE' || g);
select tst.ok(not public.join_room(current_setting('tst.code2')), '3b after 20 failed guesses even a valid code is refused');
reset role;
select tst.err($$set role anon; select public.my_rooms()$$, '3e anon cannot call my_rooms'); reset role;

-- ======== 6. manages(): moderators lose business data ========
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok(not public.manages('רמי לוי'), '6 moderator: manages() false');
select tst.ok((select count(*) from public.store_orders) = 0, '6 moderator cannot read store_orders PII');
select tst.err($$select public.store_api_key_new('רמי לוי')$$, '6 moderator cannot rotate POS key');
select tst.ok((select status from public.store_posts where title = 't' limit 1) = 'pending', '6 (setup) customer deal is pending');
select tst.ok(public.staff_decide('post', (select id::text from public.store_posts where title = 't' limit 1), true) = 'ok', '6 moderator still approves posts (is_staff)');
select tst.as_user('00000000-0000-0000-0000-000000000003');
select tst.ok((select count(*) from public.store_orders) = 1, '6 real store manager still sees own orders');
select tst.ok(public.store_api_key_new('רמי לוי') like 'yam_%', '6 manager can create POS key');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select count(*) from public.store_orders) = 1, '6 admin still sees orders');

-- ======== 7. price_sources ========
select tst.as_user('00000000-0000-0000-0000-000000000003');
select tst.err($$insert into public.price_sources(url, chain, target) values ('https://x.com/p.xml','רמי לוי','both')$$, '7 non-auto manager: target both blocked');
select tst.err($$insert into public.price_sources(url, chain, target) values ('https://x.com/p.xml','רמי לוי','prices')$$, '7 non-auto manager: target prices blocked');
select tst.err($$insert into public.price_sources(url, chain, target) values ('http://x.com/p.xml','רמי לוי','inventory')$$, '7 http url blocked');
select tst.err($$insert into public.price_sources(url, chain, target) values ('https://x.com/' || repeat('a', 500),'רמי לוי','inventory')$$, '7 url > 500 blocked');
insert into public.price_sources(url, chain, target) values ('https://x.com/inv.xml','רמי לוי','inventory');
select tst.ok((select created_by = '00000000-0000-0000-0000-000000000003' and by_admin = false from public.price_sources where url = 'https://x.com/inv.xml'), '7 inventory source ok, created_by set, by_admin=false');
select tst.as_user('00000000-0000-0000-0000-000000000004');
insert into public.price_sources(url, chain, target) values ('https://y.com/p.xml','יש חסד','both');
select tst.ok(true, '7 auto_approve manager may use target both');
select tst.as_user('00000000-0000-0000-0000-000000000001');
insert into public.price_sources(url, chain) values ('https://z.com/p.xml','רמי לוי');
select tst.ok((select by_admin from public.price_sources where url = 'https://z.com/p.xml'), '7 admin source: by_admin=true');

-- ======== 8. push / rate limits ========
select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(public.push_subscribe('https://evil.com/collect', 'k', 'a', 'ua') = 'bad', '8 push endpoint evil.com rejected');
select tst.ok(public.push_subscribe('https://fcm.googleapis.com.evil.com/x', 'k', 'a', 'ua') = 'bad', '8 push endpoint suffix trick rejected');
select tst.ok(public.push_subscribe('https://user@fcm.googleapis.com/x', 'k', 'a', 'ua') = 'bad', '8 push endpoint userinfo trick rejected');
select count(*) from generate_series(1, 12) g where public.push_subscribe('https://fcm.googleapis.com/fcm/send/tok' || g, 'k', 'a', 'ua') = 'ok';
select tst.ok(public.push_subscribe('https://wns2-par02p.notify.windows.com/w/?token=abc', 'k', 'a', 'ua') = 'ok'
          and public.push_subscribe('https://web.push.apple.com/QAbc', 'k', 'a', 'ua') = 'ok'
          and public.push_subscribe('https://updates.push.services.mozilla.com/wpush/v2/abc', 'k', 'a', 'ua') = 'ok', '8 legit push services accepted');
select tst.ok((select count(*) from public.push_subs) = 10, '8 max 10 push subscriptions per user');
do $$ begin for g in 1..20 loop insert into public.feedback(message) values ('hi ' || g); end loop; end $$;
select tst.ok(true, '8 20 feedback messages in an hour allowed');
select tst.err($$insert into public.feedback(message) values ('spam')$$, '8 21st feedback in an hour blocked');
do $$ begin for g in 1..30 loop insert into public.support_messages(user_id, body) values (auth.uid(), 'x' || g); end loop; end $$;
select tst.err($$insert into public.support_messages(user_id, body) values (auth.uid(), 'spam')$$, '8 31st support message blocked');
do $$ begin for g in 1..5 loop insert into public.business_requests(business) values ('b' || g); end loop; end $$;
select tst.err($$insert into public.business_requests(business) values ('b6')$$, '8 6th business request blocked');
do $$ begin for g in 2..20 loop insert into public.recipes(name, steps, author_id) values ('r' || g, 's', auth.uid()); end loop; end $$;
select tst.err($$insert into public.recipes(name, steps, author_id) values ('r21','s',auth.uid())$$, '8 21st recipe blocked');
do $$ begin for g in 2..1000 loop insert into public.my_products(pkey) values ('k' || g); end loop; end $$;
select tst.err($$insert into public.my_products(pkey) values ('k1001')$$, '8 my_products cap 1000');
insert into public.my_products(pkey, name) values ('k5', 'renamed') on conflict (user_id, pkey) do update set name = excluded.name;
select tst.ok(true, '8 my_products upsert of existing row still works at cap');
select tst.as_user('00000000-0000-0000-0000-000000000001');
insert into public.feedback(message) select 'staff ' || g from generate_series(1, 25) g;
select tst.ok(true, '8 staff not rate limited');
-- reaction push dedupe
reset role;
update public.recipes set status = 'approved' where name = 'legit';
set role authenticated;
select tst.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.recipe_reactions(recipe_id, emoji) select id, '😋' from public.recipes where name = 'legit';
delete from public.recipe_reactions where user_id = auth.uid();
insert into public.recipe_reactions(recipe_id, emoji) select id, '😍' from public.recipes where name = 'legit';
select tst.as_user('00000000-0000-0000-0000-00000000000d');
insert into public.recipe_reactions(recipe_id, emoji) select id, '👍' from public.recipes where name = 'legit';
reset role;
select tst.ok((select count(*) from public.push_queue where tag like 'react:%') = 1, '8 reaction push deduped (3 reactions -> 1 push)');

-- ======== 9. cron key ========
delete from net.calls;
select public.push_poke(); select public.prices_sync_poke();
select tst.ok((select count(*) from net.calls where headers->>'x-cron-key' = (select cron_key from public.auth_secret) and length(headers->>'x-cron-key') = 48) = 2, '9 push_poke/prices_sync_poke send x-cron-key');
set role authenticated;
select tst.err($$select cron_key from public.auth_secret$$, '9 authenticated cannot read auth_secret');
select tst.err($$select public.push_poke()$$, '9 authenticated cannot call push_poke');
reset role;

-- ======== 10. ai quota ========
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.err($$select public.ai_usage_take(auth.uid())$$, '10 authenticated cannot call ai_usage_take');
reset role; set role anon;
select tst.err($$select public.ai_usage_take('00000000-0000-0000-0000-00000000000a')$$, '10 anon cannot call ai_usage_take');
reset role; set role service_role;
select tst.ok(public.ai_usage_take('00000000-0000-0000-0000-00000000000a') = 1 and public.ai_usage_take('00000000-0000-0000-0000-00000000000a') = 2, '10 service_role: atomic counter 1,2');
reset role;

-- ======== 11. bans ========
insert into public.prices(product, product_key, chain, price, by_id) values ('חלב','חלב','רמי לוי',5,'00000000-0000-0000-0000-00000000000c');
insert into public.user_bans(user_id, kind) values ('00000000-0000-0000-0000-00000000000c','suspend');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000c');
select tst.err($$insert into public.store_recs(section, body) values ('women','spam spam')$$, '11 banned: store_recs insert');
select tst.err($$insert into public.clothing_shops(name, created_by) values ('x', auth.uid())$$, '11 banned: clothing_shops insert');
select tst.err($$insert into public.cloth_votes(target, target_id, vote) values ('shop', gen_random_uuid(), 1)$$, '11 banned: cloth_votes insert');
select tst.ok(public.vote_price((select id from public.prices where product = 'חלב' limit 1), 1)->>'error' = 'banned', '11 banned: vote_price refused');
select tst.ok(public.confirm_price((select id from public.prices where product = 'חלב' limit 1)) is null, '11 banned: confirm_price refused');
update public.prices set price = 1 where by_id = auth.uid();
reset role;
select tst.ok((select price from public.prices where product = 'חלב') = 5, '11 banned: cannot update own price');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.support_messages(user_id, body) values (auth.uid(), 'appeal');
select tst.ok(true, '11 banned user can still write to support (appeal)');

-- ======== 12. price edit resets confirmations ========
select tst.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.prices(product, product_key, chain, price, by_id) values ('לחם','לחם','רמי לוי',7,auth.uid());
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok((public.vote_price((select id from public.prices where product = 'לחם'), 1)->>'ok')::int = 1, '12 (setup) B confirms A''s price');
select tst.as_user('00000000-0000-0000-0000-00000000000a');
update public.prices set price = 99 where product = 'לחם';
reset role;
select tst.ok((select confirms = 0 and wrong = 0 from public.prices where product = 'לחם')
  and not exists (select 1 from public.price_confirms c join public.prices p on p.id = c.price_id where p.product = 'לחם'), '12 author changes price -> confirmations reset');

-- ======== 13. clothing ========
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.store_recs(section, body, by_name) values ('women','great shop','צוות האתר');
reset role; select tst.ok((select by_name from public.store_recs where body = 'great shop') = 'Alice', '13 store_recs by_name forced to profile name'); set role authenticated;
insert into public.cloth_votes(target, target_id, vote, by_name) values ('shop','11111111-1111-1111-1111-111111111111',1,'צוות האתר');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.cloth_votes(target, target_id, vote) values ('shop','11111111-1111-1111-1111-111111111111',-1);
update public.cloth_votes set handled = true, by_name = 'x' where user_id = auth.uid();
select tst.ok((select count(*) from public.cloth_votes) = 1, '13 cloth_votes: user sees only own votes');
select tst.ok((select not handled and by_name = 'Bob' from public.cloth_votes where user_id = auth.uid()), '13 cloth_votes: user cannot set handled / fake name');
reset role;
select tst.ok((select by_name from public.cloth_votes where user_id = '00000000-0000-0000-0000-00000000000a') = 'Alice', '13 cloth_votes by_name forced');
set role anon;
select tst.ok((select sum(n) from public.cloth_vote_counts() where target_id = '11111111-1111-1111-1111-111111111111') = 2, '13 cloth_vote_counts works for anon');
reset role;
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok((select count(*) from public.cloth_votes) = 2, '13 staff still sees all votes');
update public.cloth_votes set handled = true where vote = -1;
reset role;
select tst.ok((select handled from public.cloth_votes where vote = -1), '13 staff can mark handled');

-- ======== 14. client errors ========
set role anon; select tst.as_user('');
do $$ begin for g in 1..150 loop perform public.log_client_error('boom ' || g, '', '', ''); end loop; end $$;
reset role;
select tst.ok((select count(*) from public.client_errors) = 60, '14 anon error flood capped (60/min anon)');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin for g in 1..50 loop perform public.log_client_error(repeat('x', 5000), repeat('y', 5000), '', ''); end loop; end $$;
reset role;
select tst.ok((select count(*) from public.client_errors) = 80 and (select max(char_length(msg)) from public.client_errors) = 500, '14 per-user cap 20/min, message truncated');
-- app version, phone model and the anonymous device id are stored cleaned (and the old 4-argument call still works)
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000b');
select public.log_client_error('crash14', 'x.js:1', 'ua', '9', '2.1<b>', 'SM-S901B · Android 14<script>"', 'not-a-uuid');
select public.log_client_error('crash14b', 'x.js:1', 'ua', '9', '2.2', 'Pixel 8', '33333333-3333-4333-8333-333333333333');
select tst.ok((select count(*) from public.client_errors) = 0, '14 a regular user cannot read the error log');
reset role;
select tst.ok((select app_ver = '2.1' and device = 'SM-S901B · Android 14script' and dev = '' from public.client_errors where msg = 'crash14'), '14 app version / model cleaned, bad device id dropped');
select tst.ok((select app_ver = '2.2' and dev = '33333333-3333-4333-8333-333333333333' from public.client_errors where msg = 'crash14b'), '14 valid device id kept');
select tst.ok(not exists (select 1 from pg_proc where proname = 'log_client_error' and pronargs = 4), '14 old 4-argument log_client_error removed (no ambiguous calls)');

-- ======== 15. ad_event ========
insert into public.ads(id, title) values ('22222222-2222-2222-2222-222222222222','ad');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select public.ad_event('22222222-2222-2222-2222-222222222222','view') from generate_series(1, 5);
select public.ad_event('22222222-2222-2222-2222-222222222222','click') from generate_series(1, 5);
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select public.ad_event('22222222-2222-2222-2222-222222222222','view');
reset role;
select tst.ok((select views = 2 and clicks = 1 from public.ads where id = '22222222-2222-2222-2222-222222222222'), '15 ad_event deduped per user/day');

-- ======== 16. jsonb sizes ========
select tst.err($$insert into public.store_orders(chain, user_id, name, phone, items) select 'רמי לוי', null, 'x', '0501234567', jsonb_agg(jsonb_build_object('name', (select string_agg(md5((g*100+k)::text), '') from generate_series(1, 30) k), 'qty', 1)) from generate_series(1, 300) g$$, '16 store_orders huge items blocked');
insert into public.store_orders(chain, user_id, name, phone, items) values ('רמי לוי', null, 'x', '0501234567', '[{"name":"milk","qty":2}]');
select tst.ok(true, '16 normal order ok');
-- ======== 20. v20 security fixes ========
-- E = owner, F = full member, G = secondary (add + finish, no check / delete)
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000e');
select set_config('tst.codeE', public.ensure_my_room(), false);
select set_config('tst.now', ((extract(epoch from now()) * 1000)::bigint)::text, false);
update public.rooms set data = jsonb_build_object(
  'lists', jsonb_build_array(jsonb_build_object('id', 'L1', 'name', 'x', 'created', 1, 'items', jsonb_build_array(
     jsonb_build_object('id', 'a1', 'n', 'milk', 'done', false, 'ts', 1000),
     jsonb_build_object('id', 'a2', 'n', 'bread', 'done', true, 'ts', 1000),
     jsonb_build_object('id', 'a4', 'n', 'eggs', 'done', false, 'ts', 99999999999999)))),
  'history', '[{"ts":99999999999999,"items":[]}]'::jsonb,
  'customPantry', '["ok", 5, {"x":1}]'::jsonb || to_jsonb(repeat('x', 90)),
  'missingHome', '"notarray"'::jsonb,
  'templates', '[{"id":"t1"}, "bad", 3]'::jsonb,
  'tomb', jsonb_build_object('items', jsonb_build_object('z1', 99999999999999, 'z2', 'str', 'z3', current_setting('tst.now')::bigint - 1000, 'z4', 1)))
where code = current_setting('tst.codeE');
reset role;
select tst.ok((select data->'customPantry' = '["ok"]' and data->'missingHome' = '[]' and data->'templates' = '[{"id":"t1"}]'
               from public.rooms where code = current_setting('tst.codeE')), '20.3 rooms trigger: customPantry/missingHome only short strings, templates only objects');
select tst.ok((select (data->'history'->0->>'ts')::bigint between current_setting('tst.now')::bigint - 60000 and current_setting('tst.now')::bigint + 60000
                  and (data->'lists'->0->'items'->2->>'ts')::bigint < current_setting('tst.now')::bigint + 60000
                  and (data->'lists'->0->'items'->0->>'ts')::bigint = 1000
               from public.rooms where code = current_setting('tst.codeE')), '20.3 rooms trigger: far-future ts clamped to now, valid ts kept');
select tst.ok((select data->'tomb' = jsonb_build_object('items', jsonb_build_object('z3', current_setting('tst.now')::bigint - 1000), 'lists', '{}'::jsonb)
               from public.rooms where code = current_setting('tst.codeE')), '20.2 rooms trigger: tomb keeps only numeric, not-future, <30 days entries');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000f');
select tst.ok(public.join_room(current_setting('tst.codeE')), '20 (setup) F joins E as full member');
select tst.as_user('00000000-0000-0000-0000-00000000000e');
select set_config('tst.invE', public.room_invite_create('{"act":{"add":true,"check":false,"delete":false,"finish":true}}')::text, false);
select tst.as_user('00000000-0000-0000-0000-000000000010');
select set_config('tst.aliasG', public.room_invite_accept(current_setting('tst.invE')::jsonb->>'token', current_setting('tst.invE')::jsonb->>'otp', 'Gil')->>'code', false);
select tst.ok(current_setting('tst.aliasG') ~ '^S[0-9A-F]{16}$' and current_setting('tst.aliasG') <> current_setting('tst.codeE'), '20.1 invite accept returns an alias, not the room code');
select tst.ok((select code from public.my_rooms() where role = 'secondary') = current_setting('tst.aliasG'), '20.1 my_rooms gives the secondary its alias');
select tst.ok(public.room_get(current_setting('tst.aliasG'))->'lists'->0->>'id' = 'L1', '20.1 room_get works with the alias');
select tst.ok(public.room_get(current_setting('tst.codeE')) is null and public.room_access(current_setting('tst.codeE')) is null
          and not public.room_put(current_setting('tst.codeE'), '{"lists":[]}', 'G'), '20.1 secondary cannot use the real code');
select tst.as_user('00000000-0000-0000-0000-00000000000d');
select tst.ok(not public.join_room(current_setting('tst.aliasG')), '20.1 an alias cannot be used to join');
select tst.ok(public.room_get(current_setting('tst.aliasG')) is null and public.room_access(current_setting('tst.aliasG')) is null, '20.1 someone else''s alias gives nothing');
-- 4: fake history entry does not let a no-check/no-delete secondary delete an unchecked item
select tst.as_user('00000000-0000-0000-0000-000000000010');
select tst.ok(not public.room_put(current_setting('tst.aliasG'), jsonb_build_object(
    'lists', jsonb_build_array(jsonb_build_object('id', 'L1', 'name', 'x', 'items',
       (select jsonb_agg(i) from jsonb_array_elements(public.room_get(current_setting('tst.aliasG'))->'lists'->0->'items') i where i->>'id' <> 'a1'))),
    'history', jsonb_build_array(jsonb_build_object('ts', 7, 'items', '[{"n":"milk"}]'::jsonb)) || (public.room_get(current_setting('tst.aliasG'))->'history')), 'Gil'),
  '20.4 fake history entry cannot delete an unchecked item');
reset role;
select tst.ok((select exists (select 1 from jsonb_array_elements(data->'lists'->0->'items') i where i->>'id' = 'a1') and not (data->'tomb'->'items' ? 'a1')
               from public.rooms where code = current_setting('tst.codeE')), '20.4 unchecked item restored, no tombstone');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000010');
select tst.ok(not public.room_put(current_setting('tst.aliasG'), jsonb_build_object('lists', jsonb_build_array(jsonb_build_object('id', 'L1', 'name', 'x', 'items',
    (select jsonb_agg(case when i->>'id' = 'a1' then i || '{"n":"evil","ts":1}'::jsonb else i end)
     from jsonb_array_elements(public.room_get(current_setting('tst.aliasG'))->'lists'->0->'items') i)))), 'Gil'),
  '20.4 add-only secondary cannot rename an existing item');
reset role;
select tst.ok((select i->>'n' = 'milk' and (i->>'ts')::bigint = 1000 from public.rooms r, jsonb_array_elements(r.data->'lists'->0->'items') i
               where r.code = current_setting('tst.codeE') and i->>'id' = 'a1'), '20.4 name and ts of the existing item unchanged');
-- 2: legit finish of a checked item -> server tombstone; client tomb ignored
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000010');
select tst.ok(public.room_put(current_setting('tst.aliasG'), jsonb_build_object(
    'lists', jsonb_build_array(jsonb_build_object('id', 'L1', 'name', 'x', 'items',
       (select jsonb_agg(i) from jsonb_array_elements(public.room_get(current_setting('tst.aliasG'))->'lists'->0->'items') i where i->>'id' <> 'a2'))),
    'history', jsonb_build_array(jsonb_build_object('ts', 8, 'items', '[{"n":"bread"}]'::jsonb)) || (public.room_get(current_setting('tst.aliasG'))->'history'),
    'tomb', jsonb_build_object('items', jsonb_build_object('a1', current_setting('tst.now')::bigint), 'lists', jsonb_build_object('L1', current_setting('tst.now')::bigint))), 'Gil'),
  '20.2 secondary finishes a checked item');
select tst.ok((public.room_get(current_setting('tst.aliasG'))->'tomb'->'items') ? 'a2'
          and not ((public.room_get(current_setting('tst.aliasG'))->'tomb'->'items') ? 'a1')
          and not ((public.room_get(current_setting('tst.aliasG'))->'tomb'->'lists') ? 'L1'), '20.2 room_get returns server tomb; client-supplied tomb ignored');
select tst.ok((public.room_get(current_setting('tst.aliasG'))->'tomb'->'items'->>'a2')::numeric
              between extract(epoch from now()) * 1000 - 60000 and extract(epoch from now()) * 1000 + 60000, '20.2 tombstone uses server time (epoch ms)');
-- 3: new item with a far-future ts is clamped
select tst.ok(public.room_put(current_setting('tst.aliasG'), jsonb_build_object('lists', jsonb_build_array(jsonb_build_object('id', 'L1', 'name', 'x', 'items',
    (public.room_get(current_setting('tst.aliasG'))->'lists'->0->'items') || '[{"id":"a5","n":"jam","done":false,"ts":99999999999999}]'::jsonb))), 'Gil'),
  '20.3 secondary adds an item');
reset role;
select tst.ok((select (i->>'ts')::numeric <= extract(epoch from now()) * 1000 + 120000 from public.rooms r, jsonb_array_elements(r.data->'lists'->0->'items') i
               where r.code = current_setting('tst.codeE') and i->>'id' = 'a5'), '20.3 room_put clamps a far-future item ts');
-- owner writes without a tomb -> server tombstones kept
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000e');
update public.rooms set data = data - 'tomb' where code = current_setting('tst.codeE');
reset role;
select tst.ok((select data->'tomb'->'items' ? 'a2' from public.rooms where code = current_setting('tst.codeE')), '20.2 owner write without tomb keeps the server tombstones');
-- 1: removing a full member rotates the code; secondaries keep their alias
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000e');
select tst.ok(public.room_member_remove('00000000-0000-0000-0000-00000000000f'), '20.1 owner removes full member F');
select set_config('tst.codeE2', public.ensure_my_room(), false);
select tst.ok(current_setting('tst.codeE2') <> current_setting('tst.codeE') and (select code from public.my_rooms() where role = 'owner') = current_setting('tst.codeE2'),
  '20.1 code rotated after removing a full member; owner finds the new code');
select tst.as_user('00000000-0000-0000-0000-000000000010');
select tst.ok(public.room_get(current_setting('tst.aliasG')) is not null and (select code from public.my_rooms()) = current_setting('tst.aliasG'), '20.1 secondary keeps working with the same alias after rotation');
select tst.as_user('00000000-0000-0000-0000-00000000000f');
select tst.ok(not public.join_room(current_setting('tst.codeE')) and not public.join_room(current_setting('tst.codeE2')), '20.1 removed full member cannot rejoin (old or new code)');
select tst.as_user('00000000-0000-0000-0000-00000000000e');
select tst.ok(public.room_member_remove('00000000-0000-0000-0000-000000000010') and public.ensure_my_room() = current_setting('tst.codeE2'), '20.1 removing a secondary does not rotate the code');
select tst.as_user('00000000-0000-0000-0000-000000000010');
select tst.ok(public.room_get(current_setting('tst.aliasG')) is null and public.room_access(current_setting('tst.aliasG')) is null, '20.1 removed secondary loses alias access');
-- 8: invite accept re-checks the secondary limit
select tst.as_user('00000000-0000-0000-0000-00000000000e');
select set_config('tst.invE2', public.room_invite_create('{}')::text, false);
reset role; select tst.as_user('00000000-0000-0000-0000-000000000001'); update public.profiles set max_secondary = 0 where id = '00000000-0000-0000-0000-00000000000e';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000010');
select tst.ok(public.room_invite_accept(current_setting('tst.invE2')::jsonb->>'token', current_setting('tst.invE2')::jsonb->>'otp', 'Gil')->>'error' = 'limit', '20.8 invite accept re-checks the secondary limit');
reset role; select tst.as_user('00000000-0000-0000-0000-000000000001'); update public.profiles set max_secondary = null where id = '00000000-0000-0000-0000-00000000000e';

-- 5: chain added by a regular user
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.chains(name, kind, category, website, created_by, status, ordering_enabled, inventory_public, publish_prices, about, order_phone, whatsapp)
values ('v20shop', 'store', 'grocery', 'https://v20.co.il', auth.uid(), 'approved', true, true, true, 'spam', '050', '050');
reset role;
select tst.ok((select status = 'pending' and not ordering_enabled and not inventory_public and not publish_prices and not biz_active
                  and about = '' and order_phone = '' and whatsapp = '' and category = 'grocery' and website = 'https://v20.co.il'
               from public.chains where name = 'v20shop'), '20.5 user-added chain: only name/kind/category/website kept, everything else off');

-- 6: inventory prices are approved only for auto_approve businesses
update public.chains set publish_prices = true, show_prices = true, biz_active = true where name in ('רמי לוי', 'יש חסד');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000003');
insert into public.store_inventory(chain, name, price) values ('רמי לוי', 'v20milk', 5);
select tst.as_user('00000000-0000-0000-0000-000000000004');
insert into public.store_inventory(chain, name, price) values ('יש חסד', 'v20milk', 6);
reset role;
select set_config('tst.invid', (select id::text from public.store_inventory where chain = 'רמי לוי' and name = 'v20milk'), false);
select tst.ok((select status = 'pending' and not verified from public.prices where inv_id = current_setting('tst.invid')::uuid), '20.6 inventory price of non-auto business is pending');
select tst.ok((select status = 'approved' and verified from public.prices p join public.store_inventory i on i.id = p.inv_id where i.chain = 'יש חסד' and i.name = 'v20milk'),
  '20.6 inventory price of auto_approve business is approved');

-- 16: regular user's price: no inventory link, deals wait for approval
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.prices(product, product_key, chain, price, is_deal, deal_text) values ('v20deal', 'v20deal', 'רמי לוי', 2, true, '1+1');
insert into public.prices(product, product_key, chain, price, inv_id) values ('v20inv', 'v20inv', 'רמי לוי', 2, current_setting('tst.invid')::uuid);
reset role;
select tst.ok((select status from public.prices where product = 'v20deal') = 'pending', '20.16 deal from a regular user is pending');
select tst.ok((select inv_id is null and status = 'approved' from public.prices where product = 'v20inv'), '20.16 regular user cannot link a price to store inventory');

-- 7: rename chain everywhere, admin only
insert into public.store_orders(chain, user_id, name, phone, items) values ('יש חסד', null, 'x', '0501234567', '[{"name":"a","qty":1}]');
insert into public.store_messages(chain, body) values ('יש חסד', 'hello');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok(public.admin_rename_chain('יש חסד', 'x') = 'forbidden', '20.7 moderator cannot rename chains');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok(public.admin_rename_chain('יש חסד', 'יש חסד 2') = 'ok', '20.7 admin renames chain');
reset role;
select tst.ok((select count(*) from public.store_orders where chain = 'יש חסד 2') = 1 and (select count(*) from public.store_messages where chain = 'יש חסד 2') = 1
          and (select count(*) from public.store_inventory where chain = 'יש חסד 2') = 1 and (select chain from public.store_managers where user_id = '00000000-0000-0000-0000-000000000004') = 'יש חסד 2'
          and (select count(*) from public.price_sources where chain = 'יש חסד 2') = 1 and not exists (select 1 from public.prices where chain = 'יש חסד')
          and not exists (select 1 from public.store_orders where chain = 'יש חסד'), '20.7 rename reaches orders, messages, inventory, managers, sources, prices');

-- 8: confirm_price recounts and removes own flag
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.prices(product, product_key, chain, price) values ('v20p', 'v20p', 'רמי לוי', 3);
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select (public.vote_price((select id from public.prices where product = 'v20p'), -1)->>'wrong')::int;
select tst.ok(public.confirm_price((select id from public.prices where product = 'v20p')) = 1, '20.8 confirm after own flag counts 1');
reset role;
select tst.ok((select confirms = 1 and wrong = 0 from public.prices where product = 'v20p')
          and not exists (select 1 from public.price_flags f join public.prices p on p.id = f.price_id where p.product = 'v20p'), '20.8 confirm_price removes own flag and recounts');

-- 9: push endpoint takeover only with identical keys
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000e');
select tst.ok(public.push_subscribe('https://fcm.googleapis.com/fcm/send/shared', 'K1', 'A1', 'ua') = 'ok', '20.9 (setup) E subscribes');
select tst.as_user('00000000-0000-0000-0000-00000000000f');
select tst.ok(public.push_subscribe('https://fcm.googleapis.com/fcm/send/shared', 'K2', 'A2', 'ua') = 'bad', '20.9 another user cannot take over an endpoint with different keys');
reset role;
select tst.ok((select user_id from public.push_subs where endpoint = 'https://fcm.googleapis.com/fcm/send/shared') = '00000000-0000-0000-0000-00000000000e', '20.9 endpoint still belongs to E');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000f');
select tst.ok(public.push_subscribe('https://fcm.googleapis.com/fcm/send/shared', 'K1', 'A1', 'ua') = 'ok', '20.9 same browser (same keys) can switch account');
reset role;
select tst.ok((select user_id from public.push_subs where endpoint = 'https://fcm.googleapis.com/fcm/send/shared') = '00000000-0000-0000-0000-00000000000f', '20.9 endpoint moved to F');

-- 10: suspended manager
insert into public.user_bans(user_id, kind) values ('00000000-0000-0000-0000-000000000003', 'suspend');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000003');
select tst.ok(not public.manages('רמי לוי'), '20.10 suspended manager: manages() false');
reset role; delete from public.user_bans where user_id = '00000000-0000-0000-0000-000000000003';

-- 11: unconfirmed email cannot become staff / manager
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok(public.staff_add('unconf@x.com', 'moderator') = 'not_found' and public.store_manager_set('unconf@x.com', 'רמי לוי', '', 'manager', false) = 'not_found',
  '20.11 unconfirmed email cannot be made staff / store manager');
reset role;

-- 12: direct signup always needs the auth-guard mark
select tst.err($$insert into auth.users(email, email_confirmed_at) values ('direct@x.com', now())$$, '20.12 direct signup without guard mark blocked');
select tst.err($$insert into auth.users(email, raw_user_meta_data) values ('direct@x.com', '{"guard":"deadbeef"}')$$, '20.12 forged guard mark blocked');
insert into auth.users(email, raw_user_meta_data) values ('ok20@x.com', jsonb_build_object('guard', encode(extensions.hmac('ok20@x.com', (select pepper from public.auth_secret where id = 1), 'sha256'), 'hex')));
select tst.ok((select not (raw_user_meta_data ? 'guard') from auth.users where email = 'ok20@x.com'), '20.12 site signup with valid HMAC accepted (mark stripped)');
insert into auth.users(email, raw_app_meta_data) values ('g20@gmail.com', '{"provider":"google"}');
select tst.ok(true, '20.12 Google signup unaffected');

-- 13: email change follows the signup rules
select tst.err($$update auth.users set email = 'a@mailinator.com' where id = '00000000-0000-0000-0000-00000000000a'$$, '20.13 email change to a disposable domain blocked');
select tst.err($$update auth.users set email_change = 'owner@x.com' where id = '00000000-0000-0000-0000-00000000000a'$$, '20.13 pending email change to the owner email blocked');
select tst.err($$insert into auth.users(email, raw_user_meta_data) values ('owner@x.com', jsonb_build_object('guard', encode(extensions.hmac('owner@x.com', (select pepper from public.auth_secret where id = 1), 'sha256'), 'hex')))$$, '20.12 signup with an owner''s email blocked (even with a valid mark)');
update auth.users set email_change = 'a2@x.com' where id = '00000000-0000-0000-0000-00000000000a';
update auth.users set email_change = '' where id = '00000000-0000-0000-0000-00000000000a';
select tst.ok(true, '20.13 normal email change allowed');

-- 14: password change only with a one-time allowance from auth-guard
select tst.err($$update auth.users set encrypted_password = 'h1' where id = '00000000-0000-0000-0000-00000000000d'$$, '20.14 password change without allowance blocked');
insert into public.auth_pw_allow(user_id, until) values ('00000000-0000-0000-0000-00000000000d', now() + interval '2 minutes');
update auth.users set encrypted_password = 'h1' where id = '00000000-0000-0000-0000-00000000000d';
select tst.ok(not exists (select 1 from public.auth_pw_allow where user_id = '00000000-0000-0000-0000-00000000000d'), '20.14 allowed once; allowance consumed');
select tst.err($$update auth.users set encrypted_password = 'h2' where id = '00000000-0000-0000-0000-00000000000d'$$, '20.14 second change blocked');
insert into public.auth_pw_allow(user_id, until) values ('00000000-0000-0000-0000-00000000000d', now() - interval '1 minute');
select tst.err($$update auth.users set encrypted_password = 'h3' where id = '00000000-0000-0000-0000-00000000000d'$$, '20.14 expired allowance rejected');
update auth.users set last_sign_in_at = now(), email_confirmed_at = email_confirmed_at where id = '00000000-0000-0000-0000-00000000000d';
select tst.ok(true, '20.14 other auth.users updates unaffected');
update public.site_config set value = value || '{"pw_guard":false}' where key = 'security';
update auth.users set encrypted_password = 'h4' where id = '00000000-0000-0000-0000-00000000000d';
select tst.ok(true, '20.14 kill switch pw_guard=false allows it');
update public.site_config set value = value - 'pw_guard' where key = 'security';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000d');
select tst.err($$insert into public.auth_pw_allow(user_id, until) values (auth.uid(), now() + interval '1 hour')$$, '20.14 users cannot grant themselves a password change');
select tst.err($$select * from public.auth_pw_allow$$, '20.14 users cannot read auth_pw_allow');
reset role;

-- 15: anon does not see who wrote reviews / recommendations
select tst.as_user('');
insert into public.site_reviews(user_id, stars, body, status) values ('00000000-0000-0000-0000-00000000000a', 5, 'great', 'approved');
set role anon;
select tst.err($$select user_id from public.site_reviews$$, '20.15 anon cannot read site_reviews.user_id');
select tst.ok((select count(*) from (select id, stars, body, reply, created_at, updated_at from public.site_reviews where status = 'approved') x) = 1,
  '20.15 anon still reads approved reviews (columns the site uses)');
select tst.err($$select user_id from public.store_recs$$, '20.15 anon cannot read store_recs.user_id');
reset role;

-- 17: currency / product emoji
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.err($$insert into public.prices(product, product_key, chain, price, currency) values ('c', 'c', 'רמי לוי', 1, 'us<')$$, '20.17 bad currency rejected');
reset role;
select tst.err($$insert into public.products(name, emoji) values ('p20', '<img>')$$, '20.17 product emoji with HTML characters rejected');
-- ======== v21: admin alerts (admin_alerts_check, cron 'yam-alerts') ========
reset role; select tst.as_user('');
select tst.ok(exists (select 1 from cron.job where jobname = 'yam-alerts' and schedule = '*/15 * * * *' and command like '%admin_alerts_check%'), '21 cron job yam-alerts every 15 minutes');
set role anon;
select tst.err($$select public.admin_alerts_check()$$, '21 anon cannot run admin_alerts_check');
reset role; set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.err($$select public.admin_alerts_check()$$, '21 even a signed-in admin cannot run it directly (cron only)');
select tst.err($$select * from public.admin_alerts_sent$$, '21 users cannot read admin_alerts_sent');
select tst.err($$insert into public.admin_alerts_sent(kind) values ('login_fail')$$, '21 users cannot write admin_alerts_sent (to mute alerts)');
reset role; select tst.as_user('');
delete from public.auth_events; delete from public.client_errors; delete from public.admin_alerts_sent; delete from public.push_queue where tag like 'alert:%';
insert into public.push_subs(endpoint, user_id, p256dh, auth_key) values
  ('https://fcm.googleapis.com/fcm/send/owner21', '00000000-0000-0000-0000-000000000001', 'k', 'a'),
  ('https://fcm.googleapis.com/fcm/send/alice21', '00000000-0000-0000-0000-00000000000a', 'k', 'a') on conflict do nothing;
-- old events (2 hours ago) do not count
insert into public.auth_events(kind, email, ip, created_at) select 'login_fail', 'old@x.com', '9.9.9.' || g, now() - interval '2 hours' from generate_series(1, 100) g;
insert into public.client_errors(msg, created_at) select 'old', now() - interval '2 hours' from generate_series(1, 100);
select tst.ok(public.admin_alerts_check() = 0, '21 events older than an hour are ignored');
insert into public.auth_events(kind, email, ip) select 'login_fail', 'u' || g || '@x.com', '1.1.1.' || (g % 3) from generate_series(1, 29) g;
select tst.ok(public.admin_alerts_check() = 0, '21 29 failed logins (< 30 default) -> no alert');
insert into public.auth_events(kind, email, ip, detail) values ('login_locked', 'u1@x.com', '1.1.1.1', 'email');
select tst.ok(public.admin_alerts_check() = 1, '21 30 failed logins+lockouts -> 1 alert');
select tst.ok((select count(*) from public.push_queue where tag = 'alert:login_fail' and user_id = '00000000-0000-0000-0000-000000000001'
               and kind = 'staff' and title like '%30 ניסיונות כניסה כושלים%' and body like '%1 חסימות%' and url = '/#admin-security') = 1, '21 admin got the Hebrew login alert with back-office link');
select tst.ok(not exists (select 1 from public.push_queue where tag like 'alert:%' and user_id = '00000000-0000-0000-0000-00000000000a'), '21 regular users get no admin alerts');
insert into public.auth_events(kind, email, ip) select 'login_fail', 'z@x.com', '2.2.2.2' from generate_series(1, 20);
select tst.ok(public.admin_alerts_check() = 0, '21 dedupe: same kind not re-sent within 6 hours (count)');
select tst.ok((select count(*) from public.push_queue where tag = 'alert:login_fail') = 1, '21 dedupe: same kind not re-sent within 6 hours');
update public.admin_alerts_sent set sent_at = now() - interval '7 hours' where kind = 'login_fail';
select tst.ok(public.admin_alerts_check() = 1, '21 alert re-sent after 6 hours (count)');
select tst.ok((select count(*) from public.push_queue where tag = 'alert:login_fail') = 2, '21 alert re-sent after 6 hours');
-- blocked signups
insert into public.auth_events(kind, email, ip, detail) select 'signup_blocked', 'bot' || g || '@x.com', '3.3.3.3', 'honeypot' from generate_series(1, 20) g;
select tst.ok(public.admin_alerts_check() = 1, '21 20 blocked signups -> alert (count)');
select tst.ok(exists (select 1 from public.push_queue where tag = 'alert:signup_blocked' and title like '%20 הרשמות נחסמו%'), '21 20 blocked signups -> alert');
-- client errors (other kinds are already deduped, so exactly one new alert)
insert into public.client_errors(msg) select 'boom' from generate_series(1, 49);
select tst.ok(public.admin_alerts_check() = 0, '21 49 client errors -> no alert');
insert into public.client_errors(msg) values ('boom');
select tst.ok(public.admin_alerts_check() = 1, '21 50 client errors -> alert linking to the error log (count)');
select tst.ok(exists (select 1 from public.push_queue where tag = 'alert:errors' and title like '%50 תקלות%' and url = '/#admin-errors'), '21 50 client errors -> alert linking to the error log');
-- credential stuffing: many IPs on one email
insert into public.auth_events(kind, email, ip) select 'login_fail', 'victim@x.com', '5.5.5.' || g from generate_series(1, 10) g;
select tst.ok(public.admin_alerts_check() = 1, '21 10 IPs on one email -> stuffing alert (count)');
select tst.ok(exists (select 1 from public.push_queue where tag = 'alert:stuffing' and body like '%victim@x.com%'), '21 10 IPs on one email -> stuffing alert');
-- password spraying: one IP on many emails
insert into public.auth_events(kind, email, ip) select 'login_fail', 'spray' || g || '@x.com', '6.6.6.6' from generate_series(1, 15) g;
select tst.ok(public.admin_alerts_check() = 1, '21 one IP on 15 emails -> spray alert (count)');
select tst.ok(exists (select 1 from public.push_queue where tag = 'alert:spray' and body like '%6.6.6.6%'), '21 one IP on 15 emails -> spray alert');
-- the same error on 3 different devices within 24 hours -> its own alert, with app version and phone model
insert into public.client_errors(msg, src, dev, app_ver, device) values
  ('TypeError: x is null', 'a.js:1', '11111111-1111-4111-8111-111111111111', '2.1', 'SM-S901B · Android 14'),
  ('TypeError: x is null', 'a.js:1', '11111111-1111-4111-8111-111111111111', '2.1', 'SM-S901B · Android 14');
select tst.ok(public.admin_alerts_check() = 0, '21 same error twice on one device -> no spread alert');
insert into public.client_errors(msg, src, dev, app_ver, device, created_at) values
  ('TypeError: x is null', 'a.js:1', '22222222-2222-4222-8222-222222222222', '2.1', 'SM-A525F · Android 13', now() - interval '20 hours'),
  ('TypeError: x is null', 'a.js:1', '', '2.0', '', now() - interval '30 hours');
select tst.ok(public.admin_alerts_check() = 0, '21 two devices in 24h (third is older) -> no spread alert');
insert into public.client_errors(user_id, msg, src, app_ver, device) values ('00000000-0000-0000-0000-00000000000a', 'TypeError: x is null', 'a.js:1', '2.1', 'SM-S901B · Android 14');
select tst.ok(public.admin_alerts_check() = 1, '21 same error on 3 devices -> spread alert (count)');
select tst.ok(exists (select 1 from public.push_queue where tag like 'alert:err:%' and title like '%3 מכשירים%' and body like '%אפליקציה 2.1%'
                      and body like '%SM-S901B%' and url = '/#admin-errors' and user_id = '00000000-0000-0000-0000-000000000001'), '21 spread alert names the app version and phone model');
insert into public.client_errors(msg, src, dev) values ('TypeError: x is null', 'a.js:1', '44444444-4444-4444-8444-444444444444');
select tst.ok(public.admin_alerts_check() = 0, '21 spread alert for the same error not repeated within 3 days');
select tst.ok(public.admin_alerts_check() = 0, '21 nothing new -> nothing sent');
-- thresholds from site_config 'security'
delete from public.admin_alerts_sent;
update public.site_config set value = value || '{"alerts_off":true}' where key = 'security';
select tst.ok(public.admin_alerts_check() = 0, '21 alerts_off=true silences everything');
update public.site_config set value = value - 'alerts_off' || '{"alert_login_fail":0,"alert_signup_blocked":0,"alert_stuffing_ips":0,"alert_spray_emails":0,"alert_errors":1000,"alert_error_devices":0}' where key = 'security';
select tst.ok(public.admin_alerts_check() = 0, '21 threshold 0 disables a check; higher threshold respected');
update public.site_config set value = value || '{"alert_errors":"oops"}' where key = 'security';
select tst.ok(public.admin_alerts_check() = 1, '21 invalid threshold falls back to the default');
update public.site_config set value = value - 'alert_login_fail' - 'alert_signup_blocked' - 'alert_stuffing_ips' - 'alert_spray_emails' - 'alert_errors' - 'alert_error_devices' where key = 'security';
delete from public.push_subs where endpoint in ('https://fcm.googleapis.com/fcm/send/owner21', 'https://fcm.googleapis.com/fcm/send/alice21');

-- ======== v23: credits (who reported) ========
reset role;
select tst.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
insert into public.prices(product, product_key, chain, price, by_id, show_author) values ('קרדיט1','קרדיט1','רמי לוי',3.5,auth.uid(),true);
insert into public.prices(product, product_key, chain, price, by_id) values ('קרדיט2','קרדיט2','רמי לוי',4.5,auth.uid());
insert into public.site_reviews(stars, body, user_id) values (5, 'מעולה', auth.uid()) on conflict do nothing;
reset role; select tst.as_user('');
insert into public.recipes(name, steps, author_id, author_name) values ('מתכון קרדיט','שלבים','00000000-0000-0000-0000-00000000000a','Alice');
create temp table cr23 as select
  (select id from public.prices where product = 'קרדיט1') p1, (select id from public.prices where product = 'קרדיט2') p2,
  (select id from public.recipes where name = 'מתכון קרדיט') r1, (select id from public.site_reviews where user_id = '00000000-0000-0000-0000-00000000000a') v1;
grant select on cr23 to anon, authenticated;
select tst.ok((select show_author from public.prices where id = (select p1 from cr23)) is null, '23 user cannot set show_author on insert');
select tst.ok((select by_name from public.prices where id = (select p1 from cr23)) = 'Alice', '23 name still stored');
update public.recipes set status = 'approved' where id = (select r1 from cr23);
update public.site_reviews set status = 'approved' where id = (select v1 from cr23);
-- direct reads of the name columns are blocked (anon + authenticated), other columns still work
select tst.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select tst.err($$select by_name from public.prices limit 1$$, '23 authenticated cannot read prices.by_name');
select tst.err($$select * from public.prices limit 1$$, '23 authenticated select * on prices blocked (client uses explicit columns)');
select tst.err($$select author_name from public.recipes limit 1$$, '23 authenticated cannot read recipes.author_name');
select tst.err($$select author_name from public.divrei_torah limit 1$$, '23 authenticated cannot read divrei_torah.author_name');
select tst.err($$select author_name from public.site_reviews limit 1$$, '23 authenticated cannot read site_reviews.author_name');
select tst.err($$select by_name from public.store_recs limit 1$$, '23 authenticated cannot read store_recs.by_name');
select tst.err($$select author_name from public.store_posts limit 1$$, '23 authenticated cannot read store_posts.author_name');
select tst.err($$select author_name from public.bot_knowledge limit 1$$, '23 authenticated cannot read bot_knowledge.author_name');
select tst.ok((select count(*) from public.prices where id in ((select p1 from cr23),(select p2 from cr23)) and by_id is not null and show_author is null and price > 0) = 2, '23 authenticated reads the other price columns');
select tst.ok((select count(*) from public.recipes where id = (select r1 from cr23) and author_id is not null) = 1, '23 authenticated reads recipe columns');
-- default: hidden from other users
select tst.ok(not ((public.credit_names('prices', array[(select p1 from cr23)]) -> (select p1 from cr23)::text) ? 'n'), '23 default: other user does not get the reporter name');
select tst.ok((public.credit_names('prices', array[(select p1 from cr23)]) -> (select p1 from cr23)::text ->> 'v') = 'false', '23 default: visible=false');
select tst.ok(not ((public.credit_names('recipes', array[(select r1 from cr23)]) -> (select r1 from cr23)::text) ? 'n'), '23 default: recipe author hidden');
select tst.ok(public.credit_names('kb', array[(select r1 from cr23)]) = '{}'::jsonb, '23 back-office-only kinds return nothing to users');
select tst.ok(not ((public.credit_names('prices', array[(select p1 from cr23)]) -> (select p1 from cr23)::text) ? 'e'), '23 no email for users');
select tst.ok((select name from public.reporter_scores() where user_id = '00000000-0000-0000-0000-00000000000a') = '', '23 reporter_scores hides other reporters names');
select tst.ok((select count(*) from public.reporter_scores() where user_id = '00000000-0000-0000-0000-00000000000a' and score > 0) = 1, '23 reporter_scores still gives the score (badge)');
-- a user cannot change show_author, not even on his own report
select tst.as_user('00000000-0000-0000-0000-00000000000a');
update public.prices set show_author = true where id = (select p2 from cr23);
select tst.ok((select show_author from public.prices where id = (select p2 from cr23)) is null, '23 user cannot set show_author on his own price');
update public.site_reviews set show_author = true where id = (select v1 from cr23);
reset role;
select tst.ok((select show_author from public.site_reviews where id = (select v1 from cr23)) is null, '23 user cannot set show_author on his own review');
select tst.as_user(''); update public.site_reviews set status = 'approved', updated_at = null where id = (select v1 from cr23);
-- moderator: sees names, cannot change visibility
select tst.as_user('00000000-0000-0000-0000-000000000002');
set role authenticated;
select tst.ok((public.credit_names('prices', array[(select p1 from cr23)]) -> (select p1 from cr23)::text ->> 'n') = 'Alice', '23 moderator sees the reporter name');
select tst.ok(not ((public.credit_names('prices', array[(select p1 from cr23)]) -> (select p1 from cr23)::text) ? 'e'), '23 moderator does not get emails');
update public.prices set show_author = true where id = (select p1 from cr23);
reset role;
select tst.ok((select show_author from public.prices where id = (select p1 from cr23)) is null, '23 moderator cannot change show_author');
-- admin: sees name + email, sets per-item visibility (without marking the item as edited)
select tst.as_user('00000000-0000-0000-0000-000000000001');
set role authenticated;
select tst.ok((public.credit_names('prices', array[(select p1 from cr23)]) -> (select p1 from cr23)::text ->> 'n') = 'Alice', '23 admin sees the reporter name');
select tst.ok((public.credit_names('prices', array[(select p1 from cr23)]) -> (select p1 from cr23)::text ->> 'e') = 'a@x.com', '23 admin sees the reporter email');
select tst.ok((public.credit_names('reviews', array[(select v1 from cr23)]) -> (select v1 from cr23)::text ->> 'u') = '00000000-0000-0000-0000-00000000000a', '23 admin gets the user id');
update public.prices set show_author = true where id = (select p1 from cr23);
update public.site_reviews set show_author = true where id = (select v1 from cr23);
reset role;
select tst.ok((select show_author from public.prices where id = (select p1 from cr23)), '23 admin sets show_author=true');
select tst.ok((select updated_at from public.prices where id = (select p1 from cr23)) is null, '23 changing only the credit does not mark the price as edited');
select tst.ok((select updated_at from public.site_reviews where id = (select v1 from cr23)) is null, '23 changing only the credit does not mark the review as edited');
-- per-item "show" → visible to others
select tst.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select tst.ok((public.credit_names('prices', array[(select p1 from cr23)]) -> (select p1 from cr23)::text ->> 'n') = 'Alice', '23 per-item show: other user sees the name');
select tst.ok(not ((public.credit_names('prices', array[(select p2 from cr23)]) -> (select p2 from cr23)::text) ? 'n'), '23 per-item show affects only that item');
reset role;
-- global switch on → all shown, except items set to hide
update public.site_config set value = value || '{"prices":true,"recipes":true}' where key = 'credits';
select tst.as_user(''); update public.prices set show_author = false where id = (select p1 from cr23);
select tst.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select tst.ok((public.credit_names('prices', array[(select p2 from cr23)]) -> (select p2 from cr23)::text ->> 'n') = 'Alice', '23 global switch on: name shown');
select tst.ok(not ((public.credit_names('prices', array[(select p1 from cr23)]) -> (select p1 from cr23)::text) ? 'n'), '23 global on + per-item hide: hidden');
select tst.ok((select name from public.reporter_scores() where user_id = '00000000-0000-0000-0000-00000000000a') = 'Alice', '23 reporter_scores names when price credits are on');
reset role; set role anon; select tst.as_user('');
select tst.ok((public.credit_names('recipes', array[(select r1 from cr23)]) -> (select r1 from cr23)::text ->> 'n') = 'Alice', '23 anon sees recipe author when shown');
select tst.ok(public.credit_names('prices', array[(select p2 from cr23)]) = '{}'::jsonb, '23 anon gets nothing for prices');
select tst.err($$select author_name from public.recipes limit 1$$, '23 anon cannot read recipes.author_name');
select tst.err($$select user_id from public.site_reviews limit 1$$, '23 anon still cannot read site_reviews.user_id');
select tst.ok((select count(*) from public.recipes where id = (select r1 from cr23)) = 1, '23 anon reads the other recipe columns');
reset role;
-- pending items of others: nothing
update public.recipes set status = 'pending' where id = (select r1 from cr23);
select tst.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select tst.ok(public.credit_names('recipes', array[(select r1 from cr23)]) = '{}'::jsonb, '23 pending item of another user: nothing');
reset role;
update public.site_config set value = value || '{"prices":false,"recipes":false}' where key = 'credits';
-- divrei torah list + clothing shops
select tst.as_user('');
insert into public.divrei_torah(parasha, title, body, author_id, author_name, status) values ('בראשית','דת קרדיט','גוף','00000000-0000-0000-0000-00000000000a','Alice','approved');
insert into public.clothing_shops(name, status, created_by) values ('חנות קרדיט','approved','00000000-0000-0000-0000-00000000000a');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
select tst.ok((select x->>'author_name' from jsonb_array_elements(public.torah_list(100)) x where x->>'title' = 'דת קרדיט') = '', '23 torah_list hides the author by default');
select tst.ok(not ((public.credit_names('shops', array[(select id from public.clothing_shops where name = 'חנות קרדיט')]) -> (select id from public.clothing_shops where name = 'חנות קרדיט')::text) ? 'n'), '23 clothing shop suggester hidden by default');
reset role;
select tst.as_user('00000000-0000-0000-0000-000000000001');
set role authenticated;
update public.divrei_torah set show_author = true where title = 'דת קרדיט';
update public.clothing_shops set show_author = true where name = 'חנות קרדיט';
select tst.ok((public.credit_names('shops', array[(select id from public.clothing_shops where name = 'חנות קרדיט')]) -> (select id from public.clothing_shops where name = 'חנות קרדיט')::text ->> 'n') = 'Alice', '23 admin sees who suggested a clothing shop (from the profile)');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok((select x->>'author_name' from jsonb_array_elements(public.torah_list(100)) x where x->>'title' = 'דת קרדיט') = 'Alice', '23 torah_list shows the author when the admin chose to');
select tst.ok((public.credit_names('shops', array[(select id from public.clothing_shops where name = 'חנות קרדיט')]) -> (select id from public.clothing_shops where name = 'חנות קרדיט')::text ->> 'n') = 'Alice', '23 clothing shop suggester shown after admin override');
reset role;
-- ======== 📍 admin_user_cities: admins only; city from the user's own room, else a room they follow ========
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000f');
select set_config('tst.codeF', public.ensure_my_room(), false);
reset role;
update public.rooms set data = jsonb_set(data, '{me}', '{"city":"בני ברק"}') where code = current_setting('tst.codeF');
select set_config('tst.nusers', (select count(*) from auth.users)::text, false);
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.err($$select * from public.admin_user_cities()$$, '📍 regular user cannot list user cities');
select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.err($$select * from public.admin_user_cities()$$, '📍 moderator cannot list user cities');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select city from public.admin_user_cities() where user_id = '00000000-0000-0000-0000-00000000000f') = 'בני ברק', '📍 admin sees the owner''s city');
select tst.ok((select count(*) from public.admin_user_cities()) = current_setting('tst.nusers')::bigint, '📍 one row per user');
reset role;
-- ======== 🟢 site_stats: by default only admins get the numbers; users only when the admin chose to show them ========
delete from public.site_config where key = 'ui';
select set_config('request.jwt.claim.sub', '', false);
set role anon;
select tst.ok(public.site_stats() = '{}'::jsonb, '🟢 default: anon gets no numbers');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(public.site_stats() = '{}'::jsonb, '🟢 default: regular user gets no numbers');
reset role;
insert into public.site_config(key, value) values ('ui', '{"statsHidden":false}');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(public.site_stats() = '{}'::jsonb, '🟢 the old "statsHidden": false does not reveal the numbers');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((public.site_stats()->>'users')::int > 0, '🟢 admin always sees the numbers');
reset role;
update public.site_config set value = '{"statsShown":true}' where key = 'ui';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok((public.site_stats()->>'users')::int > 0, '🟢 shown by the admin: users see the numbers');
reset role;
-- ======== 💬 yami_notes: everyone sees broadcasts, only the target sees a personal note, only admins write ========
reset role;
insert into public.yami_notes(user_id, body) values (null, 'לכולם'), ('00000000-0000-0000-0000-00000000000a', 'רק ל-a');
insert into public.yami_notes(user_id, body, expires_at) values (null, 'ישנה', now() - interval '1 day');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok((select count(*) from public.yami_notes) = 2, '💬 user sees the broadcast and their own note (not expired ones)');
select tst.err($$insert into public.yami_notes(body) values ('x')$$, '💬 regular user cannot post a Yami note');
select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok((select count(*) from public.yami_notes) = 1, '💬 another user does not see a personal note');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select count(*) from public.yami_notes where body = 'רק ל-a') = 1, '💬 admin sees personal notes');
insert into public.yami_notes(body) values ('מהמנהל');
select tst.ok((select count(*) from public.yami_notes where body = 'מהמנהל') = 1, '💬 admin can post a Yami note');
reset role;
set role anon;
select tst.err($$select * from public.yami_notes$$, '💬 anon cannot read Yami notes');
reset role;
-- ======== 🛡️ Supabase Security Advisor: no trigger function callable from the site, every public function has a fixed search_path ========
reset role;
select tst.ok(not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
    and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))),
  '🛡️ trigger functions cannot be called directly by anon / users');
select tst.ok(not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f'
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
  '🛡️ every public function has a fixed search_path');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.prices(product, product_key, chain, price, confirms) values ('בדיקת טריגר', 'בדיקת טריגר', 'רמי לוי', 9.9, 99);
reset role;
select tst.ok((select confirms from public.prices where product = 'בדיקת טריגר') = 0, '🛡️ triggers still run for a regular user after the revoke');
-- ======== 🏆 reporters_month + 💌 referrals ========
reset role;
update public.prices set created_at = now() where product = 'חלב' and chain = 'רמי לוי';
set role anon;
select tst.err($$select * from public.reporters_month()$$, '🏆 anon cannot read the monthly reporters');
select tst.err($$select public.my_ref_code()$$, '💌 anon has no invite code');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok((select count(*) from public.reporters_month()) >= 1, '🏆 users see the monthly reporters');
select tst.ok(not exists (select 1 from public.reporters_month() where not is_me and name <> '' and not public.credit_default('prices')), '🏆 other reporters'' names hidden when price credits are hidden');
select tst.ok(public.my_ref_code() ~ '^[0-9a-f]{8}$' and public.my_ref_code() = public.my_ref_code(), '💌 one stable invite code per user');
select tst.err($$select * from public.ref_codes$$, '💌 users cannot list invite codes');
select tst.err($$insert into public.referrals(referred, referrer) values ('00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000a')$$, '💌 users cannot write referrals directly');
select set_config('tst.code_a', public.my_ref_code(), false);
select tst.ok(public.referral_claim(current_setting('tst.code_a')) = false, '💌 cannot invite yourself');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok(public.referral_claim(current_setting('tst.code_a')) = true, '💌 a new account joins through a link');
select tst.ok(public.referral_claim(current_setting('tst.code_a')) = false, '💌 only once');
select tst.ok(public.referral_claim('zzzzzzzz') = false and public.referral_claim(null) = false, '💌 bad codes ignored');
select tst.ok((select count(*) from public.referrals) = 0, '💌 regular user cannot read referrals');
reset role;
update auth.users set created_at = now() - interval '10 days' where id = '00000000-0000-0000-0000-00000000000c';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000c');
select tst.ok(public.referral_claim(current_setting('tst.code_a')) = false, '💌 an old account cannot be counted as invited');
select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(public.my_referrals() = 1, '💌 inviter sees how many joined');
select tst.ok((select count(*) from public.admin_referrals()) = 0, '💌 regular user does not see who invited whom');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select count(*) from public.admin_referrals() where referrer_name = 'Alice' and referred_name = 'Bob') = 1, '💌 admin sees who joined through whom');
reset role;
-- ======== 👀 guest visits: anonymous device ids, admins see counts and who converted ========
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;
select public.guest_ping('11111111-1111-1111-1111-111111111111');
select public.guest_ping('11111111-1111-1111-1111-111111111111');
select public.guest_ping('22222222-2222-2222-2222-222222222222');
select tst.err($$select * from public.guest_visits$$, '👀 anon cannot read guest visits');
select tst.err($$select public.guest_converted('11111111-1111-1111-1111-111111111111')$$, '👀 anon cannot mark a conversion');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000d');
select tst.ok(public.admin_guest_stats() is null, '👀 regular user gets no guest stats');
select tst.ok(public.guest_converted('11111111-1111-1111-1111-111111111111') = true, '👀 a guest who signs up is linked once');
select tst.as_user('00000000-0000-0000-0000-00000000000e');
select tst.ok(public.guest_converted('11111111-1111-1111-1111-111111111111') = false, '👀 another user cannot take over that trial');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((public.admin_guest_stats()->>'total')::int = 2 and (public.admin_guest_stats()->>'converted')::int = 1
  and public.admin_guest_stats()->'list'->0->>'name' = 'Dan', '👀 admin sees totals and who converted');
-- 📢 מי רואה פרסומות: כולם / רק מנהלים / אף אחד — נאכף בשרת
reset role; insert into public.ads(id, title) values ('33333333-3333-3333-3333-333333333333','aud test');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(exists (select 1 from public.ads where id = '33333333-3333-3333-3333-333333333333'), '📢 default: users see live ads');
select tst.err($$insert into public.site_config(key, value) values ('ads', '{"audience":"none"}')$$, '📢 a user cannot change who sees ads');
reset role; insert into public.site_config(key, value) values ('ads', '{"audience":"admins"}') on conflict (key) do update set value = excluded.value;
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(not exists (select 1 from public.ads where id = '33333333-3333-3333-3333-333333333333'), '📢 admins-only: a user sees no ads');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok(exists (select 1 from public.ads where id = '33333333-3333-3333-3333-333333333333'), '📢 admins-only: the admin still sees them');
reset role; update public.site_config set value = '{"audience":"none"}' where key = 'ads';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(not exists (select 1 from public.ads where id = '33333333-3333-3333-3333-333333333333'), '📢 none: a user sees no ads');
-- 👁️ לכל פרסומת בנפרד: "רק מנהלים" לא משנה את שאר הפרסומות, ו"אף אחד" הכללי מכבה הכל
reset role; insert into public.ads(id, title, audience) values ('33333333-3333-3333-3333-333333333334','admins only', 'admins'), ('33333333-3333-3333-3333-333333333335','for all', 'all');
update public.site_config set value = '{"audience":"all"}' where key = 'ads';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(not exists (select 1 from public.ads where id = '33333333-3333-3333-3333-333333333334')
  and exists (select 1 from public.ads where id = '33333333-3333-3333-3333-333333333333'), '👁️ one ad for admins only: users still see the other ads');
reset role; update public.site_config set value = '{"audience":"admins"}' where key = 'ads';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(exists (select 1 from public.ads where id = '33333333-3333-3333-3333-333333333335')
  and not exists (select 1 from public.ads where id = '33333333-3333-3333-3333-333333333333'), '👁️ an ad set to everyone shows even when the default is admins-only');
reset role; update public.site_config set value = '{"audience":"none"}' where key = 'ads';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(not exists (select 1 from public.ads where id = '33333333-3333-3333-3333-333333333335'), '👁️ "none" turns off even an ad set to everyone');
reset role;
select tst.err($$update public.ads set audience = 'vip' where id = '33333333-3333-3333-3333-333333333335'$$, '👁️ unknown audience rejected');
select tst.err($$update public.ads set page = 'admin' where id = '33333333-3333-3333-3333-333333333335'$$, '📄 unknown page rejected');
select tst.err($$update public.ads set freq = 'always' where id = '33333333-3333-3333-3333-333333333335'$$, '⏱️ unknown frequency rejected');
update public.ads set page = 'hist', freq = 'session' where id = '33333333-3333-3333-3333-333333333335';
select tst.ok((select page = 'hist' and freq = 'session' from public.ads where id = '33333333-3333-3333-3333-333333333335'), '📄 page and frequency per ad are saved');
delete from public.ads where id in ('33333333-3333-3333-3333-333333333334','33333333-3333-3333-3333-333333333335');
reset role; set role anon; select tst.as_user('');
select tst.ok(not exists (select 1 from public.ads), '📢 anon never sees ads');
reset role; delete from public.site_config where key = 'ads'; delete from public.ads where id = '33333333-3333-3333-3333-333333333333';
-- 📣 מאיפה הגיעו: אנונימי סופר, לא קורא; רק מנהל רואה את הסיכום
reset role; set role anon; select tst.as_user('');
select public.visit_src('whatsapp'); select public.visit_src('WhatsApp'); select public.visit_src('qr-shul'); select public.visit_src('<script>'); select public.visit_src(repeat('a', 80));
select tst.err($$select * from public.visit_sources$$, '📣 anon cannot read visit sources');
select tst.err($$select public.visit_src_signup('whatsapp')$$, '📣 anon cannot record a signup source');
do $$ begin for g in 1..250 loop perform public.visit_src('flood' || g); end loop; end $$;
reset role;
select tst.ok((select n from public.visit_sources where src = 'whatsapp') = 2 and not exists (select 1 from public.visit_sources where src !~ '^[a-z0-9._-]{1,40}$'), '📣 sources counted, junk ignored');
select tst.ok((select count(*) from public.visit_sources where day = current_date) = 200, '📣 flood of new sources capped at 200/day');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000d');
select tst.ok(public.visit_src_signup('whatsapp') = true and public.visit_src_signup('qr-shul') = false, '📣 signup source recorded once per user');
select tst.ok(public.admin_visit_sources() is null, '📣 regular user gets no source stats');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select (e->>'visits')::int = 2 and (e->>'signups')::int = 1 from jsonb_array_elements(public.admin_visit_sources()) e where e->>'src' = 'whatsapp'), '📣 admin sees visits and signups per source');
reset role;
-- 📤 קישורי שיתוף אישיים: אורח ומשתמש יוצרים קישור; כניסות אנונימיות; רק מנהל רואה מי שיתף ומי הצטרף
reset role; set role anon; select tst.as_user('');
select tst.ok(public.share_link_create('guest00001', 'wa', 'status', '44444444-4444-4444-4444-444444444444') = true, '📤 a guest can create a share link');
select tst.ok(public.share_link_create('guest00002', 'wa', 'group') = false, '📤 a guest without a device id cannot');
select tst.ok(public.share_link_create('BAD!', 'wa', '', '44444444-4444-4444-4444-444444444444') = false and public.share_link_create('guest00003', '<x>', '', '44444444-4444-4444-4444-444444444444') = false, '📤 junk tokens and channels ignored');
select tst.err($$select * from public.share_links$$, '📤 anon cannot read share links');
select tst.err($$select public.share_join('guest00001')$$, '📤 anon cannot record a join');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(public.share_link_create('alice00001', 'wa', 'group: משפחה') = true, '📤 a user creates a personal link');
select tst.ok(public.share_link_create('alice00001', 'sms') = false, '📤 cannot take over an existing link');
select tst.err($$insert into public.share_links(token, channel) values ('evil000001', 'wa')$$, '📤 users cannot write share links directly');
select tst.err($$select * from public.share_visits$$, '📤 users cannot read visits');
select tst.ok(public.share_join('alice00001') = false, '📤 opening your own link is not a join');
reset role; set role anon; select tst.as_user('');
select public.share_visit('alice00001', '55555555-5555-5555-5555-555555555555'); select public.share_visit('alice00001', '55555555-5555-5555-5555-555555555555');
select public.share_visit('alice00001', '66666666-6666-6666-6666-666666666666');
select tst.ok(public.share_visit('nosuch0001', '66666666-6666-6666-6666-666666666666') = false, '📤 visits to unknown links ignored');
reset role;
select tst.ok((select count(*) from public.share_visits where token = 'alice00001') = 2, '📤 each device counted once per link');
delete from public.referrals where referred = '00000000-0000-0000-0000-00000000000e';
update auth.users set created_at = now() where id = '00000000-0000-0000-0000-00000000000e';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000e');
select tst.ok(public.share_join('alice00001') = true and public.share_join('alice00001') = false, '📤 a new user joining through the link is recorded once');
select tst.as_user('00000000-0000-0000-0000-00000000000c');
select tst.ok(public.share_join('alice00001') = true, '📤 an existing user who opened the link is recorded too');
select tst.ok(public.admin_share_links() is null, '📤 regular user gets no share stats');
reset role;
select tst.ok(exists (select 1 from public.referrals where referred = '00000000-0000-0000-0000-00000000000e' and referrer = '00000000-0000-0000-0000-00000000000a')
  and not exists (select 1 from public.referrals where referred = '00000000-0000-0000-0000-00000000000c'), '📤 only a new account counts as an invited friend');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select (e->>'visits')::int = 2 and jsonb_array_length(e->'joins') = 2 and e->>'name' = 'Alice' and e->>'place' = 'group: משפחה'
  from jsonb_array_elements(public.admin_share_links()) e where e->>'token' = 'alice00001'), '📤 admin sees who shared, where, visits and who joined');
select tst.ok((select e->>'sharer' is null and e->>'channel' = 'wa' and e->>'place' = 'status' from jsonb_array_elements(public.admin_share_links()) e where e->>'token' = 'guest00001'), '📤 admin sees guest shares too');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok((select count(*) from jsonb_array_elements(public.my_share_people()) e where e->>'name' in ('Eve', 'Carol')) = 2
  and (select count(*) from jsonb_array_elements(public.my_share_people()) e where e->>'name' = 'Bob') = 1, '📤 the sharer sees who joined through their links (and old ?ref invites)');
select tst.ok(public.my_share_people()::text !~ '@', '📤 the sharer never sees emails');
select tst.ok((select e->>'new' = 'true' and e->>'place' = 'group: משפחה' from jsonb_array_elements(public.my_share_people()) e where e->>'name' = 'Eve'), '📤 new joiners marked, with where it was shared');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok(public.my_share_people() = '[]'::jsonb, '📤 another user does not see Alice''s joiners');
reset role; set role anon; select tst.as_user('');
select tst.err($$select public.my_share_people()$$, '📤 anon cannot list joiners');
reset role;
reset role;
-- 🐞 תקלות באתר בתוסף: מנהל רואה ומטפל, צוות פיקוח לא
reset role; delete from public.client_errors; insert into public.client_errors(msg, src, ver) values ('Cannot read properties of undefined', 'alertsCheck26', '18');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select count(*) from public.staff_events(null) e where e.kind = 'error' and e.pending and e.title like 'Cannot read%') = 1
  and (public.staff_pending()->>'error')::int = 1, '🐞 admin gets site errors in the extension');
select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok((select count(*) from public.staff_events(null) e where e.kind = 'error') = 0 and (public.staff_pending()->>'error')::int = 0, '🐞 moderator does not see site errors');
select tst.err($$select public.staff_decide('error', (select max(id)::text from public.client_errors), true)$$, '🐞 moderator cannot clear errors');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok(public.staff_decide('error', (select max(id)::text from public.client_errors), true) = 'ok', '🐞 admin marks an error handled');
select tst.ok((public.staff_pending()->>'error')::int = 0, '🐞 handled error leaves the list');
reset role;
-- 👮 הרשאות לכל איש צוות + 📣 מי נכנס ומאיפה
reset role; set role anon; select tst.as_user('');
select public.visit_ping('whatsapp', 'https://yamshopping.com/?src=whatsapp', 'android-app://com.whatsapp/', 'טלפון · Android');
select tst.err($$select * from public.visit_log$$, '👮 anon cannot read the visit log');
select tst.err($$select * from public.staff_visits(null, 10)$$, '👮 anon cannot list visits');
reset role;
select tst.ok((select referrer = 'android-app://com.whatsapp/' and user_id is null from public.visit_log order by id desc limit 1), '👮 anonymous visit saved without an id, with the app it came from');
-- בוב משתמש ותיק (החשבון נפתח לפני חודש) — הכניסה שלו היא "חזר/ה", לא הצטרפות
update auth.users set created_at = now() - interval '30 days' where id = '00000000-0000-0000-0000-00000000000b';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000b');
select public.visit_ping('google', 'https://yamshopping.com/', 'javascript:alert(1)', 'מחשב<script>');
select public.visit_ping('google', 'https://yamshopping.com/again', '', '');
reset role;
select tst.ok((select count(*) from public.visit_log where user_id = '00000000-0000-0000-0000-00000000000b') = 1, '👮 a user is logged once per half hour');
select tst.ok((select referrer = '' and device !~ '[<>]' from public.visit_log where user_id = '00000000-0000-0000-0000-00000000000b'), '👮 bad referrer and device text are cleaned');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.err($$select * from public.staff_visits(null, 10)$$, '👮 a regular user cannot list visits');
select tst.ok(public.my_perms() is null, '👮 a regular user has no staff permissions');
select tst.ok(public.staff_perms_set('00000000-0000-0000-0000-000000000002', '{"emails":true}') = 'forbidden', '👮 a regular user cannot change permissions');
select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok((select name = 'Bob' and email = '' and src = 'google' from public.staff_visits(null, 50) where user_id = '00000000-0000-0000-0000-00000000000b' and kind = 'visit'), '👮 moderator sees who entered by name, without email');
select tst.ok(public.admin_visit_sources() is not null, '👮 moderator sees where visitors came from by default');
select tst.ok(public.staff_perms_set('00000000-0000-0000-0000-000000000002', '{"emails":true}') = 'forbidden', '👮 moderator cannot change his own permissions');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok(public.staff_perms_set('00000000-0000-0000-0000-000000000002', '{"visitors":false,"tabs":["recipes","<x>"],"junk":1}') = 'ok', '👮 owner sets permissions');
reset role;
select tst.ok((select perms = '{"visitors":false,"tabs":["recipes"]}'::jsonb from public.staff where user_id = '00000000-0000-0000-0000-000000000002'), '👮 unknown keys and bad tab names are dropped');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.err($$select * from public.staff_visits(null, 10)$$, '👮 visitors turned off: moderator cannot list visits');
select tst.ok(public.admin_visit_sources() is null and public.admin_guest_stats() is null, '👮 visitors turned off: no source stats either');
select tst.ok((public.my_perms()->'tabs') = '["recipes"]'::jsonb, '👮 moderator gets his tab list');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok(public.staff_perms_set('00000000-0000-0000-0000-000000000002', '{"emails":true,"delete_users":true}') = 'ok', '👮 owner gives emails');
select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok((select email = 'b@x.com' from public.staff_visits(null, 50) where user_id = '00000000-0000-0000-0000-00000000000b' and kind = 'visit'), '👮 with the emails permission the moderator sees emails');
select tst.ok(public.admin_delete_user('00000000-0000-0000-0000-000000000010') = 'forbidden', '👮 delete_users never works for a moderator');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select count(*) from public.staff_visits(null, 50) where user_id = '00000000-0000-0000-0000-00000000000b') >= 1, '👮 owner sees who entered');
reset role; update public.staff set perms = '{}' where user_id = '00000000-0000-0000-0000-000000000002';
-- 🕵️ כל מה שהצוות עושה — לבעלים בלבד
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000002');
select public.log_activity('bo_view', 'recipes');
select tst.err($$select * from public.owner_staff_actions(null, 7)$$, '🕵️ moderator cannot read the staff action log');
select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.err($$select * from public.owner_staff_actions(null, 7)$$, '🕵️ a user cannot read the staff action log');
update public.profiles set name = 'Alice2' where id = auth.uid();
reset role;
select tst.ok(not exists (select 1 from public.audit_log where table_name = 'profiles' and actor = '00000000-0000-0000-0000-00000000000a'), '🕵️ a regular user editing their own name is not logged');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok(exists (select 1 from public.owner_staff_actions('00000000-0000-0000-0000-000000000002', 7) where kind = 'activity' and what = 'bo_view' and title = 'recipes'), '🕵️ owner sees which back-office screens the moderator opened');
reset role;
-- 📊 מקור הצטרפות, סיכום לפי קמפיין, דוח שבועי
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(not exists (select 1 from public.admin_user_sources()), '📊 a regular user gets no user sources');
select tst.err($$select public.staff_weekly_report()$$, '📊 users cannot trigger the weekly report');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select src = 'whatsapp' from public.admin_user_sources() where user_id = '00000000-0000-0000-0000-00000000000d'), '📊 owner sees where each user first came from (signup)');
select tst.ok((select src = 'google' from public.admin_user_sources() where user_id = '00000000-0000-0000-0000-00000000000b'), '📊 owner sees where each user first came from (first visit)');
select tst.ok((select (e ? 'active7') and (e->>'signups')::int = 1 from jsonb_array_elements(public.admin_visit_sources()) e where e->>'src' = 'whatsapp'), '📊 per-campaign summary has signups and still-active counts');
reset role;
select tst.ok(public.staff_weekly_report() >= 1, '📊 weekly report goes out to staff');
-- 🧩 כניסות והרשמות גם בתוסף הכרום (רק משתמשים רשומים, ולא כממתין לאישור)
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok(exists (select 1 from public.staff_events(now() - interval '1 day') e where e.kind = 'visit' and e.title like 'Bob%' and not e.pending)
  and exists (select 1 from public.staff_events(now() - interval '1 day') e where e.kind = 'signup'), '🧩 the extension gets entries and sign-ups');
select tst.ok(not exists (select 1 from public.staff_pending_items() e where e.kind in ('visit','signup')), '🧩 entries are never "waiting for approval"');
reset role;
-- 🎉/👋 v43: משתמש חדש שהצטרף עכשיו מול משתמש קיים שחזר
reset role;
insert into public.push_subs(endpoint, user_id, p256dh, auth_key) values ('https://fcm.googleapis.com/fcm/send/owner43', '00000000-0000-0000-0000-000000000001', 'k', 'a') on conflict do nothing;
update auth.users set created_at = now() where id = '00000000-0000-0000-0000-000000000010';
delete from public.visit_log where user_id = '00000000-0000-0000-0000-000000000010';
delete from public.visit_signups where user_id = '00000000-0000-0000-0000-000000000010';
delete from public.push_queue where tag like 'signup:%' or tag like 'visit:%';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000010');
select public.visit_ping('qr-shul', 'https://yamshopping.com/?src=qr-shul', '', 'טלפון · Android');
select tst.ok(public.visit_src_signup('qr-shul') = false, '🎉 the site''s own signup call after the first visit does not count twice');
reset role;
select tst.ok((select is_new from public.visit_log where user_id = '00000000-0000-0000-0000-000000000010'), '🎉 the first entry of a brand-new account is marked as joining');
select tst.ok((select src = 'qr-shul' from public.visit_signups where user_id = '00000000-0000-0000-0000-000000000010'), '🎉 joining is recorded with its source even without the site''s call');
select tst.ok((select count(*) from public.push_queue where tag = 'signup:00000000-0000-0000-0000-000000000010' and kind = 'signups' and title like '%הצטרף%') = 1
          and not exists (select 1 from public.push_queue where tag = 'visit:00000000-0000-0000-0000-000000000010'), '🎉 a new user sends one "joined" push (own kind), not an "entered" push');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select count(*) from public.staff_visits(null, 100) where user_id = '00000000-0000-0000-0000-000000000010') = 1
          and (select kind = 'signup' and device <> '' from public.staff_visits(null, 100) where user_id = '00000000-0000-0000-0000-000000000010'), '🎉 who-entered list shows the new user once, as joined, with the device');
select tst.ok(exists (select 1 from public.staff_events(now() - interval '1 day') e where e.kind = 'signup' and e.ref = '00000000-0000-0000-0000-000000000010' and e.title like '%הצטרף/ה עכשיו%')
          and not exists (select 1 from public.staff_events(now() - interval '1 day') e where e.kind in ('visit','user') and (e.ref = '00000000-0000-0000-0000-000000000010' or e.title like 'Gil%')), '🎉 the extension gets one "joined" item for a new user, not three');
reset role;
update public.visit_log set at = at - interval '5 hours' where user_id = '00000000-0000-0000-0000-00000000000b';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000b');
select public.visit_ping('whatsapp', 'https://yamshopping.com/', '', 'מחשב');
reset role;
select tst.ok((select count(*) from public.push_queue where tag = 'visit:00000000-0000-0000-0000-00000000000b' and kind = 'visits' and title like '%חזר/ה לאתר%' and body like 'ביקור קודם: לפני 5 שעות%') = 1, '👋 a returning user sends a "came back" push with the previous visit');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok(exists (select 1 from public.staff_events(now() - interval '1 hour') e where e.kind = 'visit' and e.title = 'Bob חזר/ה לאתר' and e.detail like 'ביקור קודם: לפני 5 שעות%'), '👋 the extension shows a returning user separately, with the previous visit');
reset role;
-- 💬 v43: צ'אט — תגובה להודעה, עריכה, אימוג'י, ותמונות רק מהמנהל
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000e');
insert into public.support_messages(user_id, body) values (auth.uid(), 'שלום, שאלה');
select tst.err($$insert into public.support_messages(user_id, body, image) values (auth.uid(), 'x', 'data:image/png;base64,iVBORw0KGgo=')$$, '💬 a user cannot send an image');
select tst.err($$insert into public.support_messages(user_id, body, image) values (auth.uid(), '', 'data:image/png;base64,iVBORw0KGgo=')$$, '💬 a user cannot send an image-only message');
select tst.as_user('00000000-0000-0000-0000-00000000000f');
insert into public.support_messages(user_id, body) values (auth.uid(), 'הודעה של פיי');
select tst.as_user('00000000-0000-0000-0000-000000000001');
insert into public.support_messages(user_id, body, image, reply_to) values ('00000000-0000-0000-0000-00000000000e', '', 'data:image/png;base64,iVBORw0KGgo=',
  (select id from public.support_messages where body = 'שלום, שאלה'));
select tst.ok((select from_staff and reply_to is not null from public.support_messages where user_id = '00000000-0000-0000-0000-00000000000e' and image <> ''), '💬 the admin sends an image-only reply to a specific message');
select tst.err($$insert into public.support_messages(user_id, body, image) values ('00000000-0000-0000-0000-00000000000e', 'x', 'data:image/svg+xml;base64,PHN2Zz4=')$$, '💬 even the admin cannot send an SVG image');
select tst.err($$insert into public.support_messages(user_id, body, image) values ('00000000-0000-0000-0000-00000000000e', 'x', 'data:image/png;base64,AA" onerror="x')$$, '💬 image data with a quote is rejected');
select tst.ok((select last_body like '📷%' from public.support_threads() where user_id = '00000000-0000-0000-0000-00000000000e'), '💬 an image shows as 📷 in the conversations list');
select tst.as_user('00000000-0000-0000-0000-00000000000e');
insert into public.support_messages(user_id, body, reply_to) values (auth.uid(), 'תודה', (select id from public.support_messages where image <> '' and user_id = auth.uid()));
select tst.ok((select reply_to is not null from public.support_messages where body = 'תודה'), '💬 a user replies to a specific message');
reset role;
create temp table t43 as select id from public.support_messages where body = 'הודעה של פיי';
grant select on t43 to authenticated;
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000e');
insert into public.support_messages(user_id, body, reply_to) values (auth.uid(), 'ניסיון', (select id from t43));
select tst.ok((select reply_to is null from public.support_messages where body = 'ניסיון'), '💬 replying to a message from someone else''s chat is dropped');
update public.support_messages set body = 'שלום, שאלה (מתוקן)' where body = 'שלום, שאלה';
select tst.ok((select edited_at is not null from public.support_messages where body = 'שלום, שאלה (מתוקן)'), '💬 a user edits their own message and it is marked as edited');
select tst.err($$update public.support_messages set body = 'זייפתי' where user_id = auth.uid() and from_staff$$, '💬 a user cannot edit the admin''s message');
update public.support_messages set react_user = '👍', react_staff = '❤️', image = '', reply_to = null where user_id = auth.uid() and from_staff;
reset role;
select tst.ok((select react_user = '👍' and react_staff = '' and image <> '' and reply_to is not null from public.support_messages where user_id = '00000000-0000-0000-0000-00000000000e' and from_staff), '💬 a user reacts with an emoji, but cannot set the admin''s reaction, remove the image or the reply');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000e');
select tst.err($$update public.support_messages set react_user = '<b>' where body = 'תודה'$$, '💬 only emojis from the list are allowed as reactions');
select tst.as_user('00000000-0000-0000-0000-00000000000f');
update public.support_messages set body = 'פרצתי', react_user = '😂' where user_id = '00000000-0000-0000-0000-00000000000e';
reset role;
select tst.ok(not exists (select 1 from public.support_messages where body = 'פרצתי' or react_user = '😂'), '💬 another user cannot edit or react in someone else''s chat');
select tst.as_user(''); update public.support_messages set created_at = now() - interval '2 days' where body = 'ניסיון';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000e');
select tst.err($$update public.support_messages set body = 'מאוחר' where body = 'ניסיון'$$, '💬 a user cannot edit a message after 24 hours');
select tst.as_user('00000000-0000-0000-0000-000000000001');
update public.support_messages set react_staff = '🙏' where body = 'תודה';
update public.support_messages set body = 'עדכון מהמנהל' where user_id = '00000000-0000-0000-0000-00000000000e' and from_staff;
reset role;
select tst.ok((select react_staff = '🙏' from public.support_messages where body = 'תודה')
          and (select edited_at is not null from public.support_messages where body = 'עדכון מהמנהל'), '💬 the admin reacts and edits their own message');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.err($$update public.support_messages set body = 'המנהל שינה' where body = 'תודה'$$, '💬 even the admin cannot rewrite what a user wrote');
reset role;
-- ======== 🔐 two-step sign-in (MFA): once enrolled, admin powers need the code (aal2) ========
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001'); select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
select tst.ok(public.is_owner() and public.is_admin(), '🔐 owner without MFA keeps full access (nothing changes until enrolled)');
reset role;
insert into auth.mfa_factors(user_id, status) values ('00000000-0000-0000-0000-000000000001', 'unverified'), ('00000000-0000-0000-0000-000000000002', 'verified');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok(public.is_owner(), '🔐 a half-finished (unverified) enrollment does not lock the owner out');
reset role; update auth.mfa_factors set status = 'verified' where user_id = '00000000-0000-0000-0000-000000000001';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok(not public.is_owner() and not public.is_admin() and not public.is_staff() and public.my_role() is null, '🔐 owner with MFA + password only (aal1): no admin powers');
select tst.ok((select count(*) from public.staff) = 0 or not exists (select 1 from public.staff where user_id <> auth.uid()), '🔐 aal1 owner cannot read the staff table');
select set_config('request.jwt.claims', '{"aal":"aal2"}', false);
select tst.ok(public.is_owner() and public.is_admin() and public.my_role() = 'owner', '🔐 owner after typing the code (aal2): full access');
select tst.as_user('00000000-0000-0000-0000-000000000002'); select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
select tst.ok(not public.is_staff() and public.my_role() is null and not public.staff_can('visitors'), '🔐 moderator with MFA + password only: no staff powers');
select set_config('request.jwt.claims', '{"aal":"aal2"}', false);
select tst.ok(public.is_staff() and public.my_role() = 'moderator' and public.staff_can('visitors'), '🔐 moderator after the code: staff powers back');
select set_config('request.jwt.claims', '', false);
reset role;
-- owner can see and reset staff MFA; nobody else can
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000002'); select set_config('request.jwt.claims', '{"aal":"aal2"}', false);
select tst.err($$select * from public.mfa_staff_status()$$, '🔐 staff cannot see who has MFA');
select tst.err($$select public.mfa_reset('00000000-0000-0000-0000-000000000001')$$, '🔐 staff cannot reset the owner''s MFA');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select enrolled from public.mfa_staff_status() where user_id = '00000000-0000-0000-0000-000000000002'), '🔐 owner sees the moderator has MFA');
select public.mfa_reset('00000000-0000-0000-0000-000000000002');
select tst.ok(not (select enrolled from public.mfa_staff_status() where user_id = '00000000-0000-0000-0000-000000000002'), '🔐 owner resets a staff member''s MFA');
select tst.err($$select public.mfa_reset('00000000-0000-0000-0000-00000000000a')$$, '🔐 the reset is only for staff accounts');
select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
select tst.err($$select public.mfa_reset('00000000-0000-0000-0000-000000000001')$$, '🔐 owner without the code (aal1) cannot reset MFA');
-- no switch that turns MFA off for the whole staff at once — not even for the owner
select set_config('request.jwt.claims', '{"aal":"aal2"}', false);
select tst.err($$select public.mfa_set_off(true)$$, '🔐 staff cannot switch MFA off for the site') from (select tst.as_user('00000000-0000-0000-0000-000000000002')) x;
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.err($$select public.mfa_set_off(true)$$, '🔐 even the owner cannot switch MFA off for everyone');
select tst.err($$update public.mfa_settings set off = true$$, '🔐 nobody writes the switch table directly');
reset role; update public.mfa_settings set off = true; set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
select tst.ok(not public.is_owner(), '🔐 an old "off" value in the table no longer skips the code');
select set_config('request.jwt.claims', '{"aal":"aal2"}', false);
select public.mfa_set_off(false);
select tst.ok(not public.mfa_global_off(), '🔐 turning it back on still works');
select set_config('request.jwt.claims', '', false);
reset role;
delete from auth.mfa_factors;
-- ======== 🔔 staff sign-in from a new device → push to the owner ========
insert into public.push_subs(endpoint, user_id, p256dh, auth_key) values ('https://push.example/owner-1', '00000000-0000-0000-0000-000000000001', 'k', 'a') on conflict do nothing;
delete from public.push_queue where tag like 'newdev:%';
insert into public.auth_events(kind, email, user_id, ip, ua) values ('login', 'mod@x.com', '00000000-0000-0000-0000-000000000002', '1.1.1.1', 'Chrome-A');
select tst.ok((select count(*) from public.push_queue where tag like 'newdev:%') = 0, '🔔 first-ever staff login: no alert');
insert into public.auth_events(kind, email, user_id, ip, ua) values ('login', 'mod@x.com', '00000000-0000-0000-0000-000000000002', '1.1.1.1', 'Chrome-A');
select tst.ok((select count(*) from public.push_queue where tag like 'newdev:%') = 0, '🔔 same device again: no alert');
insert into public.auth_events(kind, email, user_id, ip, ua) values ('login_fail', 'mod@x.com', '00000000-0000-0000-0000-000000000002', '9.9.9.9', 'Evil-B');
select tst.ok((select count(*) from public.push_queue where tag like 'newdev:%') = 0, '🔔 a failed try is not a sign-in');
update public.auth_events set kind = 'login' where ua = 'Evil-B';
select tst.ok((select count(*) from public.push_queue where tag like 'newdev:%' and user_id = '00000000-0000-0000-0000-000000000001') = 1, '🔔 staff sign-in from a new device alerts the owner');
insert into public.auth_events(kind, email, user_id, ip, ua) values ('login', 'a@x.com', '00000000-0000-0000-0000-00000000000a', '1.1.1.1', 'x'), ('login', 'a@x.com', '00000000-0000-0000-0000-00000000000a', '8.8.8.8', 'y');
select tst.ok((select count(*) from public.push_queue where tag like 'newdev:%') = 1, '🔔 regular users are not tracked');
delete from public.push_queue where tag like 'newdev:%';
-- ======== 🧹 daily cleanup of old data ========
insert into public.guest_visits(id, first_at, last_at) values (gen_random_uuid(), now() - interval '400 days', now() - interval '200 days'), (gen_random_uuid(), now(), now());
select public.data_retention();
select tst.ok((select count(*) from public.guest_visits where last_at < now() - interval '180 days' and converted_user is null) = 0
          and exists (select 1 from public.guest_visits where last_at > now() - interval '1 day'), '🧹 old guest visits deleted, recent ones kept');
select tst.ok(exists (select 1 from cron.job where jobname = 'yam-retention'), '🧹 cleanup runs every day');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.err($$select public.data_retention()$$, '🧹 users cannot run the cleanup');
reset role;
-- ======== 🤝 v44 community: suggestions, tips, found deals, badges, wrong-price reports ========
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.suggestions(title, body, created_by, status, pinned, extra_votes) values ('מצב לילה', 'b', auth.uid(), 'done', true, 999);
select tst.ok((select status = 'new' and not pinned and extra_votes = 0 from public.suggestions where title = 'מצב לילה'), '🤝 user cannot set status / pin / votes on a new suggestion');
select tst.ok((select votes = 1 and my_vote from public.suggestions_list() where title = 'מצב לילה'), '🤝 whoever suggested already "wants" it');
update public.suggestions set status = 'working', reply = 'x' where title = 'מצב לילה';
select tst.ok((select status = 'new' and reply = '' from public.suggestions where title = 'מצב לילה'), '🤝 user cannot change status / admin reply');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok(public.suggestion_vote((select id from public.suggestions where title = 'מצב לילה'), true) = 2, '🙋 "me too" counts');
select tst.ok(public.suggestion_vote((select id from public.suggestions where title = 'מצב לילה'), true) = 2, '🙋 voting twice counts once');
update public.suggestions set title = 'hacked' where title = 'מצב לילה';
select tst.ok(exists (select 1 from public.suggestions where title = 'מצב לילה'), '🤝 cannot edit someone else''s suggestion');
select tst.err($$insert into public.suggestion_votes(suggestion_id, user_id) values ((select id from public.suggestions limit 1), '00000000-0000-0000-0000-00000000000c')$$, '🙋 no direct writes to the votes table');
select tst.as_user('00000000-0000-0000-0000-000000000002');
update public.suggestions set status = 'working', reply = 'בקרוב', pinned = true, extra_votes = 5 where title = 'מצב לילה';
select tst.ok((select status = 'working' and pinned and votes = 7 from public.suggestions_list() where title = 'מצב לילה'), '🛠️ staff sets status, pins and edits the count');
insert into public.suggestions(title, created_by, status) values ('הצעה של המנהל', auth.uid(), 'done');
select tst.ok((select status = 'done' from public.suggestions where title = 'הצעה של המנהל'), '🛠️ staff can add a suggestion with any status');
update public.suggestions set hidden = true where title = 'הצעה של המנהל';
select tst.as_user('00000000-0000-0000-0000-00000000000c');
select tst.ok(not exists (select 1 from public.suggestions_list() where title = 'הצעה של המנהל'), '🙈 hidden suggestion is not shown to users');
select tst.ok(public.suggestion_vote((select id from public.suggestions where title = 'מצב לילה'), true) = 8, '🙋 vote count after staff edit');
select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.err($$update public.suggestions set title = 'שינוי' where title = 'מצב לילה'$$, '🤝 suggestion already in work cannot be re-written by its author');
-- tips
insert into public.saving_tips(body, created_by, status, pinned) values ('לקנות ביום שלישי — יש מבצעים', auth.uid(), 'approved', true);
select tst.ok((select status = 'pending' and not pinned from public.saving_tips where body like 'לקנות ביום שלישי%'), '💰 user tip always waits for approval');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok(not exists (select 1 from public.tips_list() where body like 'לקנות ביום שלישי%'), '💰 pending tip is hidden from others');
select tst.ok(public.tip_like((select id from public.saving_tips where body like 'לקנות ביום שלישי%'), true) is null, '💰 cannot like a tip before approval');
select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok(public.staff_decide('tip', (select id::text from public.saving_tips where body like 'לקנות ביום שלישי%'), true) = 'ok', '💰 staff approves the tip');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok(public.tip_like((select id from public.saving_tips where body like 'לקנות ביום שלישי%'), true) = 1, '💰 approved tip is shown and liked');
select tst.as_user('00000000-0000-0000-0000-00000000000a');
update public.saving_tips set body = 'לקנות ביום שלישי — יש הנחות' where body like 'לקנות ביום שלישי%';
select tst.ok((select status = 'pending' from public.saving_tips where body = 'לקנות ביום שלישי — יש הנחות'), '💰 edited tip goes back to approval');
-- found deals
insert into public.store_posts(chain, kind, title, created_by) values ('רמי לוי', 'deal', 'חלב 1+1', auth.uid());
reset role; select set_config('app.bypass_price_guard', 'on', false); update public.store_posts set status = 'approved' where title = 'חלב 1+1'; select set_config('app.bypass_price_guard', 'off', false); set role authenticated;
select tst.ok((public.deal_vote((select id from public.store_posts where title = 'חלב 1+1'), 1)->>'own')::boolean, '🔥 cannot confirm your own deal');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok((public.deal_vote((select id from public.store_posts where title = 'חלב 1+1'), 1)->>'ok')::int = 1, '🔥 "still valid" counts');
select tst.ok((public.deal_vote((select id from public.store_posts where title = 'חלב 1+1'), -1)->>'gone')::int = 1, '🔥 "ended" counts');
select tst.ok((select ok = 0 and my_vote = -1 and not by_store from public.deals_found() where title = 'חלב 1+1'), '🔥 changing the vote to "ended" replaces it');
select tst.err($$insert into public.deal_votes(post_id, user_id, vote) values ((select id from public.store_posts where title = 'חלב 1+1'), auth.uid(), 1)$$, '🔥 no direct writes to deal votes');
-- badges
select tst.err($$insert into public.user_badges(user_id, label) values (auth.uid(), 'מלך')$$, '🎖️ users cannot give themselves a badge');
select tst.err($$select public.admin_badge_save(null, auth.uid(), 'custom', '👑', 'מלך', '', false)$$, '🎖️ only admins save badges');
reset role;
delete from public.referrals where referred in ('00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000e') or referrer = '00000000-0000-0000-0000-00000000000b';
insert into public.referrals(referred, referrer) values ('00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-00000000000b') on conflict do nothing;
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok(public.my_badges() @> '[{"e":"🎖️"}]', '🎖️ 3 friends joined → automatic ambassador badge');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok(public.admin_badge_save(null, '00000000-0000-0000-0000-00000000000b', 'amb', '🎖️', 'שגריר', '', true) = 'ok', '🎖️ admin removes the automatic badge');
select tst.ok(public.admin_badge_save(null, '00000000-0000-0000-0000-00000000000a', 'custom', '🏅', 'מדווח מצטיין', '', false) = 'ok', '🎖️ admin gives a custom badge');
select tst.ok(public.admin_badge_save(null, '00000000-0000-0000-0000-00000000000f', 'amb', '', 'שגרירה', '', false) = 'ok', '🎖️ admin makes anyone an ambassador');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok(public.my_badges() = '[]'::jsonb, '🎖️ removed badge is gone');
select tst.ok((select badges @> '[{"l":"מדווח מצטיין"}]' from public.suggestions_list() where title = 'מצב לילה')
          and exists (select 1 from public.community_ambassadors() where name = 'Fay' and is_amb)
          and exists (select 1 from public.community_ambassadors() where name = 'Bob' and joined = 3 and not is_amb), '🎖️ badges show next to names and in the ambassadors list');
select tst.ok(not exists (select 1 from public.admin_badges()), '🎖️ badge admin list is admin-only');
-- wrong price: the reporter writes the right price, staff fixes it in one click
reset role;
select set_config('app.bypass_price_guard', 'on', false);
insert into public.prices(id, product, product_key, chain, price, by_id) values ('00000000-0000-0000-0000-0000000000f1', 'במבה', 'במבה', 'רמי לוי', 9.9, '00000000-0000-0000-0000-00000000000a');
select set_config('app.bypass_price_guard', 'off', false);
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok((public.price_wrong_report('00000000-0000-0000-0000-0000000000f1', 5.5, 'במבצע עכשיו')->>'wrong')::int = 1, '❌ wrong-price report with the right price');
select tst.ok((public.price_wrong_report('00000000-0000-0000-0000-0000000000f1', -3, '')->>'error') = 'bad_price', '❌ nonsense price is refused');
select tst.ok(not exists (select 1 from public.staff_flagged_prices()), '❌ flagged list is staff-only');
select tst.err($$select public.staff_price_fix('00000000-0000-0000-0000-0000000000f1', 'update', 1)$$, '❌ users cannot fix prices');
select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok((public.price_wrong_report('00000000-0000-0000-0000-0000000000f1', 1, '')->>'own')::boolean, '❌ cannot flag your own report');
select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok((select reports @> '[{"price":5.5,"note":"במבצע עכשיו"}]' from public.staff_flagged_prices() where id = '00000000-0000-0000-0000-0000000000f1'), '❌ staff sees the suggested price and note');
select tst.ok(public.staff_price_fix('00000000-0000-0000-0000-0000000000f1', 'update', 5.5) = 'ok', '❌ staff fix runs');
select tst.ok((select price = 5.5 and wrong = 0 from public.prices where id = '00000000-0000-0000-0000-0000000000f1')
          and not exists (select 1 from public.staff_flagged_prices() where id = '00000000-0000-0000-0000-0000000000f1'), '❌ staff updates to the right price and the report is closed');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select public.price_wrong_report('00000000-0000-0000-0000-0000000000f1', null, '');
select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok(public.staff_price_fix('00000000-0000-0000-0000-0000000000f1', 'correct') = 'ok', '❌ "correct" runs');
select tst.ok((select wrong = 0 from public.prices where id = '00000000-0000-0000-0000-0000000000f1'), '❌ "the price is right" clears the reports');
-- ======== 🛒 shared lists from the community ========
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.shared_lists(title, items, status, featured, show_author, author_id)
  values ('שבת ל-8 נפשות', '[{"n":"חלות","q":"5"},{"n":" חלות "},"יין",{"n":""},{"x":1}]', 'approved', true, true, auth.uid());
select tst.ok((select status = 'pending' and not featured and not show_author and jsonb_array_length(items) = 2 from public.shared_lists where title = 'שבת ל-8 נפשות'),
              '🛒 user list goes to approval, cannot self-feature or show name, items cleaned');
select set_config('tst.sl', (select id::text from public.shared_lists where title = 'שבת ל-8 נפשות'), false) is not null;
select tst.err($$insert into public.shared_lists(title, items, author_id) values ('ריקה', '[]', auth.uid())$$, '🛒 list must have items');
insert into public.shared_lists(title, items, author_id) values ('בשם אחר', '["a"]', '00000000-0000-0000-0000-00000000000b');
select tst.ok((select author_id = auth.uid() from public.shared_lists where title = 'בשם אחר'), '🛒 cannot share in someone else''s name');
delete from public.shared_lists where title = 'בשם אחר';
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok((select count(*) from public.shared_lists) = 0, '🛒 pending lists are hidden from others');
select tst.ok(jsonb_array_length(public.shared_lists_feed('public')) = 0, '🛒 feed shows only approved lists');
select tst.err($$select public.shared_lists_feed('all')$$, '🛒 only staff sees all lists');
update public.shared_lists set status = 'approved' where id = current_setting('tst.sl')::uuid;
select tst.ok((select count(*) from public.shared_lists) = 0, '🛒 other users cannot approve a list');
select tst.err($$insert into public.shared_list_ratings(list_id, carts) values (current_setting('tst.sl')::uuid, 5)$$, '🛒 cannot rate a pending list');
reset role; select tst.as_user('');
update public.shared_lists set status = 'approved' where title = 'שבת ל-8 נפשות';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok(jsonb_array_length(public.shared_lists_feed('all')) = 1, '🛒 staff sees all lists');
update public.shared_lists set featured = true, items = items || '[{"n":"דגים","q":"1 קג"}]' where title = 'שבת ל-8 נפשות';
select tst.ok((select featured and jsonb_array_length(items) = 3 and status = 'approved' from public.shared_lists where title = 'שבת ל-8 נפשות'), '🛒 staff edits items and announces the list of the week');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.shared_list_ratings(list_id, carts) select id, 4 from public.shared_lists where title = 'שבת ל-8 נפשות';
select tst.err($$insert into public.shared_list_ratings(list_id, carts) select id, 6 from public.shared_lists where title = 'שבת ל-8 נפשות'$$, '🛒 rating is 1 to 5 carts');
select tst.err($$insert into public.shared_list_ratings(list_id, user_id, carts) select id, '00000000-0000-0000-0000-00000000000c', 1 from public.shared_lists where title = 'שבת ל-8 נפשות'$$, '🛒 cannot rate in someone else''s name');
update public.shared_lists set title = 'נפרץ';
select tst.ok(not exists (select 1 from public.shared_lists where title = 'נפרץ'), '🛒 other users cannot edit someone else''s list');
select public.shared_list_added(id) from public.shared_lists where title = 'שבת ל-8 נפשות';
select public.shared_list_added(id) from public.shared_lists where title = 'שבת ל-8 נפשות';
select tst.ok((select (x->>'n')::int = 1 and (x->>'avg')::numeric = 4 and (x->>'adds')::int = 1 and (x->>'mine')::int = 4 and (x->>'week')::boolean and x->>'author' = '' from jsonb_array_elements(public.shared_lists_feed('public')) x),
              '🛒 feed: rating, one add per user, list of the week, name hidden by default');
select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.err($$insert into public.shared_list_ratings(list_id, carts) select id, 5 from public.shared_lists where title = 'שבת ל-8 נפשות'$$, '🛒 cannot rate your own list');
update public.shared_lists set description = 'עודכן' where title = 'שבת ל-8 נפשות';
select tst.ok((select status = 'pending' and not featured from public.shared_lists where title = 'שבת ל-8 נפשות'), '🛒 author edit goes back to approval');
reset role; select tst.as_user('');
set role anon;
select tst.err($$insert into public.shared_lists(title, items) values ('x', '["a"]')$$, '🛒 guests cannot share lists');
select tst.ok(jsonb_typeof(public.shared_lists_feed('public')) = 'array', '🛒 guests can browse the lists');
reset role;
-- ======== 🔗 merging two accounts into one shared account ========
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000f');
select set_config('tst.mroom', public.ensure_my_room(), false);
select set_config('tst.mc', public.merge_code_create()->>'code', false);
select tst.ok(current_setting('tst.mc') ~ '^[A-Z2-9]{8}$', '🔗 merge code is 8 letters/digits');
select tst.ok(public.merge_status()->'pending'->>'code' = current_setting('tst.mc'), '🔗 host sees the pending code');
select tst.err($$select * from public.merge_codes$$, '🔗 merge codes cannot be read directly');
select tst.ok(public.merge_accept(current_setting('tst.mc'))->>'error' = 'self', '🔗 cannot merge with yourself');
select tst.as_user('00000000-0000-0000-0000-000000000010');
select public.ensure_my_room();
select tst.ok(public.merge_accept('WRONG123')->>'error' = 'bad', '🔗 wrong code refused');
select tst.ok(public.merge_accept(lower(substr(current_setting('tst.mc'),1,4)) || '-' || substr(current_setting('tst.mc'),5))->>'code' = current_setting('tst.mroom'), '🔗 guest merges (dash/lowercase ok) and gets the shared room');
select tst.ok(public.merge_status()->'guest'->>'code' = current_setting('tst.mroom'), '🔗 guest status shows the shared account');
select tst.ok(exists (select 1 from public.rooms where code = current_setting('tst.mroom')), '🔗 guest reads the shared lists');
select tst.ok(public.merge_code_create()->>'error' = 'guest', '🔗 a merged guest cannot host another merge');
select tst.as_user('00000000-0000-0000-0000-00000000000e');
select tst.ok(public.merge_accept(current_setting('tst.mc'))->>'error' = 'bad', '🔗 a used code does not work again');
select tst.ok(public.merge_leave() = false and public.merge_end('00000000-0000-0000-0000-000000000010') = false, '🔗 outsiders cannot end someone else''s merge');
select tst.as_user('00000000-0000-0000-0000-00000000000f');
select tst.ok(jsonb_array_length(public.merge_status()->'partners') = 1 and public.merge_status()->'pending' = 'null'::jsonb, '🔗 host sees the partner, code used up');
-- guest leaves by themself
select tst.as_user('00000000-0000-0000-0000-000000000010');
select tst.ok(public.merge_leave(), '🔗 guest leaves the merge');
select tst.ok(public.merge_status()->'guest' = 'null'::jsonb and not exists (select 1 from public.rooms where code = current_setting('tst.mroom')), '🔗 after leaving: no access to the shared lists');
select tst.ok(not public.join_room(current_setting('tst.mroom')), '🔗 after leaving: cannot sneak back with the room code');
-- merge again, then the host ends it
select tst.as_user('00000000-0000-0000-0000-00000000000f');
select set_config('tst.mc', public.merge_code_create()->>'code', false);
select tst.as_user('00000000-0000-0000-0000-000000000010');
select tst.ok(public.merge_accept(current_setting('tst.mc'))->>'ok' = 'true', '🔗 can merge again with a new code');
select tst.as_user('00000000-0000-0000-0000-00000000000f');
select tst.ok(public.merge_end('00000000-0000-0000-0000-000000000010'), '🔗 host ends the merge');
select tst.as_user('00000000-0000-0000-0000-000000000010');
select tst.ok(public.merge_status()->'guest' = 'null'::jsonb and not exists (select 1 from public.rooms where code = current_setting('tst.mroom')), '🔗 after the host ends it: guest is back on their own');
-- a host cannot be merged into someone else while others are merged into them
select tst.as_user('00000000-0000-0000-0000-00000000000f');
select set_config('tst.mc', public.merge_code_create()->>'code', false);
select tst.as_user('00000000-0000-0000-0000-000000000010');
select public.merge_accept(current_setting('tst.mc'));
select set_config('tst.mc2', public.merge_code_create()->>'code', false);
select tst.ok(current_setting('tst.mc2') is null or current_setting('tst.mc2') = '', '🔗 guest gets no code of their own');
select tst.as_user('00000000-0000-0000-0000-00000000000e');
select set_config('tst.mc3', public.merge_code_create()->>'code', false);
select tst.as_user('00000000-0000-0000-0000-00000000000f');
select tst.ok(public.merge_accept(current_setting('tst.mc3'))->>'error' = 'is_host', '🔗 a host with partners cannot merge into another account');
select public.merge_code_cancel();
select tst.ok(public.merge_status()->'pending' = 'null'::jsonb, '🔗 code cancelled');
select tst.ok(public.admin_merges() is null, '🔗 regular users cannot see who merged');
select tst.err($$select public.admin_merge_end('00000000-0000-0000-0000-000000000010')$$, '🔗 regular users cannot end merges as admin');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok(jsonb_array_length(public.admin_merges()) = 1 and public.admin_merges()->0->>'guest_email' = 'g@x.com' and public.admin_merges()->0->>'host_email' = 'f@x.com', '🔗 owner sees who merged with whom in the back office');
select tst.ok(public.admin_merge_end('00000000-0000-0000-0000-000000000010'), '🔗 owner can end a merge');
select tst.ok(jsonb_array_length(public.admin_merges()) = 0, '🔗 after the owner ends it, the merge is gone');
-- ======== 👁️ shared account: the owner chooses what the partner sees ========
select tst.as_user('00000000-0000-0000-0000-00000000000f');
update public.rooms set data = '{"lists":[{"id":"la","name":"A","items":[{"id":"i1","n":"חלב"}]},{"id":"lb","name":"B סודית","items":[{"id":"i2","n":"מתנה"}]}],"history":[{"ts":1,"items":[]}],"errands":[{"id":"e1","t":"דואר"}],"budget":{"m":1}}'::jsonb where code = current_setting('tst.mroom');
select set_config('tst.mc', public.merge_code_create()->>'code', false);
select tst.ok(public.merge_share_set(null, '{"lists":["la"],"view":{"history":false,"errands":false}}')->>'ok' = 'true', '👁️ owner picks what the partner will see, on the code');
select tst.ok(public.merge_status()->'pending'->'share'->'lists' = '["la"]'::jsonb, '👁️ the choice is saved on the pending code');
select tst.as_user('00000000-0000-0000-0000-00000000000e');
select tst.ok(public.merge_share_set('00000000-0000-0000-0000-000000000010', null)->>'error' = 'not_found', '👁️ outsiders cannot change what a partner sees');
select tst.as_user('00000000-0000-0000-0000-000000000010');
select set_config('tst.alias', public.merge_accept(current_setting('tst.mc'))->>'code', false);
select tst.ok(current_setting('tst.alias') <> current_setting('tst.mroom') and current_setting('tst.alias') like 'S%', '👁️ a limited partner gets an alias, not the real code');
select tst.ok(public.merge_status()->'guest'->>'code' = current_setting('tst.alias'), '👁️ merge status also gives only the alias');
select tst.ok(not exists (select 1 from public.rooms where code = current_setting('tst.mroom')), '👁️ RLS: a limited partner cannot read the rooms table');
select tst.ok(not exists (select 1 from public.room_members where room_code = current_setting('tst.mroom')), '👁️ RLS: a limited partner cannot read the real code from room_members');
select tst.ok(public.room_get(current_setting('tst.mroom')) is null and public.room_access(current_setting('tst.mroom')) is null, '👁️ the real code does not work for a limited partner');
select tst.ok(public.room_access(current_setting('tst.alias'))->>'role' = 'partner', '👁️ room_access says partner');
select tst.ok(jsonb_array_length(public.room_get(current_setting('tst.alias'))->'lists') = 1 and public.room_get(current_setting('tst.alias'))->'lists'->0->>'id' = 'la', '👁️ partner sees only the chosen list');
select tst.ok(not (public.room_get(current_setting('tst.alias')) ? 'history') and not (public.room_get(current_setting('tst.alias')) ? 'errands') and public.room_get(current_setting('tst.alias')) ? 'budget', '👁️ hidden sections are not sent, shown ones are');
select tst.ok(public.merge_partner_put(current_setting('tst.alias'), '{"lists":[{"id":"la","name":"A2","items":[{"id":"i1","n":"חלב"}]},{"id":"lc","name":"C","items":[]},{"id":"lb","name":"hacked","items":[]}],"history":[],"errands":[]}', 'Gil'), '👁️ partner saves through the server');
select tst.ok(jsonb_array_length(public.room_get(current_setting('tst.alias'))->'lists') = 2, '👁️ a list the partner created stays visible to them');
select tst.ok(public.merge_partner_put(current_setting('tst.alias'), '{"lists":[]}', 'Gil'), '👁️ partner deletes their visible lists');
select tst.as_user('00000000-0000-0000-0000-00000000000f');
select tst.ok((select jsonb_array_length(data->'lists') = 1 and data->'lists'->0->>'name' = 'B סודית' and jsonb_array_length(data->'history') = 1 and jsonb_array_length(data->'errands') = 1
  from public.rooms where code = current_setting('tst.mroom')), '👁️ hidden list, history and errands are untouched by the partner');
select tst.ok(public.merge_status()->'partners'->0->'share'->'view'->>'history' = 'false', '👁️ owner sees what each partner sees');
select tst.ok(public.merge_share_set('00000000-0000-0000-0000-000000000010', '{"lists":null,"view":{}}')->'share' = 'null'::jsonb, '👁️ owner can give back full access');
select tst.as_user('00000000-0000-0000-0000-000000000010');
select tst.ok(public.merge_status()->'guest'->>'code' = current_setting('tst.mroom') and exists (select 1 from public.rooms where code = current_setting('tst.mroom')), '👁️ full partner is back on the real code');
select tst.as_user('00000000-0000-0000-0000-00000000000f');
select tst.ok(public.merge_share_set('00000000-0000-0000-0000-000000000010', '{"view":{"budget":false}}')->>'ok' = 'true', '👁️ owner limits a partner who had full access');
select tst.ok(not exists (select 1 from public.rooms where code = current_setting('tst.mroom')) and exists (select 1 from public.rooms where owner = '00000000-0000-0000-0000-00000000000f'), '👁️ limiting a partner who knew the code changes the code');
select set_config('tst.mroom', public.ensure_my_room(), false);
select tst.as_user('00000000-0000-0000-0000-000000000010');
select tst.ok(not exists (select 1 from public.rooms where owner = '00000000-0000-0000-0000-00000000000f'), '👁️ after limiting: no direct access');
select tst.ok(not (public.room_get(public.merge_status()->'guest'->>'code') ? 'budget'), '👁️ the new limit applies right away');
select public.leave_room(public.merge_status()->'guest'->>'code');
select tst.ok(not public.join_room(current_setting('tst.mroom')) and public.merge_status()->'guest' = 'null'::jsonb, '👁️ a partner who left cannot rejoin with the room code');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select public.admin_merge_end('00000000-0000-0000-0000-000000000010');
-- 🛰️ סטטוס איסוף המחירים: רק השרת כותב, רק מנהל רואה
reset role;
insert into public.collector_status(chain, name, error) values ('SHUFERSAL', 'שופרסל', 'בדיקה') on conflict (chain) do nothing;
set role authenticated;
select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok((select count(*) from public.collector_status) = 0, '🛰️ regular users cannot see the collector status');
select tst.err($$insert into public.collector_status(chain) values ('X')$$, '🛰️ regular users cannot write the collector status');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select count(*) from public.collector_status) = 1, '🛰️ owner sees the collector status in the back office');
select tst.err($$update public.collector_status set error = '' where chain = 'SHUFERSAL'$$, '🛰️ even the owner cannot fake the status (server only)');
reset role;
-- 🔎 סטטיסטיקת חיפושי מחירים
reset role; set role anon; select tst.as_user('');
select public.price_search_log('11111111-1111-4111-8111-111111111111', 'city', 'site', 'בני ברק', array['  חלב ', '<b>לחם</b>', '']);
select public.price_search_log(null, 'city', 'site', '', array['חלב']);
select tst.err($$select * from public.price_searches$$, '🔎 anon cannot read price searches');
select tst.err($$select public.admin_price_search_stats(30, false)$$, '🔎 anon cannot call the search stats');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select public.price_search_log('22222222-2222-4222-8222-222222222222', 'bogus', 'yami', 'x', array['חלב']);
select tst.err($$select * from public.price_searches$$, '🔎 a regular user cannot read price searches');
select tst.ok(public.admin_price_search_stats(30, false) is null, '🔎 a regular user gets no search stats');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select public.price_search_log(null, 'near', 'site', '', array['במבה']);
reset role;
select tst.ok((select count(*) from public.price_searches) = 3, '🔎 a guest without a device id is not logged');
select tst.ok((select items = array['חלב','bלחם/b'] from public.price_searches where city = 'בני ברק'), '🔎 items are trimmed, cleaned and empty ones dropped');
select tst.ok((select guest is null and mode = '' and src = 'yami' from public.price_searches where user_id = '00000000-0000-0000-0000-00000000000a'), '🔎 a signed-in search keeps no device id, and a bad mode is dropped');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((public.admin_price_search_stats(30, false)->>'total')::int = 2, '🔎 team searches are left out by default');
select tst.ok((public.admin_price_search_stats(30, true)->>'total')::int = 3, '🔎 team searches can be included');
select tst.ok((select (x->>'n')::int = 2 and (x->>'people')::int = 2 from jsonb_array_elements(public.admin_price_search_stats(30, false)->'top') x where x->>'q' = 'חלב'), '🔎 milk is the top search, by 2 people');
select tst.ok((public.admin_price_search_stats(30, false)->>'guests')::int = 1 and (public.admin_price_search_stats(30, false)->>'users')::int = 1, '🔎 one guest and one signed-in user');
reset role;
delete from public.price_searches;
-- 📱/🌐 site or Android app: touch_presence remembers which one, only the owner/admin sees it
insert into public.auth_events(kind, email, user_id, ua) values
  ('signup', 'b@x.com', '00000000-0000-0000-0000-00000000000b', 'Mozilla/5.0 (Linux; Android 14; wv) Chrome/120 Mobile YamShoppingApp/1.0'),
  ('login', 'c@x.com', '00000000-0000-0000-0000-00000000000c', 'Mozilla/5.0 (Windows NT 10.0) Chrome/120');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select public.touch_presence('Alice', true);
select public.touch_presence('Alice', false);
select public.touch_presence('Alice');
select tst.err($$select * from public.admin_user_platforms()$$, '📱 a regular user cannot see who uses the app');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select app_at is not null and web_at is not null from public.admin_user_platforms() where user_id = '00000000-0000-0000-0000-00000000000a'), '📱 Alice used both the app and the site');
select tst.ok((select app_at is not null and web_at is null and signup_from = 'app' from public.admin_user_platforms() where user_id = '00000000-0000-0000-0000-00000000000b'), '📱 Bob signed up from the app (security log)');
select tst.ok((select app_at is null and web_at is not null and signup_from = '' from public.admin_user_platforms() where user_id = '00000000-0000-0000-0000-00000000000c'), '🌐 Carol signed in from the site');
reset role;
set role anon; select tst.as_user('');
select tst.err($$select public.touch_presence('x', true)$$, '📱 a guest cannot call touch_presence');
reset role;
-- 🕵️ ניטור העתקה
insert into public.scrape_watch(day, ip, n, score, reasons, updated_at, stores, queries, ua, geo, accounts) values
  (current_date, '203.0.113.9', 4000, 5, array['bot','stores'], now(), 186, 300, 'python-requests/2.32',
   '{"country":"הולנד","city":"Amsterdam","org":"M247 Europe SRL","hosting":true}', '[{"how":"login","email":"spy@x.com","name":"מעתיק"},{"how":"site","email":"maybe@x.com"}]'),
  (current_date, '*', 4100, 0, '{}', now(), 0, 0, '', '{}', '[]');
insert into public.scrape_watch(day, ip, n, score, own, updated_at) values (current_date, '84.13.86.86', 900, 0, true, now());
insert into public.site_config(key, value) values ('scrape', '{"blocked":[{"ip":"203.0.113.9"}]}') on conflict (key) do update set value = excluded.value;
reset role; set role anon; select tst.as_user('');
select tst.ok((select count(*) from public.scrape_watch) = 0, '🕵️ anon cannot see who is scraping');
select tst.ok((select count(*) from public.site_config where key = 'scrape') = 0, '🕵️ anon cannot see the blocked addresses');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok((select count(*) from public.scrape_watch) = 0, '🕵️ a regular user cannot see who is scraping');
select tst.ok((select count(*) from public.site_config where key = 'scrape') = 0, '🕵️ a regular user cannot see the blocked addresses');
select tst.err($$insert into public.scrape_watch(day, ip) values (current_date, '1.1.1.1')$$, '🕵️ a regular user cannot write to the scrape log');
select tst.err($$insert into public.site_config(key, value) values ('scrape', '{"blocked":[]}') on conflict (key) do update set value = excluded.value$$, '🕵️ a regular user cannot change the blocked list');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select count(*) from public.scrape_watch) = 3, '🕵️ the owner sees the scrape log');
select tst.ok(exists (select 1 from public.staff_events(null) e where e.kind = 'scrape' and e.title like '%203.0.113.9%' and e.who = 'spy@x.com'
  and e.detail like '%Amsterdam, הולנד%' and e.detail like '%M247%' and e.detail like '%שרת בענן או VPN%' and e.detail like '%186 סניפים%'), '🕵️ the owner gets a staff-extension alert with location, provider and the account email');
select tst.ok(not exists (select 1 from public.staff_events(null) e where e.kind = 'scrape' and e.title like '%84.13.86.86%'), '🕵️ our own server never shows up as a scraper');
select tst.ok((select count(*) from public.site_config where key = 'scrape') = 1, '🕵️ the owner sees the blocked list');
select tst.err($$update public.scrape_watch set score = 0$$, '🕵️ even the owner cannot fake the scrape log (server only)');
reset role;
select public.admin_alerts_check();
select tst.ok(exists (select 1 from public.admin_alerts_sent where kind = 'scrape:203.0.113.9'), '🕵️ a scraper sends the admins an alert, one per address');
select tst.ok(not exists (select 1 from public.admin_alerts_sent where kind = 'scrape:84.13.86.86'), '🕵️ no alert about our own server');
select tst.ok((select flagged_at is not null from public.scrape_watch where ip = '203.0.113.9') and (select flagged_at is null from public.scrape_watch where ip = '84.13.86.86'), '🕵️ flagged_at is set once an address becomes suspicious');
update public.scrape_watch set n = 5000 where ip = '203.0.113.9';
select tst.ok((select flagged_at < now() + interval '1 second' from public.scrape_watch where ip = '203.0.113.9'), '🕵️ flagged_at stays when the row is updated');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok(not exists (select 1 from public.staff_events(null) e where e.kind = 'scrape'), '🕵️ a moderator does not see scraper alerts (admins only)');
reset role;
delete from public.scrape_watch; delete from public.admin_alerts_sent; delete from public.site_config where key = 'scrape';
-- secondary_limit: only the room functions call it — nobody can ask about another user's limit
set role anon;
select tst.err($$select public.secondary_limit('00000000-0000-0000-0000-00000000000b')$$, 'secondary_limit not callable by visitors');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.err($$select public.secondary_limit('00000000-0000-0000-0000-00000000000b')$$, 'secondary_limit not callable by users');
select tst.ok(public.room_members_list() ? 'limit', 'room functions still read the limit (they call secondary_limit inside)');
reset role;
-- 🤖 who downloads the Android app: anyone can log a download, only staff see the list, IP only for admins
set role anon; select tst.as_user('');
select set_config('request.headers', '{"cf-connecting-ip":"198.51.100.7","cf-ipcountry":"IL","x-forwarded-for":"6.6.6.6, 198.51.100.7"}', false);
select tst.ok(public.apk_log('download', 'login', 'טלפון · Android · Chrome', '11111111-1111-4111-8111-111111111111'), '🤖 a guest download is logged');
select tst.ok(not public.apk_log('download', 'login', '', '11111111-1111-4111-8111-111111111111'), '🤖 the same phone clicking again within 10 minutes is not counted twice');
select tst.ok(not public.apk_log('hack', '', '', ''), '🤖 an unknown kind is refused');
select tst.err($$select count(*) from public.apk_downloads$$, '🤖 anon cannot read the downloads table');
select tst.err($$select * from public.staff_apk_downloads(30)$$, '🤖 a guest cannot see who downloaded');
reset role;
select tst.ok((select ip = '198.51.100.7' and country = 'IL' and src = 'login' from public.apk_downloads where kind = 'download'), '🤖 the real IP (Cloudflare) and country are saved, not the spoofable first x-forwarded-for');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select set_config('request.headers', '{"cf-connecting-ip":"198.51.100.8"}', false);
select tst.ok(public.apk_log('open', '', 'טלפון · Android', '22222222-2222-4222-8222-222222222222', '1.1'), '🤖 the app logs its first open');
select tst.ok(not public.apk_log('open', '', '', '22222222-2222-4222-8222-222222222222', '1.1'), '🤖 the first open is logged once per phone');
select tst.err($$select * from public.staff_apk_downloads(30)$$, '🤖 a regular user cannot see who downloaded');
select tst.err($$update public.apk_downloads set ip = ''$$, '🤖 a user cannot change the downloads log');
set role anon; select tst.as_user('');
select tst.err($$select public.apk_claim('11111111-1111-4111-8111-111111111111')$$, '🤖 a guest cannot claim downloads');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000b');
select public.apk_claim('11111111-1111-4111-8111-111111111111');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select count(*) from public.staff_apk_downloads(30)) = 2, '🤖 the owner sees the download and the first open');
select tst.ok((select user_id = '00000000-0000-0000-0000-00000000000b' and ip = '198.51.100.7' and email = 'b@x.com' from public.staff_apk_downloads(30) where kind = 'download'), '🤖 after signing in, the guest download shows who it was, with IP and email');
select tst.ok((select user_id = '00000000-0000-0000-0000-00000000000a' and app_ver = '1.1' from public.staff_apk_downloads(30) where kind = 'open'), '🤖 the first open shows the signed-in user and app version');
select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok((select count(*) = 2 and bool_and(ip = '') and bool_and(email = '') from public.staff_apk_downloads(30)), '🤖 a moderator sees the downloads without IP or email');
set role anon; select tst.as_user('');
select tst.ok(public.app_update_fail('33333333-3333-4333-8333-333333333333', '2.0', '2.1', 'http_418<script>', 'wifi', 'Xiaomi 22'), '⚠️ a failed app update is reported, also by a guest');
select tst.err($$select count(*) from public.app_update_errors$$, '⚠️ anon cannot read the failed updates table');
select tst.err($$select * from public.staff_app_update_errors(30)$$, '⚠️ a guest cannot see failed updates');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.err($$select * from public.staff_app_update_errors(30)$$, '⚠️ a regular user cannot see failed updates');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select count(*) = 1 and bool_and(err = 'http_418script' and net = 'wifi' and target_ver = '2.1') from public.staff_app_update_errors(30)), '⚠️ the owner sees the failed update, cleaned of odd characters');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select via = 'other' from public.staff_apk_downloads(30) where kind = 'open'), '🔗 an install with no download click on our site before it is marked "from elsewhere"');
-- 📱 app usage from anywhere: one row per phone per day
set role anon; select tst.as_user('');
select tst.ok(public.apk_ping('22222222-2222-4222-8222-222222222222', '1.0', 'טלפון · Android'), '📱 the app reports a day of use (any version, from anywhere)');
select tst.ok(public.apk_ping('22222222-2222-4222-8222-222222222222', '1.0', 'טלפון · Android'), '📱 a second open the same day is counted on the same row');
select tst.ok(not public.apk_ping('not-a-device', '', ''), '📱 a bad device id is refused');
select tst.err($$select count(*) from public.apk_active$$, '📱 anon cannot read the app usage table');
select tst.err($$select * from public.staff_apk_activity(30)$$, '📱 a guest cannot see who uses the app');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.err($$select * from public.staff_apk_activity(30)$$, '📱 a regular user cannot see who uses the app');
select tst.err($$update public.apk_active set hits = 0$$, '📱 a user cannot change the usage log');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select count(*) = 1 from public.staff_apk_activity(30)), '📱 the owner sees the phone that uses the app');
select tst.ok((select user_id = '00000000-0000-0000-0000-00000000000a' and opens = 2 and days_used = 1 and app_ver = '1.0' and via = 'other' and email = 'a@x.com'
                 from public.staff_apk_activity(30)), '📱 the usage row shows who (from the first open), how often, version and that it came from elsewhere');
select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok((select bool_and(email = '') from public.staff_apk_activity(30)), '📱 a moderator sees app usage without emails');
reset role;
insert into public.apk_downloads(kind, at, ip, dev) values ('download', now() - interval '1 hour', '198.51.100.8', '');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select via = 'site' from public.staff_apk_downloads(30) where kind = 'open'), '🌐 an install right after a download click from the same network is marked "from our site"');
select tst.ok((select via = 'site' from public.staff_apk_activity(30)), '🌐 the usage list also shows it came from our site');
select tst.ok((select jsonb_array_length(vers) = 1 and vers->0->>'v' = '1.0' from public.staff_apk_activity(30)), '🔄 a phone that never updated shows one version');
set role anon; select tst.as_user('');
select tst.ok(public.apk_ping('22222222-2222-4222-8222-222222222222', '1.5', 'טלפון · Android'), '🔄 after an update (even from inside the app) the new version is reported');
select tst.ok(public.apk_ping('22222222-2222-4222-8222-222222222222', '1..x', 'טלפון · Android'), '🔄 a broken version string does not break the report');
select tst.err($$select count(*) from public.apk_versions$$, '🔄 anon cannot read the version history');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.err($$select count(*) from public.apk_versions$$, '🔄 a user cannot read the version history');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select app_ver = '1.5' and jsonb_array_length(vers) = 2 and vers->0->>'v' = '1.0' and vers->1->>'v' = '1.5' from public.staff_apk_activity(30)),
              '🔄 the owner sees the phone updated from 1.0 to 1.5');
-- 🔁 uninstall + reinstall on the same phone (no hardware id: same account + same phone model, the old install stopped first)
reset role;
delete from public.apk_downloads; delete from public.apk_active; delete from public.apk_versions;
insert into public.apk_active(day, dev, user_id, device, last_at)
  values (((now() at time zone 'Asia/Jerusalem')::date - 10), '33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-00000000000a', 'טלפון · Android · SM-A525F', now() - interval '10 days');
insert into public.apk_downloads(kind, at, dev, user_id, ip) values ('open', now() - interval '12 days', '33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-00000000000a', '198.51.100.9');
select set_config('request.headers', '{"cf-connecting-ip":"198.51.100.9"}', false);
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(public.apk_log('open', '', 'טלפון · Android · SM-A525F', '44444444-4444-4444-8444-444444444444', '2.1'), '🔁 the reinstalled app logs a new first open');
select tst.ok(public.apk_ping('44444444-4444-4444-8444-444444444444', '2.1', 'טלפון · Android · SM-A525F'), '🔁 the reinstalled app reports use');
set role anon; select tst.as_user('');
select tst.ok(public.apk_log('open', '', 'טלפון · Android · Pixel 7', '66666666-6666-4666-8666-666666666666', '2.1'), '🔁 another phone (other model) on the same network opens the app');
select tst.ok(public.apk_ping('66666666-6666-4666-8666-666666666666', '2.1', 'טלפון · Android · Pixel 7'), '🔁 the other phone reports use');
-- 🟢 the open app keeps "last seen" fresh, without counting extra opens
select tst.ok(public.apk_seen('66666666-6666-4666-8666-666666666666'), '🟢 an open app updates its last-seen time');
select tst.ok(not public.apk_seen('55555555-5555-4555-8555-555555555555'), '🟢 a phone with no use today is told to send a full ping');
select tst.ok(not public.apk_seen('not-a-device'), '🟢 a bad device id is refused');
select tst.err($$select count(*) from public.apk_active$$, '🟢 anon still cannot read the usage table');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select prev_at is not null and prev_sure from public.staff_apk_activity(30) where user_id = '00000000-0000-0000-0000-00000000000a' and app_ver = '2.1'),
              '🔁 the new install shows it is a reinstall on the same phone (same account and model)');
select tst.ok((select next_at is not null and next_sure from public.staff_apk_activity(30) where first_day < (now() at time zone 'Asia/Jerusalem')::date),
              '🔁 the old install shows it was removed and installed again');
select tst.ok((select prev_at is null and next_at is null from public.staff_apk_activity(30) where device like '%Pixel 7'),
              '🔁 a different phone model on the same network is not mistaken for a reinstall');
select tst.ok((select opens = 1 from public.staff_apk_activity(30) where device like '%Pixel 7'), '🟢 last-seen updates do not add opens');
reset role;
delete from public.apk_downloads; select set_config('request.headers', '', false);
delete from public.apk_active; delete from public.apk_versions;
-- ======== 📧 weekly email ========
reset role;
set role anon; select tst.as_user('');
select tst.err($$select count(*) from public.email_sends$$, '📧 anon cannot read who got the email');
select tst.err($$select public.email_weekly_set(false)$$, '📧 anon cannot change email settings');
select tst.err($$select * from public.email_pick('00000000-0000-0000-0000-000000000000', 10)$$, '📧 anon cannot list recipients');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(public.email_weekly_get(), '📧 the weekly email is on by default');
select tst.ok(public.email_consent_state() = 'ask', '📧 a user who was never asked gets the question once');
select tst.ok(not public.email_weekly_set(false), '📧 a user turns the weekly email off');
select tst.ok(not public.email_weekly_get(), '📧 the weekly email stays off');
select tst.ok((select count(*) from public.email_sends) = 0 and (select count(*) from public.email_subs) = 0, '📧 a user cannot read the email tables');
select tst.err($$insert into public.email_campaigns(subject) values ('x')$$, '📧 a user cannot create an email');
select tst.err($$select * from public.email_pick('00000000-0000-0000-0000-000000000000', 10)$$, '📧 a user cannot list recipients');
select tst.err($$select public.email_counts()$$, '📧 a user cannot call email_counts');
select tst.err($$select public.email_admin_push('a','b')$$, '📧 a user cannot push to admins');
select tst.err($$select public.email_poke()$$, '📧 a user cannot poke the email function');
select tst.err($$select * from public.email_recipients('00000000-0000-0000-0000-000000000000')$$, '📧 a user cannot see recipients');
select tst.err($$select * from public.email_unsubs()$$, '📧 a user cannot see who unsubscribed');
select tst.err($$select * from public.email_campaign_stats()$$, '📧 a user cannot see email stats');
select tst.err($$select * from public.email_daily()$$, '📧 a user cannot see the daily email report');
select tst.err($$select public.email_left('00000000-0000-0000-0000-000000000000')$$, '📧 a user cannot count who is left');
select tst.err($$select public.email_cron_info()$$, '📧 a user cannot see the cron info');
select tst.err($$select * from public.email_day_recipients(current_date)$$, '📧 a user cannot see who got the email on a day');
update public.email_subs set weekly = true, status = 'ok';
reset role;
select tst.ok(not (select weekly from public.email_subs where user_id = '00000000-0000-0000-0000-00000000000a'), '📧 a user cannot write the subs table directly');
set role authenticated;
select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok((select count(*) from public.email_campaigns) = 0, '📧 a moderator does not see the emails');
select tst.err($$select * from public.email_unsubs()$$, '📧 a moderator cannot see who unsubscribed');
select tst.as_user('00000000-0000-0000-0000-000000000001');
insert into public.email_campaigns(subject, items) values ('בדיקה', '[{"title":"a"}]');
select tst.ok((select count(*) from public.email_campaigns) = 1, '📧 the owner creates an email');
select tst.err($$insert into public.email_campaigns(subject, status) values ('x', 'sending'); insert into public.email_campaigns(subject, status) values ('y', 'sending')$$, '📧 only one email is sending at a time');
select tst.ok((select count(*) from public.email_unsubs() where email = 'a@x.com' and unsub_how = 'site') = 1, '📧 the owner sees who unsubscribed and how');
reset role;
select tst.ok(not exists (select 1 from public.email_pick((select id from public.email_campaigns limit 1), 100) where email in ('a@x.com', 'unconf@x.com')), '📧 unsubscribed and unconfirmed users get no email');
select tst.ok((select count(*) from public.email_pick((select id from public.email_campaigns limit 1), 100) where email = 'b@x.com') = 1, '📧 a confirmed user gets the email');
insert into public.email_sends(campaign_id, user_id, email, status) select id, '00000000-0000-0000-0000-00000000000b', 'b@x.com', 'sent' from public.email_campaigns limit 1;
select tst.ok((select count(*) from public.email_pick((select id from public.email_campaigns limit 1), 100) where email = 'b@x.com') = 0, '📧 nobody gets the same email twice');
insert into public.email_campaigns(subject) values ('שני');
select tst.ok((select count(*) from public.email_pick((select id from public.email_campaigns where subject = 'שני'), 100) where email = 'b@x.com') = 0, '📧 at most one email a week per user');
select tst.ok((select count(*) from public.email_pick((select id from public.email_campaigns where subject = 'שני'), 100, false) where email = 'b@x.com') = 1, '📧 the next email reaches them after the week');
update public.profiles set last_seen = now() - interval '90 days' where id = '00000000-0000-0000-0000-00000000000c';
select tst.ok((select email from public.email_pick((select id from public.email_campaigns where subject = 'שני'), 1, true, 'inactive')) = 'c@x.com', '📧 "least active first" picks who has not visited the longest');
update public.profiles set last_seen = now() + interval '1 minute' where id = '00000000-0000-0000-0000-00000000000d';
select tst.ok((select email from public.email_pick((select id from public.email_campaigns where subject = 'שני'), 1, true, 'active')) = 'd@x.com', '📧 "most active first" picks the most recent visitor');
update public.profiles set last_seen = now() - interval '200 days' where id = '00000000-0000-0000-0000-00000000000b';
select tst.ok((select count(*) from public.email_pick((select id from public.email_campaigns where subject = 'שני'), 100, true, 'inactive')) = 0, '📧 strict order: the least active got another email this week, so it waits instead of skipping ahead');
select tst.ok((select count(*) from public.email_pick((select id from public.email_campaigns where subject = 'שני'), 100, true, 'fair')) >= 1, '📧 fair order still skips who got an email this week');
select tst.ok((select email from public.email_pick((select id from public.email_campaigns where subject = 'שני'), 1, false, 'inactive')) = 'b@x.com', '📧 after the week the least active is first again');
select tst.ok((public.email_counts()->>'today')::int = 1, '📧 the daily count includes what was sent today');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select sum(sent) from public.email_daily() where day = (now() at time zone 'Asia/Jerusalem')::date) = 1, '📧 the daily report shows today''s email');
select tst.ok((select count(*) from public.email_day_recipients((now() at time zone 'Asia/Jerusalem')::date) where email = 'b@x.com' and subject = 'בדיקה') = 1, '📧 the owner sees who got the email today');
select tst.ok((select count(*) from public.email_day_recipients((now() at time zone 'Asia/Jerusalem')::date - 1)) = 0, '📧 yesterday is a separate day');
select tst.ok((public.email_left((select id from public.email_campaigns where subject = 'בדיקה'))->>'ready')::int >= 1, '📧 the owner sees how many are left');
select tst.ok(public.email_cron_info() ? 'cron', '📧 the owner sees whether the cron runs');
reset role;
delete from public.email_sends; delete from public.email_campaigns; delete from public.email_subs;
insert into auth.users(email, raw_user_meta_data) values ('wk1@x.com', jsonb_build_object('weekly_ok', 'true', 'guard', encode(extensions.hmac('wk1@x.com', (select pepper from public.auth_secret where id = 1), 'sha256'), 'hex')));
insert into auth.users(email, raw_user_meta_data) values ('wk2@x.com', jsonb_build_object('weekly_ok', 'false', 'guard', encode(extensions.hmac('wk2@x.com', (select pepper from public.auth_secret where id = 1), 'sha256'), 'hex')));
select tst.ok((select consent_how = 'signup' and weekly from public.email_subs s join auth.users u on u.id = s.user_id where u.email = 'wk1@x.com'), '📧 sign-up box checked: gets the email');
select tst.ok((select not weekly and unsub_how = 'signup' from public.email_subs s join auth.users u on u.id = s.user_id where u.email = 'wk2@x.com'), '📧 sign-up box not checked: no email');
delete from auth.users where email in ('wk1@x.com', 'wk2@x.com');
-- admin functions: a visitor who is not signed in cannot even call them
set role anon; select tst.as_user('');
select tst.err($$select public.staff_add('x@x.com', 'admin')$$, '🛡️ anon cannot call staff_add');
select tst.err($$select public.staff_remove('00000000-0000-0000-0000-000000000002')$$, '🛡️ anon cannot call staff_remove');
select tst.err($$select * from public.backup_rooms()$$, '🛡️ anon cannot call backup_rooms');
select tst.err($$select public.restore_room('X', '00000000-0000-0000-0000-000000000001', '{}')$$, '🛡️ anon cannot call restore_room');
select tst.err($$select public.rep_bonus_add('00000000-0000-0000-0000-00000000000a', 5)$$, '🛡️ anon cannot call rep_bonus_add');
reset role;
-- 🙋 manual login approval: requests are written only by auth-guard; only admins read them
reset role;
insert into public.login_requests(secret_hash, code, name, email) values ('h', '1234', 'Moshe', 'm@x.com');
set role anon;
select tst.err($$select * from public.login_requests$$, '🙋 a visitor cannot see login requests');
select tst.err($$insert into public.login_requests(secret_hash, code, name) values ('h', '1', 'x')$$, '🙋 a visitor cannot create a login request directly');
set role authenticated;
select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok((select count(*) from public.login_requests) = 0, '🙋 a regular user cannot see login requests');
select tst.err($$update public.login_requests set status = 'approved', user_id = '00000000-0000-0000-0000-00000000000a'$$, '🙋 a user cannot approve a login request');
select tst.err($$select public.login_request_push('x', '1')$$, '🙋 a user cannot send the admin login-request alert');
select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok((select count(*) from public.login_requests) = 0, '🙋 a moderator cannot see login requests');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select count(*) from public.login_requests) = 1, '🙋 the owner sees login requests');
select tst.err($$update public.login_requests set status = 'approved'$$, '🙋 even the owner approves only through auth-guard');
reset role;
insert into auth.users(email, email_confirmed_at, raw_user_meta_data) values ('moshe@nomail.yamshopping.com', now(), jsonb_build_object('guard', encode(extensions.hmac('moshe@nomail.yamshopping.com', (select pepper from public.auth_secret where id = 1), 'sha256'), 'hex')));
insert into public.email_campaigns(subject) values ('nomail');
select tst.ok(not exists (select 1 from public.email_pick((select id from public.email_campaigns where subject = 'nomail'), 1000, false) where email like '%@nomail.yamshopping.com'), '🙋 accounts without email get no weekly email');
delete from public.email_campaigns where subject = 'nomail'; delete from public.login_requests;
-- 🤖 following Android app updates: only through the functions, each user only their own row
set role anon; select tst.as_user('');
select tst.err($$select public.app_follow_set(true, '1.2')$$, '🤖 a guest cannot follow app updates');
select tst.err($$select count(*) from public.app_follows$$, '🤖 anon cannot read who follows');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(public.app_follow_set(true, '1.2'), '🤖 a user follows app updates');
select tst.ok(public.app_follow_get() = '{"on": true, "ver": "1.2"}'::jsonb, '🤖 the user sees they follow, and from which version');
select tst.err($$select count(*) from public.app_follows$$, '🤖 a user cannot read the follows table');
select tst.err($$select * from public.app_follow_pick('1.3', 10)$$, '🤖 a user cannot list followers and their emails');
select tst.err($$select public.app_follow_count()$$, '🤖 a regular user cannot see the follower count');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok(public.app_follow_get() ->> 'on' = 'false', '🤖 another user does not follow');
select public.app_follow_set(true, '1.3');
select tst.ok(not public.app_follow_set(false), '🤖 a user can stop following');
select tst.ok(public.app_follow_get() ->> 'on' = 'false', '🤖 after stopping, not following');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok(public.app_follow_count() = 1, '🤖 the owner sees how many follow');
reset role;
select tst.ok((select count(*) from public.app_follow_pick('1.3', 10)) = 1, '🤖 the server finds the follower for a new version');
select tst.ok((select count(*) from public.app_follow_pick('1.2', 10)) = 0, '🤖 nobody is emailed about the version they started following on');
-- 💬 staff messages on the phone (app 1.8): only the phone's secret token reads/replies, only for its own account
reset role;
delete from public.support_messages where user_id = '00000000-0000-0000-0000-00000000000a';
insert into public.support_messages(user_id, from_staff, body, read_by_user) values ('00000000-0000-0000-0000-00000000000a', true, 'hello from the team', false);
set role anon; select tst.as_user('');
select tst.err($$select public.app_device_register(repeat('a', 48))$$, '💬 a guest cannot link a phone to an account');
select tst.err($$select count(*) from public.app_devices$$, '💬 anon cannot read the phone tokens');
select tst.ok((select count(*) from public.app_inbox(repeat('a', 48))) = 0, '💬 an unknown token sees no messages');
select tst.ok(public.app_inbox_reply(repeat('a', 48), 'hi') = 'unknown', '💬 an unknown token cannot reply');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(public.app_device_register('not-a-token') = 'bad', '💬 a malformed token is refused');
select tst.ok(public.app_device_register(repeat('a', 48)) = 'ok', '💬 a user links their phone');
select tst.err($$select count(*) from public.app_devices$$, '💬 a user cannot read the phone tokens table');
set role anon; select tst.as_user('');
select tst.ok((select count(*) from public.app_inbox(repeat('a', 48))) = 1, '💬 the linked phone sees the unread staff message');
select tst.ok((select count(*) from public.app_inbox(repeat('b', 48))) = 0, '💬 another phone sees nothing');
select tst.ok(public.app_inbox_reply(repeat('a', 48), 'thanks!') = 'ok', '💬 reply from the notification');
select tst.ok((select count(*) from public.app_inbox(repeat('a', 48))) = 0, '💬 after replying the messages are read');
reset role;
select tst.ok(exists (select 1 from public.support_messages where user_id = '00000000-0000-0000-0000-00000000000a' and not from_staff and body = 'thanks!' and not read_by_staff), '💬 the reply reaches the staff chat as the user');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok(public.app_device_register(repeat('a', 48)) = 'ok', '💬 another account signing in on the same phone takes it over');
set role anon; select tst.as_user('');
select public.app_device_forget(repeat('a', 48));
select tst.ok(public.app_inbox_reply(repeat('a', 48), 'x') = 'unknown', '💬 after logout the phone is unlinked');
reset role; delete from public.support_messages where user_id = '00000000-0000-0000-0000-00000000000a';
-- 🚀 app releases by user (app 1.9): only staff manage, each phone learns only what is for it
reset role; delete from public.app_releases;
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.err($$insert into public.app_releases(version, audience) values ('9.9', 'all')$$, '🚀 a regular user cannot release an app version');
select tst.ok(public.app_device_register(repeat('c', 48)) = 'ok', '🚀 user a links a phone');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok(public.app_device_register(repeat('d', 48)) = 'ok', '🚀 user b links a phone');
set role anon; select tst.as_user('');
select tst.err($$select count(*) from public.app_releases$$, '🚀 anon cannot read the releases table');
select tst.ok(public.app_release_for(repeat('c', 48)) = '{"offer": null, "block": []}'::jsonb, '🚀 with no releases nothing is offered or blocked');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
insert into public.app_releases(version, audience, users, notes) values ('2.0', 'only', array['00000000-0000-0000-0000-00000000000a']::uuid[], 'test');
select tst.err($$insert into public.app_releases(version) values ('1.x; drop')$$, '🚀 a malformed version is refused');
set role anon; select tst.as_user('');
select tst.ok(public.app_release_for(repeat('c', 48)) -> 'offer' ->> 'version' = '2.0', '🚀 a release only to user a reaches user a');
select tst.ok(public.app_release_for(repeat('c', 48)) -> 'offer' ->> 'url' = '/download/yamshopping-2.0.apk', '🚀 the offer points to that version''s file');
select tst.ok(public.app_release_for(repeat('d', 48)) = '{"offer": null, "block": ["2.0"]}'::jsonb, '🚀 user b does not get it, and is told to skip it');
select tst.ok(public.app_release_for(repeat('e', 48)) -> 'block' = '["2.0"]'::jsonb, '🚀 a phone without an account does not get a release for specific users');
select tst.ok(public.app_release_for(null) -> 'offer' = 'null'::jsonb, '🚀 no token is like a guest');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
insert into public.app_releases(version, audience, users) values ('2.1', 'except', array['00000000-0000-0000-0000-00000000000b']::uuid[]);
set role anon; select tst.as_user('');
select tst.ok(public.app_release_for(repeat('c', 48)) -> 'offer' ->> 'version' = '2.1', '🚀 "everyone except" reaches user a');
select tst.ok(public.app_release_for(repeat('e', 48)) -> 'offer' ->> 'version' = '2.1', '🚀 "everyone except" reaches a phone without an account');
select tst.ok(public.app_release_for(repeat('d', 48)) -> 'block' = '["2.0", "2.1"]'::jsonb and public.app_release_for(repeat('d', 48)) -> 'offer' = 'null'::jsonb, '🚀 the excluded user gets neither');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
update public.app_releases set active = false where version = '2.1';
set role anon; select tst.as_user('');
select tst.ok(public.app_release_for(repeat('d', 48)) -> 'block' = '["2.0"]'::jsonb, '🚀 a stopped release no longer blocks anyone');
reset role; delete from public.app_releases;
delete from public.app_devices where token in (repeat('c', 48), repeat('d', 48));
-- 📲 notices from the back office to phones (app 1.9): only staff send, each phone gets only what is for it, with its user's name
reset role; delete from public.app_notices;
update public.profiles set name = 'משה' where id = '00000000-0000-0000-0000-00000000000a';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.err($$insert into public.app_notices(title) values ('x')$$, '📲 a regular user cannot send phone notices');
select public.app_device_register(repeat('c', 48));
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select public.app_device_register(repeat('d', 48));
set role anon; select tst.as_user('');
select tst.err($$select count(*) from public.app_notices$$, '📲 anon cannot read the notices table');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
insert into public.app_notices(title, body, audience, users) values ('{שם}, המבצעים נגמרים', 'עוד שעה', 'only', array['00000000-0000-0000-0000-00000000000a']::uuid[]);
select tst.err($$insert into public.app_notices(title, url) values ('x', 'https://evil.example')$$, '📲 a link outside the site is refused');
set role anon; select tst.as_user('');
select tst.ok((select title from public.app_notices_for(repeat('c', 48), now() - interval '1 minute')) = 'משה, המבצעים נגמרים', '📲 a notice only to user a reaches them, with their name');
select tst.ok((select count(*) from public.app_notices_for(repeat('d', 48), now() - interval '1 minute')) = 0, '📲 user b does not get it');
select tst.ok((select count(*) from public.app_notices_for(repeat('e', 48), now() - interval '1 minute')) = 0, '📲 a phone without an account does not get it');
select tst.ok((select count(*) from public.app_notices_for(repeat('c', 48), now() - interval '1 minute')) = 0, '📲 a notice already shown is not shown again');
select tst.ok((select count(*) from public.app_notices_for(repeat('f', 48), now() + interval '1 hour')) = 0, '📲 (guest phone sees nothing of a notice for user a)');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
insert into public.app_notices(title, audience, users) values ('{שם}, יש מבצע חדש', 'except', array['00000000-0000-0000-0000-00000000000a']::uuid[]);
set role anon; select tst.as_user('');
select tst.ok((select count(*) from public.app_notices_for(repeat('c', 48), now() - interval '1 minute')) = 0, '📲 the excluded user does not get it');
select tst.ok((select title from public.app_notices_for(repeat('e', 48), now() + interval '1 hour')) = 'יש מבצע חדש', '📲 a phone that checks after the notice was sent (e.g. just updated to 1.9) still gets it, without a name the {שם} is dropped');
select tst.err($$select count(*) from public.app_notice_hits$$, '📲 anon cannot read who received what');
select tst.err($$select * from public.app_notice_counts()$$, '📲 anon cannot see delivery counts');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select sum(phones) from public.app_notice_counts()) = 2, '📲 the owner sees how many phones got the notices');
set role anon; select tst.as_user('');
reset role; delete from public.app_notices;
delete from public.app_devices where token in (repeat('c', 48), repeat('d', 48));
-- 📷 product photos by barcode: users submit (pending), only admins approve, everyone sees only approved, one approved per barcode
reset role; delete from public.product_photos;
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.product_photos(barcode, name, image, status) values ('7290004131074', 'חלב', 'data:image/jpeg;base64,AAAA', 'approved');
select tst.ok((select status from public.product_photos where barcode = '7290004131074') = 'pending', '📷 a user photo always waits for approval, even if sent as approved');
select tst.err($$insert into public.product_photos(barcode, image) values ('123', 'data:image/jpeg;base64,AAAA')$$, '📷 a bad barcode is refused');
select tst.err($$insert into public.product_photos(barcode, image) values ('7290004131074', 'data:text/html;base64,AAAA')$$, '📷 only JPEG data is accepted');
insert into public.product_photos(barcode, image, by_id) values ('7290000066318', 'data:image/jpeg;base64,AAAA', '00000000-0000-0000-0000-00000000000b');
select tst.ok((select by_id from public.product_photos where barcode = '7290000066318') = '00000000-0000-0000-0000-00000000000a', '📷 a photo sent in someone else''s name is saved under the sender');
delete from public.product_photos where barcode = '7290000066318';
update public.product_photos set status = 'approved';
select tst.ok((select status from public.product_photos where barcode = '7290004131074') = 'pending', '📷 a user cannot approve their own photo');
select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok((select count(*) from public.product_photos) = 0, '📷 another user does not see a pending photo');
set role anon; select tst.as_user('');
select tst.ok((select count(*) from public.product_photos) = 0, '📷 anon does not see a pending photo');
select tst.err($$insert into public.product_photos(barcode, image) values ('7290004131074', 'data:image/jpeg;base64,AAAA')$$, '📷 anon cannot submit');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-000000000002');
update public.product_photos set status = 'approved';
select tst.ok((select count(*) from public.product_photos where status = 'approved') = 0, '📷 a moderator cannot approve (admins only)');
select tst.as_user('00000000-0000-0000-0000-000000000001');
update public.product_photos set status = 'approved' where barcode = '7290004131074';
select tst.ok((select reviewed_by from public.product_photos where barcode = '7290004131074') = '00000000-0000-0000-0000-000000000001', '📷 the owner approves');
insert into public.product_photos(barcode, image, status) values ('7290004131074', 'data:image/jpeg;base64,BBBB', 'approved');
select tst.ok((select count(*) from public.product_photos where barcode = '7290004131074' and status = 'approved') = 1
  and (select image from public.product_photos where barcode = '7290004131074' and status = 'approved') like '%BBBB', '📷 approving a new photo replaces the old one');
set role anon; select tst.as_user('');
select tst.ok((select count(*) from public.product_photos) = 1, '📷 anon sees only the approved photo');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok((select status from public.product_photos where image like '%AAAA') = 'replaced', '📷 the replaced photo is kept as replaced (its points stay)');
select tst.ok((select photos from public.reporter_scores() where user_id = '00000000-0000-0000-0000-00000000000a') = 1, '🏅 an approved photo counts in the photographer''s reputation');
select tst.ok((select r.score from public.reporter_scores() r where r.user_id = '00000000-0000-0000-0000-00000000000a') = (public.pro_status()->>'points')::int, '🏅 one score: the reputation badge equals the Pro points');
insert into public.product_photos(barcode, image) values ('7290000066318', 'data:image/jpeg;base64,CCCC');
update public.product_photos set status = 'replaced' where image like '%CCCC';
select tst.ok((select status from public.product_photos where image like '%CCCC') = 'pending', '🏅 a user cannot mark their own photo as replaced to get points');
select tst.ok((select photos from public.reporter_scores() where user_id = '00000000-0000-0000-0000-00000000000a') = 1, '🏅 a pending photo gives no points');
select tst.as_user('00000000-0000-0000-0000-000000000001');
update public.product_photos set status = 'rejected' where image like '%AAAA';
select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(coalesce((select photos from public.reporter_scores() where user_id = '00000000-0000-0000-0000-00000000000a'), 0) = 0, '🏅 a photo the admin removes no longer gives points');
insert into public.product_photos(barcode, image, credit) values ('7290000066319', 'data:image/jpeg;base64,DDDD', 'צילום: יוסי');
select tst.ok((select credit from public.product_photos where image like '%DDDD') = 'צילום: יוסי', '📷 the photographer can ask for a credit');
select tst.err($$insert into public.product_photos(barcode, image, credit) values ('7290000066319', 'data:image/jpeg;base64,EEEE', repeat('x', 41))$$, '📷 a credit is at most 40 characters');
reset role; delete from public.product_photos;
-- ⭐ פרו (2.0): נקודות מחושבות מהמסד, שלושה תנאים או מסלול מהיר, צוות אוטומטית, ורק הבעלים נותן ידנית
reset role;
delete from public.referrals; delete from public.share_links;
insert into public.referrals(referred, referrer) values ('00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-00000000000c');
insert into public.share_links(token, sharer, channel, created_at) select 'tok' || lpad(g::text, 7, '0'), '00000000-0000-0000-0000-00000000000b', 'wa', now() from generate_series(1, 6) g;
-- 5 שיתופים שמשתמש חדש נרשם מהם, ואחד שרק נפתח (לא נספר)
insert into public.share_joins(token, user_id, is_new) select 'tok' || lpad(g::text, 7, '0'), '00000000-0000-0000-0000-00000000000c', true from generate_series(1, 5) g;
insert into public.share_joins(token, user_id, is_new) values ('tok0000006', '00000000-0000-0000-0000-00000000000d', false);
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok((select (public.pro_status()->>'friends')::int) = 1, '⭐ a friend who joined through my link is counted');
select tst.ok((select (public.pro_status()->>'friends2')::int) = 1, '⭐ a friend who brought a friend adds the bonus');
select tst.ok((select (public.pro_status()->>'shares')::int) = 3, '⭐ sharing the site counts at most 3 times a day');
reset role; update public.share_joins set is_new = false; set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok((select (public.pro_status()->>'shares')::int) = 0, '⭐ a share no new user signed up from gives no points');
reset role; update public.share_joins set is_new = true where token <> 'tok0000006';
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000b');
select tst.ok((select (public.pro_status()->>'points')::int) = 3 + 2 + 3, '⭐ points: friend 3 + friend-of-friend 2 + 3 shares x 1');
select tst.ok((select (public.pro_status()->>'pro')::boolean) = false, '⭐ few points = not Pro yet');
select tst.err($$select * from public.pro_calc(null)$$, '⭐ a user cannot read everyone''s points');
select tst.ok((select count(*) from public.admin_pro_users('', '')) = 0, '⭐ a user cannot list Pro users');
select tst.err($$select public.admin_pro_set('00000000-0000-0000-0000-00000000000b', true)$$, '⭐ a user cannot give himself Pro');
select tst.err($$update public.profiles set pro_manual = true where id = '00000000-0000-0000-0000-00000000000b'$$, '⭐ a user cannot update pro_manual');
select tst.ok((select (public.pro_status()->>'pro')::boolean) = false, '⭐ a user cannot set pro_manual on his profile');
select tst.as_user('00000000-0000-0000-0000-000000000002');
select tst.ok((select (public.pro_status()->>'pro')::boolean) and public.pro_status()->>'reason' = 'staff', '⭐ staff are Pro automatically');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok(public.admin_pro_set('00000000-0000-0000-0000-00000000000b', true), '⭐ the owner gives Pro by hand');
select tst.ok((select pro from public.admin_pro_users('Bob', '')) and (select reason from public.admin_pro_users('Bob', '')) = 'manual', '⭐ the owner sees the manual Pro in the back office');
insert into public.site_config(key, value) values ('rep', '{"fast_friends":1,"pts_friend":"x"}') on conflict (key) do update set value = excluded.value;
select tst.ok((public.pro_cfg()->>'pts_friend')::int = 3 and (public.pro_cfg()->>'fast_friends')::int = 1, '⭐ settings: bad values fall back to the default');
select public.admin_pro_set('00000000-0000-0000-0000-00000000000b', null);
select tst.ok((select reason from public.admin_pro_users('Bob', '')) = 'fast', '⭐ fast path: enough invited friends = Pro');
update public.site_config set value = '{"fast_friends":0,"solo_points":8}' where key = 'rep';
select tst.ok((select pro from public.admin_pro_users('Bob', '')) and (select reason from public.admin_pro_users('Bob', '')) = 'points', '⭐ enough points alone = Pro, even without photos or sharing');
update public.site_config set value = '{"fast_friends":0,"solo_points":0}' where key = 'rep';
select tst.ok(not (select pro from public.admin_pro_users('Bob', '')), '⭐ points alone below the path = not Pro when the points route is off');
reset role; delete from public.site_config where key = 'rep'; delete from public.referrals; delete from public.share_links;
-- ======== 🛡️ בוטים ואבטחה: הגבלת קצב במסד (yam_pre_request), יומן אירועים והתראה ========
reset role;
insert into public.site_config(key, value) values ('shield', '{"db_ip_per_min":3,"db_user_per_min":4}') on conflict (key) do update set value = excluded.value;
select set_config('request.method', 'POST', false);
select set_config('request.headers', '{"x-forwarded-for":"9.9.9.9"}', false);
select set_config('request.jwt.claims', '{"role":"anon"}', false); select set_config('request.jwt.claim.sub', '', false);
set role anon;
select public.yam_pre_request(); select public.yam_pre_request(); select public.yam_pre_request();
select tst.ok(true, '🛡️ anon: 3 writes in a minute pass');
select public.yam_pre_request();
select tst.ok(true, '🛡️ the write that crosses the limit still passes (so the block is saved)');
select tst.err($$select public.yam_pre_request()$$, '🛡️ the next write from the same IP is blocked');
do $$ begin perform public.yam_pre_request(); raise exception 'FAIL no 429'; exception when sqlstate 'PT429' then null; end $$;
select tst.ok(true, '🛡️ blocked = sqlstate PT429 (HTTP 429)');
select set_config('request.method', 'GET', false);
select tst.err($$select public.yam_pre_request()$$, '🛡️ a blocked IP is blocked on reads too');
select tst.ok((select count(*) from public.security_events) = 0, '🛡️ anon cannot read the security log');
select tst.err($$insert into public.security_events(kind) values ('x')$$, '🛡️ anon cannot write the security log');
delete from public.rate_blocks;
select tst.ok(true, '🛡️ anon delete of blocks does nothing (checked below)');
select set_config('request.headers', '{"x-forwarded-for":"8.8.4.4"}', false);
select public.yam_pre_request();
select tst.ok(true, '🛡️ another IP is not affected');
reset role;
select tst.ok((select count(*) from public.security_events where kind = 'db_rate' and ip = '9.9.9.9' and src = 'db') = 1, '🛡️ one db_rate event logged for the IP');
select tst.ok((select until > now() + interval '9 minutes' from public.rate_blocks where k = 'ip:9.9.9.9'), '🛡️ the block lasts 10 minutes');
select tst.ok(exists (select 1 from public.admin_alerts_sent where kind = 'sh:db_rate:9.9.9.9'), '🛡️ the admin was alerted right away');
-- נטפרי: כתובת ב"לא מוגבלות" לא נחסמת, גם אם כבר נחסמה
insert into public.site_config(key, value) values ('security', '{"ip_allow":["9.9.9.0/24"]}') on conflict (key) do update set value = excluded.value;
select set_config('request.headers', '{"x-forwarded-for":"9.9.9.9"}', false);
set role anon; select public.yam_pre_request(); reset role;
select tst.ok(true, '🛡️ an allowed (shared / NetFree) range is never blocked');
delete from public.site_config where key = 'security';
-- משתמש מחובר נספר לפי החשבון, לא לפי הכתובת
select set_config('request.method', 'PATCH', false);
select set_config('request.headers', '{"x-forwarded-for":"7.7.7.7"}', false);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000c"}', false);
select tst.as_user('00000000-0000-0000-0000-00000000000c');
set role authenticated;
select public.yam_pre_request(); select public.yam_pre_request(); select public.yam_pre_request(); select public.yam_pre_request(); select public.yam_pre_request();
select tst.err($$select public.yam_pre_request()$$, '🛡️ a logged-in user over the limit is blocked');
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-00000000000d"}', false);
select tst.as_user('00000000-0000-0000-0000-00000000000d');
select public.yam_pre_request();
select tst.ok(true, '🛡️ another user on the same IP (NetFree) is not blocked');
-- בקשת קריאה בלבד לא נספרת ולא נופלת
select set_config('request.jwt.claims', '{"role":"anon"}', false); select tst.as_user('');
select set_config('request.headers', '{"x-forwarded-for":"6.6.6.6"}', false);
reset role;
begin; set transaction read only; set local role anon;
select public.yam_pre_request(); select public.yam_pre_request(); select public.yam_pre_request(); select public.yam_pre_request(); select public.yam_pre_request();
commit;
select tst.ok(not exists (select 1 from public.rate_hits where k = 'ip:6.6.6.6'), '🛡️ a read-only request is not counted and does not fail');
-- מפתח השירות (השרת שלנו) לעולם לא נחסם
select set_config('request.jwt.claims', '{"role":"service_role"}', false);
select set_config('request.headers', '{"x-forwarded-for":"9.9.9.9"}', false);
set role service_role; select public.yam_pre_request(); reset role;
select tst.ok(true, '🛡️ the service key is never blocked');
-- כיבוי מהבק אופיס
update public.site_config set value = '{"db_off":true}' where key = 'shield';
select set_config('request.jwt.claims', '{"role":"anon"}', false);
set role anon; select public.yam_pre_request(); reset role;
select tst.ok(true, '🛡️ db_off turns the check off at once');
-- הגדרה שבורה → ברירת המחדל, בלי ליפול
update public.site_config set value = '{"db_ip_per_min":"abc","allow":"x"}' where key = 'shield';
delete from public.rate_blocks;
select set_config('request.method', 'POST', false);
set role anon; select public.yam_pre_request(); reset role;
select tst.ok(true, '🛡️ broken settings fall back to defaults');
-- כותרות שבורות / בלי כתובת — עובר
select set_config('request.headers', 'not json', false);
set role anon; select public.yam_pre_request(); reset role;
select tst.ok(true, '🛡️ broken headers never break a request');
-- מנהל רואה את היומן ומבטל חסימה; משתמש רגיל לא
select set_config('request.jwt.claims', '', false); select set_config('request.headers', '', false); select set_config('request.method', '', false);
insert into public.rate_blocks(k, ip, until) values ('ip:5.5.5.5', '5.5.5.5', now() + interval '1 hour');
set role authenticated; select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok((select count(*) from public.security_events) = 0, '🛡️ a regular user sees no security events');
select tst.ok((select count(*) from public.rate_blocks) = 0, '🛡️ a regular user sees no blocks');
select tst.ok((select count(*) from public.shield_load) = 0, '🛡️ a regular user sees no server load');
select tst.err($$select * from public.shield_known_ips()$$, '🛡️ a regular user cannot list shared IPs');
select tst.ok((select count(*) from public.site_config where key = 'shield') = 0, '🛡️ a regular user cannot read the shield settings');
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok((select count(*) from public.security_events) >= 1, '🛡️ the owner sees the security log');
delete from public.rate_blocks where k = 'ip:5.5.5.5';
select tst.ok(not exists (select 1 from public.rate_blocks where k = 'ip:5.5.5.5'), '🛡️ the owner can unblock');
reset role; select tst.as_user('');
-- אירוע מהשרת: התראה אחת, ולא הצפה של התראות
delete from public.admin_alerts_sent where kind like 'sh:%';
insert into public.security_events(src, kind, ip, n, detail) values ('server', 'flood', '4.4.4.4', 900, '{"min":10}');
insert into public.security_events(src, kind, ip, n, detail) values ('server', 'flood', '4.4.4.4', 950, '{"min":10}');
insert into public.security_events(src, kind, ip, n, detail) values ('server', 'flood', '4.4.4.5', 950, '{"min":10}');
select tst.ok((select count(*) from public.admin_alerts_sent where kind like 'sh:flood%') = 2, '🛡️ flood alerts are throttled (one per few minutes)');
insert into public.security_events(src, kind, detail) values ('server', 'down', '{"why":"x"}');
insert into public.security_events(src, kind, detail) values ('server', 'up', '{}');
select tst.ok(exists (select 1 from public.admin_alerts_sent where kind = 'sh:up:'), '🛡️ site down / up always alert');
insert into public.auth_events(kind, email, user_id, ip) values ('login','owner@x.com','00000000-0000-0000-0000-000000000001','3.3.3.3'),
  ('login','a@x.com',null,'2.2.2.2'),('login','b@x.com',null,'2.2.2.2'),('google_login','c@x.com',null,'2.2.2.2'),('login','d@x.com',null,'1.1.1.9');
set role service_role;
select tst.ok((select admin from public.shield_known_ips() where ip = '3.3.3.3'), '🛡️ the owner''s own IP is known (never locked out)');
select tst.ok((select accounts from public.shield_known_ips() where ip = '2.2.2.2') = 3, '🛡️ an IP shared by 3 accounts (NetFree) is known as shared');
select tst.ok(not exists (select 1 from public.shield_known_ips() where ip = '1.1.1.9'), '🛡️ a single user IP is not "shared"');
reset role; delete from public.auth_events where ip in ('3.3.3.3','2.2.2.2','1.1.1.9');
delete from public.security_events; delete from public.rate_blocks; delete from public.rate_hits; delete from public.site_config where key = 'shield';

-- ======== owners: only the yam_owner flag in app_metadata (no email is an owner by itself) ========
set session_replication_role = replica;  -- insert test accounts directly, without the signup guard
insert into auth.users(id, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1','yamshopping2026@gmail.com', now(), '{}', '{}'),
  ('00000000-0000-0000-0000-0000000000b2','biz-unconf@x.com', null, '{}', '{"yam_owner":true}'),
  ('00000000-0000-0000-0000-0000000000b3','usermeta@x.com', now(), '{"yam_owner":true}', '{}'),
  ('00000000-0000-0000-0000-0000000000b4','flagoff@x.com', now(), '{}', '{"yam_owner":false}');
set session_replication_role = origin;
set role authenticated;
select tst.as_user('00000000-0000-0000-0000-000000000001');
select tst.ok(public.is_owner(), 'owner: account with yam_owner flag is owner');
select tst.as_user('00000000-0000-0000-0000-0000000000b1');
select tst.ok(not public.is_owner(), 'owner: the business email alone (no flag) is not owner');
select tst.as_user('00000000-0000-0000-0000-0000000000b2');
select tst.ok(not public.is_owner(), 'owner: flagged but unconfirmed email is not owner');
select tst.as_user('00000000-0000-0000-0000-0000000000b3');
select tst.ok(not public.is_owner(), 'owner: yam_owner in user_metadata (which users can edit) does not count');
select tst.as_user('00000000-0000-0000-0000-0000000000b4');
select tst.ok(not public.is_owner(), 'owner: yam_owner=false is not owner');
select tst.as_user('00000000-0000-0000-0000-00000000000a');
select tst.ok(not public.is_owner(), 'owner: regular user is not owner');
select tst.err($$update auth.users set raw_app_meta_data = '{"yam_owner":true}' where id = auth.uid()$$, 'owner: a user cannot set the flag on themselves');
reset role;
select tst.ok((select count(*) from public.admin_ids() a where a = '00000000-0000-0000-0000-000000000001') = 1, 'owner: the flagged owner gets admin alerts');
select tst.ok(not exists (select 1 from public.admin_ids() a where a in ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000b4')), 'owner: the others do not');
delete from auth.users where id in ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000b3','00000000-0000-0000-0000-0000000000b4');
select tst.ok(true, 'ALL DONE');
-- auth_user_state: only the server may call it
do $$ begin
  set local role authenticated;
  begin perform public.auth_user_state('a@x.com'); raise exception 'FAIL auth_user_state callable by users'; exception when insufficient_privilege then null; end;
  reset role;
end $$;
select 'PASS auth_user_state server-only';

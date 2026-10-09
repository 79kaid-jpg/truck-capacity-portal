\set ON_ERROR_STOP 1
insert into auth.users (id,email) values
 ('00000000-0000-0000-0000-00000000000a','admin@demo.vn'),
 ('00000000-0000-0000-0000-0000000000b1','log@demo.vn'),
 ('00000000-0000-0000-0000-0000000000c1','cs@demo.vn'),
 ('00000000-0000-0000-0000-0000000000d1','s1@demo.vn'),
 ('00000000-0000-0000-0000-0000000000d2','s2@demo.vn'),
 ('00000000-0000-0000-0000-0000000000e1','kh@demo.vn');
select app.bootstrap_admin('admin@demo.vn','Hoàng Kiên');
-- as admin
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select admin_upsert_profile('{"email":"log@demo.vn","name":"Minh","role":"logistics","wh":"PMY"}');
select admin_upsert_profile('{"email":"cs@demo.vn","name":"Trúc","role":"cs"}');
select admin_upsert_profile('{"email":"s1@demo.vn","name":"Bảo","role":"sales","segment":"DD","phone":"0903"}');
select admin_upsert_profile('{"email":"s2@demo.vn","name":"Hà","role":"sales","segment":"DA","phone":"0908"}');
select admin_stats();
reset role;
select app.load_demo();
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
select admin_upsert_profile(jsonb_build_object('email','kh@demo.vn','name','Văn Phú','role','customer','customer_id',(select id from app.customers where code='KH0102')));

-- v3.18: Admin tạo / xóa tài khoản, đặt lại mật khẩu
\set AD '00000000-0000-0000-0000-00000000000a'
\set CS '00000000-0000-0000-0000-0000000000c1'
\set S2 '00000000-0000-0000-0000-0000000000d2'
\set S1 '00000000-0000-0000-0000-0000000000d1'
select set_config('request.jwt.claim.sub', :'CS', false);
\echo expect ERROR quyền (CS tạo tài khoản)
select public.admin_create_user('{"email":"x@test.vn","name":"X","role":"cs","password":"Abcdef12"}');
select set_config('request.jwt.claim.sub', :'AD', false);
select (public.admin_create_user('{"email":"Test.User@BlueScope.com","name":"Test User","role":"sales","segment":"DD","phone":"0909","password":"Abcdef12","welcome":false}')->>'id') as nid \gset
select email, role, must_change_pw from app.profiles where user_id = :'nid';
select (encrypted_password like '$2%') as hashed, (select count(*) from auth.identities where user_id = :'nid') as ident from auth.users where id = :'nid';
\echo expect ERROR đã có tài khoản
select public.admin_create_user('{"email":"test.user@bluescope.com","name":"T","role":"cs","password":"Abcdef12"}');
\echo expect ERROR tối thiểu 8
select public.admin_create_user('{"email":"y@test.vn","name":"Y","role":"cs","password":"123"}');
select public.admin_reset_password(:'nid', 'Newpass99');
select must_change_pw from app.profiles where user_id = :'nid';
select set_config('request.jwt.claim.sub', :'nid', false);
select public.my_pw_changed(); select must_change_pw as after_change from app.profiles where user_id = :'nid';
select set_config('request.jwt.claim.sub', :'AD', false);
\echo --- xóa
\echo expect ERROR chính tài khoản
select public.admin_delete_user(:'AD');
select public.admin_delete_user(:'nid')->>'email' as deleted_clean;
select count(*) as gone from auth.users where id = :'nid';
\echo expect ERROR đang gắn dữ liệu
select public.admin_delete_user(:'S2');
\echo expect ERROR người nhận phải là Sales
select public.admin_delete_user(:'S2', :'CS');
select count(*) as s2_custs from app.customers where sales_user_id = :'S2' \gset
select public.admin_delete_user(:'S2', :'S1')->>'transferred' as transferred;
select count(*) = 0 as none_left, (select count(*) from app.customers where sales_user_id = :'S1') >= :s2_custs as moved from app.customers where sales_user_id = :'S2';
select app.uname(:'S2') as history_name;

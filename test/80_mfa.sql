-- MFA: Logistics / CS / Admin cần aal2; Sales, Khách hàng không bắt buộc trừ khi tự bật
\echo --- CS aal1 -> get_state báo mfa_required, không có dữ liệu
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',true), set_config('request.jwt.claim.aal','aal1',true);
set local role authenticated;
select public.get_state(current_date, current_date+7) ->> 'error' as cs_aal1, (public.get_state(current_date, current_date+7) ->> 'enrolled') as enrolled, public.get_state(current_date, current_date+7) -> 'bookings' as bookings;
rollback;
select id as bk from app.bookings where status='hold' limit 1 \gset
select jsonb_agg(x) as logp from unnest(app.my_perms('logistics')) x where x <> 'auth.mfa' \gset
\echo --- CS aal1 -> mọi thao tác bị chặn (expect ERROR chưa được cấp quyền)
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',true), set_config('request.jwt.claim.aal','aal1',true);
set local role authenticated;
select public.search('KH', null, null, null) as search_cs_aal1;
select public.cancel_booking(:'bk', 'CUSTOMER', null);
rollback;
\echo --- CS aal2 -> bình thường
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',true), set_config('request.jwt.claim.aal','aal2',true);
set local role authenticated;
select public.get_state(current_date, current_date+7) -> 'me' ->> 'role' as cs_aal2;
rollback;
\echo --- Admin aal1 -> chặn, kể cả Login as
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',true), set_config('request.jwt.claim.aal','aal1',true);
set local role authenticated;
select public.get_state(current_date, current_date+7) ->> 'error' as admin_aal1;
select public.impersonate_start('00000000-0000-0000-0000-0000000000d1');
rollback;
\echo --- Sales aal1, chưa bật MFA -> vào được
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d1',true), set_config('request.jwt.claim.aal','aal1',true);
set local role authenticated;
select public.get_state(current_date, current_date+7) -> 'me' ->> 'role' as sales_aal1;
rollback;
\echo --- Sales tự bật MFA -> aal1 bị chặn
begin;
insert into auth.mfa_factors (user_id) values ('00000000-0000-0000-0000-0000000000d1');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000d1',true), set_config('request.jwt.claim.aal','aal1',true);
set local role authenticated;
select public.get_state(current_date, current_date+7) ->> 'error' as sales_enrolled_aal1;
rollback;
\echo --- Khách hàng aal1 -> vào được (không cấu hình bắt buộc)
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1',true), set_config('request.jwt.claim.aal','aal1',true);
set local role authenticated;
select public.get_state(current_date, current_date+7) -> 'me' ->> 'role' as kh_aal1;
rollback;
\echo --- Admin bỏ MFA cho Logistics và Admin -> cả hai vào được bằng aal1 (giai đoạn POV)
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',true), set_config('request.jwt.claim.aal','aal2',true);
set local role authenticated;
select public.save_role_permissions(jsonb_build_object('logistics', :'logp'::jsonb, 'admin', '[]'::jsonb));
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',true), set_config('request.jwt.claim.aal','aal1',true);
select public.get_state(current_date, current_date+7) -> 'me' ->> 'role' as log_after_off;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',true), set_config('request.jwt.claim.aal','aal1',true);
select coalesce(public.get_state(current_date, current_date+7) ->> 'error', 'ok: ' || (public.get_state(current_date, current_date+7) -> 'me' ->> 'role')) as admin_after_off;
rollback;
\echo --- Danh sách người dùng có cờ mfa; Admin gỡ thiết bị
begin;
insert into auth.mfa_factors (user_id) values ('00000000-0000-0000-0000-0000000000c1');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',true), set_config('request.jwt.claim.aal','aal2',true);
set local role authenticated;
select u->>'name' as name, u->>'mfa' as mfa, u->>'mfaReq' as req from jsonb_array_elements(public.get_state(current_date, current_date+7)->'users') u where u->>'role' in ('cs','sales') order by 1;
select public.admin_reset_mfa('00000000-0000-0000-0000-0000000000c1') as removed;
reset role;
select count(*) as factors_left from auth.mfa_factors where user_id = '00000000-0000-0000-0000-0000000000c1';
select detail from app.audit_log order by id desc limit 1;
rollback;
\echo --- CS (không có users.manage) gỡ MFA -> expect ERROR
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',true), set_config('request.jwt.claim.aal','aal2',true);
set local role authenticated;
select public.admin_reset_mfa('00000000-0000-0000-0000-0000000000b1');
rollback;

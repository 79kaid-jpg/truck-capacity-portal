-- v3.19: chatbot – quyền, hạn mức
-- now-dependent: hạn mức chatbot đếm theo giờ thật (now()), bỏ qua khi giả lập ngày (SHIFT≠0)
-- "Hôm nay" theo Portal (app.today), lấy trước khi đổi vai trò
select app.today() as td \gset
\set CS '00000000-0000-0000-0000-0000000000c1'
\set KH '00000000-0000-0000-0000-0000000000e1'
\set AD '00000000-0000-0000-0000-00000000000a'
select set_config('request.jwt.claim.sub', :'CS', false);
select (public.chat_use('{find_bookings}')->>'left')::int as cs_left;
select (public.get_state(:'td'::date, :'td'::date)->'me'->>'chat') as cs_chat;
select set_config('request.jwt.claim.sub', :'KH', false);
select (public.get_state(:'td'::date, :'td'::date)->'me'->>'chat') as kh_chat_off;
\echo expect ERROR chưa được bật
select public.chat_use();
select set_config('request.jwt.claim.sub', :'AD', false);
select public.set_customer_chat((select customer_id from app.profiles where user_id = :'KH'), true);
select public.update_settings('{"chatDaily": 2, "chatDailyRole": {"cs":150,"sales":150,"logistics":150,"admin":150,"customer":2}}');
select set_config('request.jwt.claim.sub', :'KH', false);
select (public.chat_use()->>'left')::int as kh_left1;
select (public.chat_use()->>'left')::int as kh_left0;
\echo expect ERROR hết 2 lượt
select public.chat_use();
select set_config('request.jwt.claim.sub', :'AD', false);
select (public.chat_stats()->>'today')::int as today_calls;
\echo --- v3.20: hạn mức theo vai trò + tổng
select set_config('request.jwt.claim.sub', :'AD', false);
select public.update_settings('{"chatDaily": 150, "chatDailyRole": {"cs":1,"sales":150,"logistics":150,"admin":150,"customer":30}}');
\echo expect ERROR không hợp lệ
select public.update_settings('{"chatDailyRole": {"boss":5}}');
select set_config('request.jwt.claim.sub', :'CS', false);
\echo expect ERROR hết 1 lượt (CS đã dùng 1 lượt ở trên)
select public.chat_use();
select set_config('request.jwt.claim.sub', :'AD', false);
select (public.chat_use()->>'limit')::int as admin_limit;
select public.update_settings('{"chatDailyTotal": 5}');
select count(*) as all_today from app.chat_log;
\echo expect ERROR hạn mức chung (đã 5 lượt + thông báo 80% ở lượt 5)
select public.chat_use(); select public.chat_use();
select count(*) as admin_alert from app.notifications where text like 'Trợ lý (chatbot) đã dùng 80%%';
select public.chat_stats()->'roles' as roles, (public.chat_stats()->>'total')::int as total;

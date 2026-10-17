-- v3.19: chatbot – quyền, hạn mức
\set CS '00000000-0000-0000-0000-0000000000c1'
\set KH '00000000-0000-0000-0000-0000000000e1'
\set AD '00000000-0000-0000-0000-00000000000a'
select set_config('request.jwt.claim.sub', :'CS', false);
select (public.chat_use('{find_bookings}')->>'left')::int as cs_left;
select (public.get_state(current_date, current_date)->'me'->>'chat') as cs_chat;
select set_config('request.jwt.claim.sub', :'KH', false);
select (public.get_state(current_date, current_date)->'me'->>'chat') as kh_chat_off;
\echo expect ERROR chưa được bật
select public.chat_use();
select set_config('request.jwt.claim.sub', :'AD', false);
select public.set_customer_chat((select customer_id from app.profiles where user_id = :'KH'), true);
select public.update_settings('{"chatDaily": 2}');
select set_config('request.jwt.claim.sub', :'KH', false);
select (public.chat_use()->>'left')::int as kh_left1;
select (public.chat_use()->>'left')::int as kh_left0;
\echo expect ERROR hết 2 lượt
select public.chat_use();
select set_config('request.jwt.claim.sub', :'AD', false);
select (public.chat_stats()->>'today')::int as today_calls;

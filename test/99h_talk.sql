-- v3.24: Trao đổi nội bộ
\set CS  '00000000-0000-0000-0000-0000000000c1'
\set LOG '00000000-0000-0000-0000-0000000000b1'
\set KH  '00000000-0000-0000-0000-0000000000e1'
\set AD  '00000000-0000-0000-0000-00000000000a'
select b.id as bk, c.sales_user_id as sales from app.bookings b join app.customers c on c.id = b.customer_id where b.warehouse_code = 'JM2' and c.sales_user_id is not null order by b.id limit 1 \gset
select user_id as other_sales from app.profiles where role = 'sales' and user_id <> :'sales' and coalesce(stat_scope,'own') = 'own' limit 1 \gset
\echo --- CS hỏi @Log
select set_config('request.jwt.claim.sub', :'CS', false);
select (r->'thread'->>'st') as st, jsonb_array_length(r->'msgs') as n, (r->'thread'->'wait') @> jsonb_build_array(jsonb_build_object('id', :'LOG')) as log_waited
  from (select public.talk_post(jsonb_build_object('kind','bk','ref',:'bk','body','Xe đến kho mấy giờ?','tags',jsonb_build_array('log')))) x(r);
select count(*) > 0 as log_notified from app.notifications where user_id = :'LOG' and type = 'Trao đổi' and link->'talk'->>'r' = :'bk';
\echo --- khách bị chặn
select set_config('request.jwt.claim.sub', :'KH', false);
\echo expect ERROR nội bộ
select public.talk_get('bk', :'bk');
select jsonb_array_length(public.get_state(current_date - 30, current_date + 30)->'talk') as kh_talk;
\echo --- Sales khác không thấy
select set_config('request.jwt.claim.sub', :'other_sales', false);
\echo expect ERROR quyền
select public.talk_get('bk', :'bk');
\echo --- Log xem, thấy chưa đọc, trả lời
select set_config('request.jwt.claim.sub', :'LOG', false);
select (t->>'unread')::int as unread, (t->>'inv')::boolean as inv from jsonb_array_elements(public.get_state(current_date - 30, current_date + 30)->'talk') t where t->>'ref' = :'bk';
select jsonb_array_length(public.talk_get('bk', :'bk')->'reads') as reads_others;
select public.talk_post(jsonb_build_object('kind','bk','ref',:'bk','body','Xe đến 14h','ask',false))->'thread'->>'st' as answered;
\echo --- sửa trong 5 phút, người khác không sửa được
select (select id from app.talk_msgs order by id desc limit 1) as mid \gset
select public.talk_edit(:mid, 'Xe đến 14h30')->'msgs'->-1->>'edited' as edited;
select set_config('request.jwt.claim.sub', :'CS', false);
\echo expect ERROR chỉ sửa của mình
select public.talk_edit(:mid, 'x');
\echo --- react, ghim, xong, mute
select public.talk_react(:mid, '👍')->'msgs'->-1->'reacts' ? '👍' as reacted;
select public.talk_set('bk', :'bk', 'pin', 'Khách yêu cầu giao trước 10h')->'thread'->>'pin' as pin;
select count(*) > 0 as pin_in_history from app.audit_log where entity_id = :'bk' and detail like '%ghim%';
select public.talk_set('bk', :'bk', 'status', 'done')->'thread'->>'st' as done;
select public.talk_set('bk', :'bk', 'mode', 'mute')->'thread'->>'mode' as mode;
\echo --- xe / ngày
select public.talk_post(jsonb_build_object('kind','day','ref','JM2:' || (current_date+1)::text,'body','Ngày mai thiếu 2 xe DK?'))->'thread'->>'title' as day_title;
\echo expect ERROR ref sai
select public.talk_post(jsonb_build_object('kind','truck','ref','bad','body','x'));
\echo --- ảnh
select public.talk_upload(encode('\xffd8ffe0'::bytea, 'base64'), 'image/jpeg') as fid \gset
select public.talk_post(jsonb_build_object('kind','bk','ref',:'bk','body','','fileId',:fid))->'msgs'->-1->>'file' = :'fid'::text as file_ok;
select set_config('request.jwt.claim.sub', :'LOG', false);
select public.talk_file(:fid)->>'mime' as mime;
\echo --- nhắc khi quá giờ
select set_config('request.jwt.claim.sub', :'CS', false);
select public.talk_post(jsonb_build_object('kind','bk','ref',:'bk','body','Ghép xe được không?','tags',jsonb_build_array('log')))->'thread'->>'st' as wait;
update app.talk_threads set asked_at = now() - interval '3 hours' where ref = :'bk';
select app.escalate() >= 0 as ran;
select reminded from app.talk_threads where ref = :'bk';
select count(*) > 0 as reminded_log from app.notifications where user_id = :'LOG' and type = 'Nhắc việc' and text like 'Chưa trả lời câu hỏi%';

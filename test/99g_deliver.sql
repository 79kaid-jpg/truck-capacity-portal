-- v3.23: yêu cầu theo NGÀY GIAO, ngày bốc dự kiến = giao − số ngày vận chuyển
\set CS  '00000000-0000-0000-0000-0000000000c1'
\set KH  '00000000-0000-0000-0000-0000000000e1'
\set AD  '00000000-0000-0000-0000-00000000000a'
select set_config('request.jwt.claim.sub', :'KH', false);
select r->>'deliver' = (current_date+3)::text as dl_ok, r->>'date' = (current_date+2)::text as boc_mac_dinh_1 , r->>'id' as rid
  from (select public.req_create(jsonb_build_object('wh','JM2','deliver',current_date+3,'body','Hai Yến 50 MT HC 0.45 giao'))) x(r) \gset
\echo :dl_ok :boc_mac_dinh_1
select public.req_create(jsonb_build_object('wh','JM2','deliver',current_date,'body','giao hôm nay'))->>'date' = current_date::text as khong_truoc_hom_nay;
\echo expect ERROR ngày giao
select public.req_create(jsonb_build_object('wh','JM2','deliver',current_date-1,'body','abc def'));
\echo expect ERROR khách không đổi ngày bốc
select public.req_set_day(:rid, current_date+1);
\echo --- Admin cài JM2 = 2 ngày
select set_config('request.jwt.claim.sub', :'AD', false);
select public.update_settings('{"transitDays":{"JM2":2}}');
\echo expect ERROR giá trị
select public.update_settings('{"transitDays":{"JM2":1.5}}');
\echo expect ERROR kho
select public.update_settings('{"transitDays":{"XXX":1}}');
select set_config('request.jwt.claim.sub', :'KH', false);
select public.req_create(jsonb_build_object('wh','JM2','deliver',current_date+5,'body','abc def'))->>'date' = (current_date+3)::text as boc_2_ngay;
\echo --- CS đổi ngày bốc
select set_config('request.jwt.claim.sub', :'CS', false);
select public.req_set_day(:rid, current_date+1)->>'date' = (current_date+1)::text as cs_doi;
\echo expect ERROR sau ngày giao
select public.req_set_day(:rid, current_date+4);
select count(*) > 0 as notif_giao from app.notifications where text like '%giao%bốc dự kiến%';

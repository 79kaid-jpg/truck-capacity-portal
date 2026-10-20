-- expect-errors: 0
-- v3.35: bộ sinh dữ liệu trình diễn: sinh, không vượt tải xe, chạy lại bị chặn, xóa sạch
select app.load_demo();
select count(*) as bk_before from app.bookings \gset
\i supabase/demo_gen.sql
do $$ declare n int; m text; begin
  select count(*) into n from app.bookings where ref like 'DEMO-%';
  if n < 300 then raise exception 'ít đơn demo: %', n; end if;
  if n <> (select count(*) from app.demo_marks where kind='bk') then raise exception 'demo_marks lệch'; end if;
  if exists (select 1 from app.bookings where status='delivered' and delivered_at is null) then raise exception 'delivered thiếu giờ'; end if;
  if exists (select 1 from app.bookings where status in ('ok','loaded','transit','delivered') and not exists (select 1 from app.allocations a where a.booking_id=bookings.id)) then raise exception 'đơn đã xếp thiếu xe'; end if;
  if exists (select 1 from app.bookings where status in ('rejected','cancelled') and exists (select 1 from app.allocations a where a.booking_id=bookings.id)) then raise exception 'đơn hủy còn giữ xe'; end if;
  if exists (select 1 from (select truck_code, sum(tons) s from app.allocations group by 1) q
             where s > (select cap from app.trucks(split_part(q.truck_code,'-',1), to_date(split_part(q.truck_code,'-',2),'DDMMYY')) t where t.code=q.truck_code) + 0.001) then raise exception 'xe quá tải'; end if;
  if exists (select 1 from app.bookings where status in ('hold','ok') and day >= app.today() and (app.day_metrics(warehouse_code, day)->>'avail')::numeric < 0) then raise exception 'ngày vượt sức chứa'; end if;
  if exists (select 1 from app.bookings where delivered_at > now() or closed_at > now() or held_at > now()) then raise exception 'mốc thời gian ở tương lai'; end if;
  m := app.gen_demo_orders(); if m not like 'Đã có dữ liệu demo%' then raise exception 'chạy lại không bị chặn: %', m; end if;
end $$;
select app.gen_demo_clear();
do $$ begin
  if exists (select 1 from app.bookings where ref like 'DEMO-%') or exists (select 1 from app.demo_marks) then raise exception 'xóa chưa sạch'; end if;
  if exists (select 1 from app.talk_threads where kind='bk') or exists (select 1 from app.order_requests) then raise exception 'còn Trao đổi/yêu cầu demo'; end if;
end $$;
select count(*) = :bk_before as untouched from app.bookings;

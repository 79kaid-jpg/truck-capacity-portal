-- Booking bị từ chối: CS chỉ đặt lại bằng Giữ chỗ (không Lưu tạm); booking đã hủy không sửa được
select id as bk from app.bookings where status='hold' order by id limit 1 \gset
select customer_id as cu, warehouse_code as wh from app.bookings where id = :'bk' \gset
begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000b1',true);
set local role authenticated;
select public.reject_booking(:'bk', 'Hết xe', 'NO_TRUCK');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',true);
\echo --- Lưu tạm booking bị từ chối -> expect ERROR "chọn ngày mới rồi bấm Đặt lại"
select public.save_booking(jsonb_build_object('id', :'bk', 'mode', 'draft', 'wh', :'wh', 'day', (current_date + 5)::text, 'customer_id', :'cu', 'lines', '[]'::jsonb));
rollback;
begin;
update app.bookings set status = 'cancelled' where id = :'bk';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000c1',true);
set local role authenticated;
\echo --- Sửa booking đã hủy -> expect ERROR "đã hủy"
select public.save_booking(jsonb_build_object('id', :'bk', 'mode', 'draft', 'wh', :'wh', 'day', (current_date + 5)::text, 'customer_id', :'cu', 'lines', '[]'::jsonb));
rollback;

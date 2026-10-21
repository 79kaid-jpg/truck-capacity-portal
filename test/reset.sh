#!/bin/bash
# Rebuild local test DB: stub → migration → seed → demo → test users
set -e; cd "$(dirname "$0")/.."
P="psql -h /tmp -U postgres -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "select pg_terminate_backend(pid) from pg_stat_activity where datname='t' and pid<>pg_backend_pid()" >/dev/null
$P -d postgres -c "drop database if exists t" -c "create database t"
for r in anon authenticated service_role; do $P -d postgres -c "do \$\$begin create role $r nologin; exception when duplicate_object then null; end\$\$" ; done
grep -v "^create role" test/00_supabase_stub.sql | $P -d t
$P -d t -f test/01_supabase_ext_stub.sql
$P -d t -f supabase/migrations/0001_init.sql
# SHIFT=N: giả lập "hôm nay" của Portal lệch N ngày (dùng cho test/sql-week.sh)
[ "${SHIFT:-0}" != 0 ] && $P -d t -c "create or replace function app.today() returns date language sql stable set search_path = '' as \$f\$ select (now() at time zone 'Asia/Ho_Chi_Minh')::date + ${SHIFT} \$f\$"
grep -v "^create extension if not exists pg_" supabase/migrations/0002_email.sql | $P -d t
$P -d t -f supabase/seed.sql -f supabase/demo_data.sql
$P -d t <<'SQL'
insert into auth.users (id,email) values
 ('00000000-0000-0000-0000-00000000000a','admin@demo.vn'),('00000000-0000-0000-0000-0000000000b1','log@demo.vn'),
 ('00000000-0000-0000-0000-0000000000c1','cs@demo.vn'),('00000000-0000-0000-0000-0000000000d1','s1@demo.vn'),
 ('00000000-0000-0000-0000-0000000000d2','s2@demo.vn'),('00000000-0000-0000-0000-0000000000e1','kh@demo.vn'),
 ('00000000-0000-0000-0000-0000000000f1','new@demo.vn'),('00000000-0000-0000-0000-0000000000c2','cs2@demo.vn');
select app.bootstrap_admin('admin@demo.vn','Hoàng Kiên');
insert into app.profiles (user_id,full_name,email,phone,role,segment,default_warehouse,warehouses) values
 ('00000000-0000-0000-0000-0000000000b1','Trần Đức Minh','log@demo.vn',null,'logistics',null,'JM2','{JM2,JD9,JD8}'),
 ('00000000-0000-0000-0000-0000000000c1','Nguyễn Thanh Trúc','cs@demo.vn',null,'cs',null,'JM2','{}'),
 ('00000000-0000-0000-0000-0000000000c2','Lê Thu Hằng','cs2@demo.vn',null,'cs',null,'JM2','{}'),
 ('00000000-0000-0000-0000-0000000000d1','Phạm Quốc Bảo','s1@demo.vn','0903 112 233','sales','DD','JM2','{}'),
 ('00000000-0000-0000-0000-0000000000d2','Đỗ Thu Hà','s2@demo.vn','0908 445 566','sales','DA','JM2','{}');
select app.load_demo();
-- v3.50: test cũ đặt thẳng ngày bốc; DELIV=1 để chạy với chế độ đặt theo ngày giao
update app.settings set value = 'false' where key = 'deliveryMode';
insert into app.profiles (user_id,full_name,email,role,customer_id) select '00000000-0000-0000-0000-0000000000e1','Văn Phú','kh@demo.vn','customer',id from app.customers where code='KH0102';
SQL
[ "${DELIV:-0}" = 1 ] && $P -d t -c "update app.settings set value = 'true' where key = 'deliveryMode'"
psql -h /tmp -U postgres -q -d postgres -c "alter database t set request.jwt.claim.aal = 'aal2'"
echo reset-ok

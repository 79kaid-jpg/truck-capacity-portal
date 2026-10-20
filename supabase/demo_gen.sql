-- =====================================================================
-- demo_gen.sql : SINH DỮ LIỆU TRÌNH DIỄN trên dữ liệu đang chạy (xóa sạch được)
--
-- Dán cả file vào Supabase → SQL Editor → Run. File:
--   1) tạo các hàm app.gen_demo_orders() và app.gen_demo_clear()
--   2) gọi app.gen_demo_orders() ở dòng cuối (bỏ dòng đó nếu chỉ muốn tạo hàm)
--
-- Dữ liệu sinh ra (tính theo ngày hôm nay của Portal):
--   • Tháng trước : 8.000 MT (Dân dụng 4.500 / Dự án 3.000 / Export 500). Chỉ có trạng thái đã kết thúc:
--                   ~90% Đã giao, ~3% giao lỗi rồi giao lại, ~4% bị Từ chối, ~3% Hủy.
--   • Tháng này   : theo nhịp 8.000 MT/tháng, tính đến hôm nay; có đủ trạng thái đang chạy
--                   (chờ xếp xe, đã xếp xe, đã load, đang giao, đã giao, hủy, giao lỗi...).
--   • Sắp tới     : ~40 đơn (khoảng 700 MT) ở 10 ngày làm việc tới, chỉ ở ngày đã có xe và còn chỗ.
--   • Kèm: xe + biển số/tài xế cho ngày chưa khai báo, danh sách cuộn, lịch sử trạng thái, nhật ký,
--     yêu cầu đặt hàng, Trao đổi nội bộ, thông báo gần đây.
--   • Khách hàng, Sales, CS, Logistics lấy từ dữ liệu đang có; KHÔNG chứa tên khách thật trong file này.
--   • Mọi đơn mẫu có mã tham chiếu bắt đầu bằng DEMO-. Mọi dòng liên quan được ghi vào app.demo_marks.
--
-- Xóa sạch sau buổi trình diễn:   select app.gen_demo_clear();
-- Chạy lại nhiều lần an toàn: nếu đã có dữ liệu demo, hàm tạo sẽ dừng và báo.
-- KHÔNG dùng app.clear_demo() của demo_data.sql trên dữ liệu thật (hàm đó xóa TOÀN BỘ đơn).
-- =====================================================================

create table if not exists app.demo_marks (kind text not null, id text not null, primary key (kind, id));
alter table app.demo_marks enable row level security;

-- ---------- hàm phụ ----------
create or replace function app._dg_ts(p_day date, p_h double precision) returns timestamptz
language sql immutable set search_path = '' as $$
  select (p_day::timestamp + make_interval(mins => round(p_h * 60)::int)) at time zone 'Asia/Ho_Chi_Minh' $$;

-- lùi p_n ngày làm việc (bỏ Chủ nhật)
create or replace function app._dg_wd(p_day date, p_n int) returns date
language plpgsql immutable set search_path = '' as $$
declare d date := p_day; i int := 0;
begin
  while i < p_n loop d := d - 1; if extract(dow from d) <> 0 then i := i + 1; end if; end loop;
  return d;
end $$;

-- mốc thời gian kế tiếp: không sớm hơn mốc trước (khi mốc trước còn trong quá khứ), không muộn hơn "bây giờ − 5 phút"
create or replace function app._dg_nx(p_prev timestamptz, p_h double precision) returns timestamptz
language sql stable set search_path = '' as $$
  select least(p_prev + make_interval(secs => greatest(0, round(p_h * 3600))::int), now() - interval '5 minutes') $$;

create or replace function app._dg_pick(p_arr text[]) returns text
language sql volatile set search_path = '' as $$ select p_arr[1 + floor(random() * cardinality(p_arr))::int] $$;

create or replace function app._dg_h(p_id text, p_from text, p_to text, p_reason text, p_note text, p_actor uuid, p_at timestamptz) returns void
language sql security definer set search_path = '' as $$
  insert into app.booking_status_history (booking_id, from_status, to_status, reason_code, note, actor, at)
  values (p_id, p_from, p_to, p_reason, p_note, p_actor, p_at) $$;

create or replace function app._dg_a(p_id text, p_detail text, p_actor uuid, p_at timestamptz) returns void
language sql security definer set search_path = '' as $$
  insert into app.audit_log (entity_id, detail, actor, at) values (p_id, p_detail, p_actor, p_at) $$;

-- ---------- hàm chính ----------
-- p_scale: nhân hệ số cho mọi sản lượng (1 = đúng 8.000 MT/tháng); p_seed: hạt giống ngẫu nhiên (-1..1)
create or replace function app.gen_demo_orders(p_scale numeric default 1, p_seed numeric default 0.37) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := app.today();
  v_pm date := (date_trunc('month', app.today()) - interval '1 month')::date;
  v_cm date := date_trunc('month', app.today())::date;
  v_capdk numeric := app.setn('capDK'); v_capcn numeric := app.setn('capCN');
  v_hol jsonb := coalesce(app.setting('holidays'), '[]'::jsonb);
  v_cs uuid[]; v_lg uuid[]; v_sales uuid[]; v_admin uuid;
  v_prod text[]; v_col text[]; v_th numeric[]; v_w int[];
  v_base jsonb := '{"DD":4500,"DA":3000,"EX":500}'::jsonb;
  v_curf numeric; v_wd_all int; v_wd_elapsed int;
  per record; sg text; tgt numeric; acc numeric; t numeric; r record; dd date;
  g record; o record; v_has boolean; v_plan text; a int; rr numeric;
  v_id text; v_seq int; v_trd int; lead int; cd date;
  t_held timestamptz; t_conf timestamptz; t_pick timestamptz; t_load timestamptz; t_tr timestamptz; t_end timestamptz; t_close timestamptz;
  t_eta timestamptz; t_can timestamptz; t_rej timestamptz; t_f1 timestamptz; t_redo timestamptz; t0_conf timestamptz; t0_load timestamptz; t0_tr timestamptz;
  d0 date; d_end date; feas boolean; v_late boolean; v_cancel_from text;
  n_made int := 0; n_drop int := 0; n_req int := 0; n_talk int := 0; n_not int := 0;
  rem numeric; tc text; piece numeric; v_free numeric; v_want_xt boolean; v_ok_alloc boolean;
  v_trucks text; n_coils int; i int; v_line1 numeric; v_nl int; v_status text;
  v_reason text; v_rcode text; v_note text; v_urgent boolean; v_dk int; v_xt int; v_lgu uuid; v_csu uuid;
  v_avail numeric; v_ref text; v_ins text;
  v_out text;
begin
  if exists (select 1 from app.demo_marks where kind = 'bk') then
    return 'Đã có dữ liệu demo. Chạy select app.gen_demo_clear(); để xóa trước khi tạo lại.';
  end if;
  perform setseed(greatest(-1, least(1, p_seed)));
  select coalesce(array_agg(user_id order by created_at), '{}') into v_cs from app.profiles where role = 'cs' and active;
  select coalesce(array_agg(user_id order by created_at), '{}') into v_lg from app.profiles where role = 'logistics' and active;
  select coalesce(array_agg(user_id order by created_at), '{}') into v_sales from app.profiles where role = 'sales' and active;
  select user_id into v_admin from app.profiles where role = 'admin' and active order by created_at limit 1;
  if cardinality(v_cs) = 0 then raise exception 'Cần ít nhất một tài khoản CS đang hoạt động.'; end if;
  if cardinality(v_lg) = 0 then v_lg := array[v_admin]; end if;
  select coalesce(array_agg(name order by name), '{}') into v_prod from app.products where active;
  select coalesce(array_agg(name order by name), '{}') into v_col from app.colors where active;
  select coalesce(array_agg(value_mm order by value_mm), '{}') into v_th from app.thicknesses where active;
  select coalesce(array_agg(value_mm order by value_mm), '{}') into v_w from app.widths where active;

  drop table if exists dg; drop table if exists dc; drop table if exists pd; drop table if exists tk; drop table if exists da; drop table if exists dgi;
  create temp table dg (id serial primary key, seg text, cust uuid, addr uuid, wh text, region text, atxt text, prov text, day date, tons numeric(9,2), cname text, cs uuid, sales uuid) on commit drop;
  create temp table dc (cust uuid, seg text, addr uuid, wh text, region text, atxt text, prov text, w numeric, cs uuid, sales uuid, cname text) on commit drop;
  create temp table pd (day date, wgt numeric, cw numeric) on commit drop;
  create temp table tk (code text primary key, type text, seq int, cap numeric, free numeric) on commit drop;
  create temp table da (code text, tons numeric) on commit drop;
  create temp table dgi (bk text, seg text, cust uuid, cname text, wh text, day date, ddate date, tons numeric, status text, held timestamptz, t_conf timestamptz, t_load timestamptz, t_tr timestamptz, t_end timestamptz,
                         cs uuid, lg uuid, sales uuid, region text, atxt text, prod text, trucks text, redo boolean) on commit drop;

  insert into dc
  select c.id, c.segment, a.id, ar.warehouse_code, ar.region_id, concat_ws(', ', a.label, nullif(a.ward, '')), a.province, 1, c.cs_user_id, c.sales_user_id, c.name
    from app.customers c join app.customer_addresses a on a.customer_id = c.id
    join app.address_regions ar on ar.address_id = a.id
    join app.warehouses w on w.code = ar.warehouse_code and w.active
   where c.active;
  -- khách mua nhiều/ít khác nhau (phân bố lệch), chia đều cho các địa chỉ của khách
  update dc set w = x.w / x.n from (select cust, power(random(), 2.5) * 3 + 0.2 as w, count(*) as n from dc group by cust) x where x.cust = dc.cust;
  if not exists (select 1 from dc) then raise exception 'Chưa có khách hàng nào có địa chỉ gắn khu vực kho.'; end if;

  -- nhịp tháng này: số ngày làm việc đã qua / cả tháng
  select count(*) filter (where extract(dow from d) <> 0 and not v_hol ? d::text and to_char(d, 'MM-DD') not in ('01-01', '04-30', '05-01', '09-02')),
         count(*) filter (where d <= v_today and extract(dow from d) <> 0 and not v_hol ? d::text and to_char(d, 'MM-DD') not in ('01-01', '04-30', '05-01', '09-02'))
    into v_wd_all, v_wd_elapsed
    from generate_series(v_cm, (v_cm + interval '1 month - 1 day')::date, interval '1 day') d;
  v_curf := case when v_wd_all > 0 then v_wd_elapsed::numeric / v_wd_all else 1 end;

  -- ---------- 1) sinh đơn ----------
  for per in select * from (values ('prev', v_pm, (v_pm + interval '1 month - 1 day')::date), ('cur', v_cm, v_today), ('fut', v_today + 1, v_today + 16)) v(lbl, d1, d2) loop
    truncate pd;
    insert into pd
    select d, w, sum(w) over (order by d) from (
      select d::date as d, (case when extract(dow from d) = 6 then 0.5 else 1.0 end)
             * (case when per.lbl = 'fut' then greatest(0.3, 1.3 - 0.08 * (row_number() over (order by d))) else 0.8 + 0.4 * extract(day from d) / 30.0 end) as w
        from generate_series(per.d1, per.d2, interval '1 day') d
       where extract(dow from d) <> 0 and not v_hol ? d::text::text and to_char(d, 'MM-DD') not in ('01-01', '04-30', '05-01', '09-02')
    ) z;
    if per.lbl = 'fut' then delete from pd where day > (select day from pd order by day offset 9 limit 1); update pd set cw = x.cw from (select day, sum(wgt) over (order by day) cw from pd) x where x.day = pd.day; end if;
    continue when not exists (select 1 from pd);
    foreach sg in array array['DD', 'DA', 'EX'] loop
      continue when not exists (select 1 from dc where seg = sg);
      tgt := (v_base->>sg)::numeric * p_scale * case per.lbl when 'prev' then 1 when 'cur' then v_curf else (case sg when 'DD' then 700 * 0.55 when 'DA' then 700 * 0.38 else 700 * 0.07 end) / (v_base->>sg)::numeric end;
      acc := 0;
      while acc < tgt - 0.4 loop
        t := case sg when 'DD' then 4 + random() * random() * 40 when 'DA' then 15 + random() * random() * 70 else 20 + random() * 30 end;
        t := greatest(0.5, round(t * 2) / 2);
        if tgt - acc < t then t := greatest(0.5, round((tgt - acc) * 2) / 2); end if;
        select * into r from dc where seg = sg order by -ln(1 - random()) / w limit 1;
        select day into dd from pd where cw >= (select random() * max(cw) from pd) order by cw limit 1;
        insert into dg (seg, cust, addr, wh, region, atxt, prov, day, tons, cname, cs, sales)
        values (sg, r.cust, r.addr, r.wh, r.region, r.atxt, r.prov, dd, t, r.cname, coalesce(r.cs, v_cs[1 + floor(random() * cardinality(v_cs))::int]),
                coalesce(r.sales, case when cardinality(v_sales) > 0 then v_sales[1 + floor(random() * cardinality(v_sales))::int] end));
        acc := acc + t;
      end loop;
    end loop;
  end loop;

  -- ---------- 2) xếp xe + ghi đơn, theo từng kho-ngày ----------
  for g in select wh, day from dg group by wh, day order by day, wh loop
    v_has := exists (select 1 from app.daily_fleet f where f.warehouse_code = g.wh and f.day = g.day);
    if g.day > v_today and not v_has then
      n_drop := n_drop + (select count(*) from dg where wh = g.wh and day = g.day)::int; continue;
    end if;
    truncate tk;
    if v_has then
      insert into tk select t2.code, t2.type, t2.seq, t2.cap, t2.cap - coalesce((select sum(al.tons) from app.allocations al where al.truck_code = t2.code), 0)
        from app.trucks(g.wh, g.day) t2;
    end if;
    v_trd := app.transit_days(g.wh);
    v_lgu := v_lg[1 + floor(random() * cardinality(v_lg))::int];
    -- người xếp xe: ưu tiên Logistics phụ trách kho
    select coalesce((select u from unnest(app.logistics_of(g.wh)) u order by random() limit 1), v_lgu) into v_lgu;

    for o in select * from dg where wh = g.wh and day = g.day order by tons desc, id loop
      a := v_today - o.day; rr := random(); v_csu := o.cs;
      -- trạng thái dự kiến theo "tuổi" của ngày bốc
      v_plan := case
        when o.day > v_today then case when rr < .40 then 'hold' when rr < .82 then 'ok' when rr < .88 then 'draft' when rr < .94 then 'resched' else 'cancelled' end
        when a = 0 then case when rr < .20 then 'hold' when rr < .42 then 'ok' when rr < .67 then 'loaded' when rr < .80 then 'transit' when rr < .85 then 'delivered' when rr < .90 then 'cancelled' when rr < .95 then 'rejected' else 'hold' end
        when a <= 2 then case when rr < .50 then 'delivered' when rr < .75 then 'transit' when rr < .83 then 'loaded' when rr < .86 then 'failed' when rr < .91 then 'cancelled' when rr < .96 then 'rejected' else 'delivered' end
        when o.day < v_cm then case when rr < .90 then 'delivered' when rr < .93 then 'redo' when rr < .97 then 'rejected' else 'cancelled' end
        else case when rr < .88 then 'delivered' when rr < .91 then 'redo' when rr < .95 then 'rejected' when rr < .98 then 'cancelled' else 'failed' end
      end;
      -- mốc thời gian
      lead := 1 + floor(random() * 3)::int; cd := app._dg_wd(o.day, lead);
      t_held := app._dg_nx(app._dg_ts(cd, 8 + random() * 9), 0);
      t_conf := app._dg_nx(t_held, 0.5 + random() * 5);
      t_pick := app._dg_nx(t_conf, 0.5 + random() * 3);
      t_load := app._dg_nx(greatest(t_pick, app._dg_ts(o.day, 8 + random() * 6)), 0);
      t_tr := app._dg_nx(t_load, 1 + random() * 2);
      d_end := o.day + v_trd; t_eta := app._dg_ts(d_end, 8 + random() * 9);
      feas := t_eta <= now() - interval '5 minutes' and t_eta > t_tr;
      if v_plan in ('delivered', 'failed', 'redo') and not feas then v_plan := 'transit'; end if;
      if v_plan = 'redo' and (v_trd > 2 or a < v_trd + 2) then v_plan := 'delivered'; end if;
      -- cần xe?
      v_ok_alloc := v_plan in ('ok', 'loaded', 'transit', 'delivered', 'failed', 'redo');
      v_want_xt := o.tons <= v_capcn + 0.001 and random() < 0.35;
      truncate da;
      if v_ok_alloc then
        if v_has and (select coalesce(sum(free), 0) from tk where free > 0.001) < o.tons - 0.001 then
          -- hết chỗ: ngày đã qua = Từ chối (hết xe); hôm nay/tương lai = giữ chỗ nếu còn sức chứa, không thì bỏ
          if o.day < v_today then v_plan := 'rejected'; v_ok_alloc := false;
          else
            v_avail := (app.day_metrics(g.wh, g.day)->>'avail')::numeric;
            if v_avail >= o.tons - 0.001 then v_plan := 'hold'; v_ok_alloc := false; else v_plan := null; end if;
          end if;
        end if;
      end if;
      if v_plan is null then n_drop := n_drop + 1; continue; end if;
      if v_plan in ('hold', 'ok', 'resched') and o.day >= v_today then
        -- đơn giữ chỗ/đã xếp ở hôm nay trở đi: phải còn sức chứa thật
        if v_plan <> 'resched' then
          v_avail := (app.day_metrics(g.wh, g.day)->>'avail')::numeric;
          if v_avail < o.tons - 0.001 then
            if v_plan = 'hold' or o.day > v_today then n_drop := n_drop + 1; continue; end if;
          end if;
        end if;
      end if;
      if v_ok_alloc then
        rem := o.tons;
        while rem > 0.001 loop
          select code, free into tc, v_free from tk
           where free >= rem - 0.001 and (type = 'DK' or rem <= v_capcn + 0.001)
           order by (case when type = 'XT' and v_want_xt then 0 else 1 end), free asc limit 1;
          if tc is null then
            if v_has or rem > v_capdk + 0.001 then
              select code, free into tc, v_free from tk where free > 0.001 order by free desc limit 1;
            end if;
            if tc is null then
              -- thêm xe ảo (chỉ ở ngày chưa khai báo xe)
              if v_has then exit; end if;
              if v_want_xt and rem <= v_capcn + 0.001 then
                insert into tk select app.truck_code(g.wh, g.day, 'XT', coalesce((select max(seq) from tk where type = 'XT'), 0) + 1), 'XT', coalesce((select max(seq) from tk where type = 'XT'), 0) + 1, v_capcn, v_capcn;
              else
                insert into tk select app.truck_code(g.wh, g.day, 'DK', coalesce((select max(seq) from tk where type = 'DK'), 0) + 1), 'DK', coalesce((select max(seq) from tk where type = 'DK'), 0) + 1, v_capdk, v_capdk;
              end if;
              continue;
            end if;
          end if;
          piece := round(least(rem, v_free), 2);
          insert into da values (tc, piece);
          update tk set free = free - piece where code = tc;
          rem := round(rem - piece, 2); tc := null;
        end loop;
        select string_agg(app.short_code(code) || ' ' || app.fmt(tons) || ' MT', ', ' order by code) into v_trucks from da;
      else v_trucks := null; end if;

      -- ---------- ghi đơn ----------
      insert into app.booking_seq values (g.wh, g.day, 1)
      on conflict (warehouse_code, day) do update set last = app.booking_seq.last + 1 returning last into v_seq;
      v_id := 'BK-' || g.wh || '-' || to_char(g.day, 'YYMMDD') || '-' || lpad(v_seq::text, 3, '0');
      v_ref := 'DEMO-' || (4600000 + o.id * 13);
      v_urgent := random() < 0.07;
      v_rcode := null; v_reason := ''; v_note := ''; v_late := false; v_cancel_from := null; t_end := null; t_close := null; t_can := null; t_rej := null; t0_conf := null;
      d0 := null; t_f1 := null; t_redo := null; t0_load := null; t0_tr := null;
      if random() < 0.12 then v_note := app._dg_pick(array['Giao buổi sáng', 'Gọi trước khi giao 30 phút', 'Khách cần giấy tờ xe khi giao', 'Công trình không cho xe quá 30 tấn vào', 'Giao đúng ngày, không giao sớm']); end if;
      if v_plan = 'redo' then
        d0 := app._dg_wd(o.day, 1 + v_trd + floor(random() * 2)::int);
        t0_conf := app._dg_nx(app._dg_ts(app._dg_wd(d0, 1), 8 + random() * 9), 0);
        t0_load := app._dg_nx(app._dg_ts(d0, 8 + random() * 6), 0); t0_tr := app._dg_nx(t0_load, 1 + random() * 2);
        t_f1 := app._dg_nx(app._dg_ts(d0 + v_trd, 8 + random() * 9), 0);
        t_redo := app._dg_nx(t_f1, 1 + random() * 5);
        t_held := app._dg_nx(t_redo, 0); t_conf := app._dg_nx(t_held, 1 + random() * 3); t_pick := app._dg_nx(t_conf, 0.5 + random() * 2);
        t_load := app._dg_nx(greatest(t_pick, app._dg_ts(o.day, 8 + random() * 6)), 0); t_tr := app._dg_nx(t_load, 1 + random() * 2);
        t_eta := app._dg_ts(d_end, 8 + random() * 9);
        if t_eta <= t_tr or t_eta > now() - interval '5 minutes' then v_plan := 'delivered'; d0 := null; end if;
      end if;
      v_status := case v_plan when 'redo' then 'delivered' else v_plan end;
      if v_status in ('delivered', 'failed') then t_end := app._dg_nx(t_eta, (random() - 0.2) * 1.0); t_close := app._dg_nx(t_end, 0.2 + random() * 1.2); end if;
      if v_plan = 'rejected' then
        t_rej := app._dg_nx(t_held, 0.5 + random() * 6); t_close := t_rej;
        v_rcode := (array['NO_TRUCK', 'NO_TRUCK', 'ROUTE', 'OTHER'])[1 + floor(random() * 4)::int];
        v_reason := case v_rcode when 'NO_TRUCK' then app._dg_pick(array['Ngày này hết xe, đề nghị khách đặt ngày khác', 'Không còn xe phù hợp tải trọng']) when 'ROUTE' then 'Khu vực này chưa có xe đi tuyến trong ngày' else 'Hàng chưa sẵn sàng, đề nghị đặt lại' end;
      elsif v_plan = 'cancelled' then
        v_cancel_from := case when o.day > v_today or random() < 0.5 then (case when random() < 0.5 then 'hold' else 'ok' end) else 'hold' end;
        if v_cancel_from = 'ok' and v_ok_alloc is false and false then null; end if;
        v_rcode := (array['CUSTOMER', 'CUSTOMER', 'WRONG', 'OTHER'])[1 + floor(random() * 4)::int];
        v_reason := case v_rcode when 'CUSTOMER' then app._dg_pick(array['Khách báo hủy do thay đổi tiến độ công trình', 'Khách chưa có kho nhận hàng', 'Khách đã mua nguồn khác']) when 'WRONG' then 'Nhập sai số tấn, CS đã đặt lại đơn khác' else 'Hủy theo đề nghị của Sales' end;
        if v_cancel_from = 'ok' then
          v_late := random() < 0.25;
          t_can := case when v_late then app._dg_nx(app.cutoff_at(o.day), 1 + random() * 10) else app._dg_nx(t_conf, 2 + random() * 20) end;
        else t_can := app._dg_nx(t_held, 1 + random() * 20); end if;
        t_close := t_can;
        if v_cancel_from = 'hold' then v_trucks := null; end if;
      elsif v_plan = 'failed' then
        v_rcode := (array['CUST_CLOSED', 'WRONG_ADDR', 'TRUCK'])[1 + floor(random() * 3)::int];
        v_reason := case v_rcode when 'CUST_CLOSED' then 'Khách vắng, công trình đóng cổng' when 'WRONG_ADDR' then 'Sai địa chỉ giao, khách đổi điểm nhận' else 'Xe gặp sự cố trên đường, không giao kịp' end;
      end if;
      if v_plan = 'redo' then v_rcode := 'CUST_CLOSED'; v_reason := app._dg_pick(array['Khách vắng, công trình đóng cổng', 'Khách chưa sẵn sàng nhận hàng', 'Mưa lớn, công trình không nhận được hàng']); end if;
      v_late := coalesce(v_late, false);

      insert into app.bookings (id, warehouse_code, day, delivery_date, customer_id, ref, address_id, address_text, province, region_id, status, note, cs_user_id,
                                held_at, confirmed_at, closed_at, reason_code, reason_note, proposed_day, created_at, updated_at, original_day, change_count, urgent, late_cancel,
                                delivery_at, loaded_at, eta, delivered_at, fail_note)
      values (v_id, g.wh, g.day, g.day + v_trd, o.cust, v_ref, o.addr, o.atxt, o.prov, o.region, v_status, v_note, v_csu,
              case when v_plan = 'draft' then null else t_held end,
              case when v_plan in ('ok', 'loaded', 'transit', 'delivered', 'failed', 'redo') or (v_plan = 'cancelled' and v_cancel_from = 'ok') then t_conf end,
              t_close, v_rcode, v_reason,
              case when v_plan = 'resched' then app._dg_wd(o.day, 0) + 1 + (case when extract(dow from o.day + 1) = 0 then 1 else 0 end) end,
              case when v_plan = 'draft' then t_held else t_held - interval '2 minutes' end,
              coalesce(t_close, t_tr, t_load, t_conf, t_held),
              case when v_plan = 'redo' then d0 when v_plan <> 'draft' then o.day end,
              case when v_plan = 'redo' then 1 else 0 end, v_urgent, v_late,
              case when v_plan in ('ok', 'loaded', 'transit', 'delivered', 'failed', 'redo') and (v_plan <> 'ok' or random() < 0.7) then t_pick end,
              case when v_plan in ('loaded', 'transit', 'delivered', 'failed', 'redo') then t_load end,
              case when v_plan in ('transit', 'delivered', 'failed', 'redo') then t_eta end,
              case when v_status = 'delivered' then t_end end,
              case when v_plan in ('failed') then v_reason else '' end);
      insert into app.demo_marks values ('bk', v_id);

      -- dòng hàng
      v_nl := case when o.tons >= 20 and random() < 0.35 then 2 else 1 end;
      v_line1 := case when v_nl = 2 then round(o.tons * (0.4 + random() * 0.3) * 2) / 2 else o.tons end;
      if v_nl = 2 and (v_line1 < 0.5 or v_line1 > o.tons - 0.5) then v_nl := 1; v_line1 := o.tons; end if;
      for i in 1 .. v_nl loop
        insert into app.booking_lines (booking_id, product, color, thickness_mm, width_mm, tons)
        values (v_id, case when cardinality(v_prod) > 0 then v_prod[1 + floor(random() * cardinality(v_prod))::int] end,
                case when cardinality(v_col) > 0 then v_col[1 + floor(random() * cardinality(v_col))::int] end,
                case when cardinality(v_th) > 0 then v_th[1 + floor(random() * cardinality(v_th))::int] end,
                case when cardinality(v_w) > 0 then v_w[1 + floor(random() * cardinality(v_w))::int] end,
                case when i = 1 then v_line1 else round(o.tons - v_line1, 2) end);
      end loop;
      -- danh sách cuộn khi đã có "Xác nhận giao hàng"
      if exists (select 1 from app.bookings where id = v_id and delivery_at is not null) then
        n_coils := greatest(1, ceil(o.tons / 6.0)::int);
        for i in 1 .. n_coils loop
          insert into app.delivery_items (booking_id, seq, whs, order_no, ln, itmno, name, lot, qty, attr, customer, loaded, created_by, created_at)
          select v_id, i, g.wh, v_ref, i::text, 'TM-' || coalesce(l.thickness_mm::text, '') || '-' || coalesce(l.width_mm::text, ''),
                 concat_ws(' ', l.product, l.color), 'C' || to_char(g.day, 'YYMMDD') || lpad(o.id::text, 4, '0') || lpad(i::text, 2, '0'),
                 case when i < n_coils then round(o.tons / n_coils, 2) else round(o.tons - round(o.tons / n_coils, 2) * (n_coils - 1), 2) end,
                 concat_ws(' x ', l.thickness_mm::text || ' mm', l.width_mm::text || ' mm'), o.cname, true, v_csu, t_pick
            from (select * from app.booking_lines where booking_id = v_id order by id limit 1) l;
        end loop;
      end if;
      -- xe
      if v_ok_alloc then
        insert into app.allocations (booking_id, truck_code, tons, created_at) select v_id, code, tons, t_conf from da;
      end if;
      -- lịch sử trạng thái + nhật ký
      if v_plan = 'draft' then
        perform app._dg_h(v_id, null, 'draft', null, null, v_csu, t_held);
        perform app._dg_a(v_id, 'Lưu nháp', v_csu, t_held);
      else
        if v_plan = 'redo' then
          perform app._dg_h(v_id, null, 'hold', null, null, v_csu, t_held - interval '3 day');
          perform app._dg_a(v_id, 'Giữ chỗ ' || app.fmt(o.tons) || ' MT', v_csu, t_held - interval '3 day');
          perform app._dg_h(v_id, 'hold', 'ok', null, null, v_lgu, t0_conf); perform app._dg_a(v_id, 'Xác nhận, xe: ' || coalesce(v_trucks, ''), v_lgu, t0_conf);
          perform app._dg_h(v_id, 'ok', 'loaded', null, null, v_lgu, t0_load); perform app._dg_a(v_id, 'Đã load hàng', v_lgu, t0_load);
          perform app._dg_h(v_id, 'loaded', 'transit', null, null, v_lgu, t0_tr); perform app._dg_a(v_id, 'Đang giao', v_lgu, t0_tr);
          perform app._dg_h(v_id, 'transit', 'failed', v_rcode, v_reason, v_lgu, t_f1); perform app._dg_a(v_id, 'Giao không thành công: ' || v_reason, v_lgu, t_f1);
          perform app._dg_h(v_id, 'failed', 'hold', null, 'Giao lại', v_csu, t_redo);
          perform app._dg_a(v_id, 'Giao lại: ngày ' || app.dm(o.day) || ', ' || app.fmt(o.tons) || ' MT', v_csu, t_redo);
        else
          perform app._dg_h(v_id, null, 'hold', null, null, v_csu, t_held);
          perform app._dg_a(v_id, 'Giữ chỗ ' || app.fmt(o.tons) || ' MT', v_csu, t_held);
        end if;
        if v_plan in ('ok', 'loaded', 'transit', 'delivered', 'failed', 'redo') or (v_plan = 'cancelled' and v_cancel_from = 'ok') then
          perform app._dg_h(v_id, 'hold', 'ok', null, null, v_lgu, t_conf);
          perform app._dg_a(v_id, 'Xác nhận, xe: ' || coalesce(v_trucks, '(đã xếp xe)'), v_lgu, t_conf);
        end if;
        if v_plan in ('ok', 'loaded', 'transit', 'delivered', 'failed', 'redo') and exists (select 1 from app.bookings where id = v_id and delivery_at is not null) then
          perform app._dg_a(v_id, 'Xác nhận giao hàng: ' || n_coils || ' cuộn, ' || app.fmt(o.tons) || ' MT, giao tới ' || o.atxt, v_csu, t_pick);
        end if;
        if v_plan in ('loaded', 'transit', 'delivered', 'failed', 'redo') then
          perform app._dg_h(v_id, 'ok', 'loaded', null, null, v_lgu, t_load); perform app._dg_a(v_id, 'Đã load hàng', v_lgu, t_load);
        end if;
        if v_plan in ('transit', 'delivered', 'failed', 'redo') then
          perform app._dg_h(v_id, 'loaded', 'transit', null, null, v_lgu, t_tr);
          perform app._dg_a(v_id, 'Đang giao, dự kiến tới ' || to_char(t_eta at time zone 'Asia/Ho_Chi_Minh', 'DD/MM HH24:MI'), v_lgu, t_tr);
        end if;
        if v_status = 'delivered' then
          perform app._dg_h(v_id, 'transit', 'delivered', null, null, v_lgu, t_end);
          perform app._dg_a(v_id, 'Đã giao, tới nơi ' || to_char(t_end at time zone 'Asia/Ho_Chi_Minh', 'DD/MM HH24:MI'), v_lgu, t_end);
        elsif v_plan = 'failed' then
          perform app._dg_h(v_id, 'transit', 'failed', v_rcode, v_reason, v_lgu, t_end);
          perform app._dg_a(v_id, 'Giao không thành công: ' || v_reason, v_lgu, t_end);
        elsif v_plan = 'rejected' then
          perform app._dg_h(v_id, 'hold', 'rejected', v_rcode, v_reason, v_lgu, t_rej); perform app._dg_a(v_id, 'Từ chối: ' || v_reason, v_lgu, t_rej);
        elsif v_plan = 'cancelled' then
          perform app._dg_h(v_id, v_cancel_from, 'cancelled', v_rcode, v_reason, v_csu, t_can);
          perform app._dg_a(v_id, case when v_late then 'Hủy quá cận ngày giao' else 'Hủy' end || ': ' || v_reason, v_csu, t_can);
        elsif v_plan = 'resched' then
          perform app._dg_h(v_id, 'hold', 'resched', 'NO_TRUCK', 'Hết xe ngày yêu cầu', v_lgu, app._dg_nx(t_held, 1 + random() * 4));
          perform app._dg_a(v_id, 'Đề nghị đổi sang ' || app.dm(o.day + 1) || ': Hết xe ngày yêu cầu', v_lgu, app._dg_nx(t_held, 1 + random() * 4));
        end if;
      end if;
      insert into dgi values (v_id, o.seg, o.cust, o.cname, g.wh, g.day, g.day + v_trd, o.tons, v_status, t_held, t_conf, t_load, t_tr, t_end, v_csu, v_lgu, o.sales, o.region, o.atxt,
                              (select product from app.booking_lines where booking_id = v_id order by id limit 1), v_trucks, v_plan = 'redo');
      n_made := n_made + 1;
    end loop;

    -- khai báo xe cho ngày chưa có (đủ cho đơn mẫu, thêm 1 xe dự phòng)
    if not v_has then
      select coalesce(max(seq) filter (where type = 'DK'), 0), coalesce(max(seq) filter (where type = 'XT'), 0) into v_dk, v_xt from tk;
      if v_dk + v_xt > 0 then
        insert into app.daily_fleet (warehouse_code, day, dk_count, cn_count, reason, updated_by)
        values (g.wh, g.day, least(99, v_dk + case when random() < 0.4 then 1 else 0 end), v_xt, 'DEMO', v_lgu);
        insert into app.demo_marks values ('fleet', g.wh || '|' || g.day);
        insert into app.truck_days (truck_code, warehouse_code, day, plate, driver, phone, closed, updated_by)
        select code, g.wh, g.day, '51' || (array['C', 'D', 'H'])[1 + floor(random() * 3)::int] || '-' || lpad(floor(random() * 99999)::int::text, 5, '0'),
               app._dg_pick(array['Nguyễn Văn Hùng', 'Trần Quốc Việt', 'Lê Minh Tuấn', 'Phạm Đức Thắng', 'Võ Thanh Sơn', 'Đặng Văn Long', 'Bùi Hoàng Nam', 'Huỳnh Công Danh', 'Ngô Văn Phúc', 'Đỗ Anh Khoa']),
               '09' || lpad(floor(random() * 99999999)::int::text, 8, '0'), g.day < v_today, v_lgu
          from tk;
        insert into app.demo_marks select 'truck', code from tk;
      end if;
    end if;
  end loop;

  -- ---------- 3) yêu cầu đặt hàng ----------
  for r in select * from dgi where random() < 0.10 loop
    with x as (
      insert into app.order_requests (customer_id, wh, day, tons, body, status, created_by, created_at, handled_by, handled_at, reply, booking_id, deliver_on)
      select r.cust, r.wh, r.day, r.tons,
             'Cho em đặt ' || app.fmt(r.tons) || ' MT ' || coalesce(r.prod, 'hàng') || ', giao về ' || r.atxt || ' ngày ' || to_char(r.ddate, 'DD/MM') || '. Nhờ chị CS xếp xe giúp em.',
             'done',
             coalesce((select p.user_id from app.profiles p where p.role = 'customer' and p.customer_id = r.cust and random() < 0.4 limit 1), r.sales, r.cs),
             app._dg_nx(r.held - interval '4 hours', 0), r.cs, r.held, 'Đã tạo đơn ' || r.bk, r.bk, r.ddate
      returning id)
    insert into app.demo_marks select 'req', id::text from x;
    n_req := n_req + 1;
  end loop;
  -- yêu cầu bị từ chối / khách tự hủy
  for r in select * from dgi order by random() limit greatest(1, (select count(*) from dgi) / 45) loop
    with x as (
      insert into app.order_requests (customer_id, wh, day, tons, body, status, created_by, created_at, handled_by, handled_at, reply, deliver_on)
      select r.cust, r.wh, r.day, round(r.tons / 2), 'Cho em xin thêm ' || app.fmt(round(r.tons / 2)) || ' MT ngày ' || to_char(r.ddate, 'DD/MM') || ', cùng địa chỉ đơn trước.',
             'declined', coalesce(r.sales, r.cs), r.held - interval '3 hours', r.cs, r.held - interval '2 hours',
             app._dg_pick(array['Ngày này đã hết xe, anh/chị chọn ngày hôm sau giúp em.', 'Khu vực này chưa có xe đi trong ngày, em đề nghị đổi ngày.']), r.ddate
      returning id)
    insert into app.demo_marks select 'req', id::text from x;
    n_req := n_req + 1;
  end loop;
  for r in select * from dgi order by random() limit greatest(1, (select count(*) from dgi) / 90) loop
    with x as (
      insert into app.order_requests (customer_id, wh, day, tons, body, status, created_by, created_at, handled_by, handled_at, deliver_on)
      select r.cust, r.wh, r.day, r.tons, 'Đặt ' || app.fmt(r.tons) || ' MT ngày ' || to_char(r.ddate, 'DD/MM') || ' (khách báo hủy trước khi CS xử lý).',
             'cancelled', coalesce(r.sales, r.cs), r.held - interval '5 hours', coalesce(r.sales, r.cs), r.held - interval '4 hours', r.ddate
      returning id)
    insert into app.demo_marks select 'req', id::text from x;
    n_req := n_req + 1;
  end loop;
  -- yêu cầu mới đang chờ CS xử lý (ngày bốc hôm nay → 5 ngày tới, ở kho đã có xe)
  for r in select dc.*, f.day as fday from dc
           join lateral (select day from app.daily_fleet where warehouse_code = dc.wh and day between v_today and v_today + 5 and extract(dow from day) <> 0 order by random() limit 1) f on true
           order by random() limit 8 loop
    with x as (
      insert into app.order_requests (customer_id, wh, day, tons, body, status, created_by, created_at, deliver_on)
      select r.cust, r.wh, r.fday, t.tn,
             app._dg_pick(array['Anh chị xếp giúp em ', 'Cho em đặt ', 'Em cần giao gấp ', 'Khách hỏi lấy ']) || app.fmt(t.tn) || ' MT, giao về ' || r.atxt || '.',
             'new', coalesce(r.sales, r.cs), now() - make_interval(mins => 20 + floor(random() * 300)::int), r.fday + app.transit_days(r.wh)
        from (select (round((6 + random() * 28) * 2) / 2)::numeric as tn) t
      returning id)
    insert into app.demo_marks select 'req', id::text from x;
    n_req := n_req + 1;
  end loop;

  -- ---------- 4) Trao đổi nội bộ ----------
  for r in select * from dgi where status <> 'draft' and random() < (case when day >= v_cm then 0.30 else 0.08 end) loop
    declare
      v_ask uuid; v_to uuid; t1 timestamptz; t2 timestamptz; v_q text; v_ans text; v_state text; v_tid bigint; v_n int := 1; v_last timestamp with time zone; v_lastby uuid; v_lasttxt text; rr2 numeric := random();
    begin
      v_ask := case when random() < 0.65 then r.cs else coalesce(r.sales, r.cs) end;
      v_to := case when v_ask = r.cs then r.lg else r.cs end;
      select q, ans into v_q, v_ans from (values
        ('Xe nào bốc sớm nhất được không anh? Khách cần gấp.', 'Em xếp xe đầu tiên bốc lúc 8h sáng nhé.'),
        ('Khách hỏi giờ xe tới công trình, mình báo được giờ dự kiến không?', 'Xe chạy lúc 14h, dự kiến tới khoảng 18h chị nhé.'),
        ('Khách xin đổi sang ngày hôm sau, còn chỗ không anh?', 'Còn chỗ ạ, chị đề nghị đổi ngày giúp em.'),
        ('Khách yêu cầu giao trước 10h sáng, xe có kịp không?', 'Tuyến này xa, sớm nhất 13h. Em báo khách giúp nhé.'),
        ('Anh kiểm tra giúp em cuộn số 2 có móp mép không, khách lưu ý.', 'Em kiểm tra rồi, cuộn bình thường, đã chụp ảnh lưu lại.'),
        ('Đơn này có ghép được với đơn cùng khu vực không ạ?', 'Em ghép chung xe với đơn cùng tuyến rồi nhé.')
      ) m(q, ans) order by random() limit 1;
      t1 := app._dg_nx(r.held, 1 + random() * 4); t2 := app._dg_nx(t1, 0.3 + random() * 1.5);
      v_state := case when r.day < v_today - 2 then 'done' when rr2 < 0.35 then 'wait' when rr2 < 0.70 then 'answered' else 'open' end;
      if v_state = 'open' then
        v_q := app._dg_pick(array['Xe đã bốc xong, chuẩn bị xuất phát.', 'Khách đã nhận đủ hàng, chụp biên nhận gửi lại sau.', 'Đã báo khách giờ xe tới.']); v_ask := r.lg; v_to := null;
      end if;
      insert into app.talk_threads (kind, ref, wh, day, customer_id, status, asked_by, asked_at, wait_users, last_at, last_by, last_text, n, created_at)
      values ('bk', r.bk, r.wh, r.day, r.cust, v_state, case when v_state = 'open' then null else v_ask end, case when v_state = 'open' then null else t1 end,
              case when v_state = 'wait' then array[v_to] else '{}' end, t1, v_ask, v_q, 1, t1)
      returning id into v_tid;
      insert into app.demo_marks values ('thread', v_tid::text);
      insert into app.talk_msgs (thread_id, body, ask, mentions, created_by, created_at) values (v_tid, v_q, v_state <> 'open', case when v_to is null then '{}' else array[v_to] end, v_ask, t1);
      if v_state in ('answered', 'done') then
        insert into app.talk_msgs (thread_id, body, ask, created_by, created_at) values (v_tid, v_ans, false, v_to, t2);
        v_n := 2; v_last := t2; v_lastby := v_to; v_lasttxt := v_ans;
        if v_state = 'done' then
          insert into app.talk_msgs (thread_id, body, ask, created_by, created_at) values (v_tid, 'Ok, cảm ơn anh/chị.', false, v_ask, app._dg_nx(t2, 0.2));
          v_n := 3; v_last := app._dg_nx(t2, 0.2); v_lastby := v_ask; v_lasttxt := 'Ok, cảm ơn anh/chị.';
        end if;
        update app.talk_threads set n = v_n, last_at = v_last, last_by = v_lastby, last_text = v_lasttxt where id = v_tid;
      end if;
      n_talk := n_talk + 1;
    end;
  end loop;

  -- ---------- 5) thông báo gần đây (từ hôm qua) ----------
  for r in select * from dgi where day >= v_today - 1 and status <> 'draft' loop
    declare v_type text; v_txt text; v_to uuid[]; v_at timestamptz;
    begin
      v_at := coalesce(case r.status when 'delivered' then r.t_end when 'transit' then r.t_tr when 'loaded' then r.t_load when 'ok' then r.t_conf end, r.held);
      select case r.status when 'hold' then 'Giữ chỗ' when 'ok' then 'Xác nhận' when 'loaded' then 'Đã load' when 'transit' then 'Đang giao' when 'delivered' then 'Đã giao'
                           when 'failed' then 'Giao lỗi' when 'rejected' then 'Từ chối' when 'cancelled' then 'Hủy booking' else 'Đổi ngày' end,
             r.bk || ' · ' || r.cname || case r.status
               when 'hold' then ' giữ chỗ ' || app.fmt(r.tons) || ' MT ngày ' || app.dm(r.day)
               when 'ok' then ' ' || app.fmt(r.tons) || ' MT ngày ' || app.dm(r.day) || ' đã xác nhận. Xe: ' || coalesce(r.trucks, '')
               when 'loaded' then ' đã load hàng' when 'transit' then ' đang giao' when 'delivered' then ' đã giao'
               when 'failed' then ' giao không thành công. Chọn ngày giao lại hoặc hủy.' when 'rejected' then ' bị từ chối: hết xe'
               when 'cancelled' then ' đã hủy' else ' đề nghị đổi ngày' end,
             case r.status when 'hold' then array[r.lg, r.sales] when 'cancelled' then array[r.lg, r.sales] when 'transit' then array[r.sales] else array[r.cs, r.sales] end
        into v_type, v_txt, v_to;
      with x as (
        insert into app.notifications (user_id, type, text, link, read_at, created_at)
        select u, v_type, v_txt, jsonb_build_object('bk', r.bk), case when random() < 0.45 then v_at + interval '20 minutes' end, v_at
          from unnest(v_to) u where u is not null and exists (select 1 from app.profiles p where p.user_id = u and p.active)
        returning id)
      insert into app.demo_marks select 'notif', id::text from x;
      n_not := n_not + 1;
    end;
  end loop;

  -- ---------- tổng kết ----------
  select string_agg(line, E'\n' order by ord) into v_out from (
    select 1 as ord, format('%s %s: %s đơn, %s MT', case when day < v_cm then 'Tháng trước' when day <= v_today then 'Tháng này ' else 'Sắp tới   ' end, seg, count(*), round(sum(tons))) as line
      from dgi group by case when day < v_cm then 0 when day <= v_today then 1 else 2 end, day < v_cm, day <= v_today, seg
    ) z;
  return format('Đã tạo %s đơn mẫu (bỏ %s đơn không đủ chỗ), %s yêu cầu đặt hàng, %s cuộc Trao đổi, %s thông báo.%s%s',
                n_made, n_drop, n_req, n_talk, n_not, E'\nTheo trạng thái: ' || (select string_agg(s || '=' || c, ', ' order by c desc) from (select status s, count(*) c from dgi group by status) q),
                E'\nTheo giai đoạn/segment:\n' || coalesce(v_out, ''));
end $$;

-- ---------- xóa sạch dữ liệu demo ----------
create or replace function app.gen_demo_clear() returns text
language plpgsql security definer set search_path = '' as $$
declare n_bk int; n_req int; n_th int; n_nt int; n_fl int;
begin
  delete from app.notifications where id::text in (select id from app.demo_marks where kind = 'notif'); get diagnostics n_nt = row_count;
  delete from app.talk_threads where id::text in (select id from app.demo_marks where kind = 'thread'); get diagnostics n_th = row_count;
  delete from app.order_requests where id::text in (select id from app.demo_marks where kind = 'req'); get diagnostics n_req = row_count;
  delete from app.audit_log where entity_id in (select id from app.demo_marks where kind = 'bk');
  delete from app.bookings where id in (select id from app.demo_marks where kind = 'bk'); get diagnostics n_bk = row_count;
  delete from app.truck_days where truck_code in (select id from app.demo_marks where kind = 'truck');
  delete from app.daily_fleet f where (f.warehouse_code || '|' || f.day) in (select id from app.demo_marks where kind = 'fleet'); get diagnostics n_fl = row_count;
  delete from app.demo_marks;
  return format('Đã xóa dữ liệu demo: %s đơn, %s yêu cầu, %s cuộc Trao đổi, %s thông báo, %s ngày khai báo xe.', n_bk, n_req, n_th, n_nt, n_fl);
end $$;

revoke all on function app.gen_demo_orders(numeric, numeric) from public, anon, authenticated;
revoke all on function app.gen_demo_clear() from public, anon, authenticated;
revoke all on function app._dg_ts(date, double precision), app._dg_wd(date, int), app._dg_nx(timestamptz, double precision), app._dg_pick(text[]),
  app._dg_h(text, text, text, text, text, uuid, timestamptz), app._dg_a(text, text, uuid, timestamptz) from public, anon, authenticated;

-- Chạy: bỏ dấu -- ở dòng dưới nếu chỉ muốn tạo hàm mà chưa sinh dữ liệu
select app.gen_demo_orders();

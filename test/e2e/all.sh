cd /home/claude/truck-capacity-portal
for t in run gs past mfa rebook offday truckedit blfilter; do
  fuser -k 8787/tcp >/dev/null 2>&1
  bash test/reset.sh >/dev/null 2>&1
  ARGS=""
  if [ $t = past ]; then psql -h /tmp -U postgres -d t -qAc "update app.bookings set day = app.today() - 1 where id in (select id from app.bookings where status='hold' order by id limit 2)" >/dev/null; fi
  if [ $t = rebook ]; then ARGS="$(psql -h /tmp -U postgres -d t -Atc "select b.id from app.bookings b join app.customers c on c.id=b.customer_id where c.code='KH0102' and b.status='hold' limit 1") $(psql -h /tmp -U postgres -d t -Atc "select min(day) from app.daily_fleet where warehouse_code='PMY' and day > app.today()+5")"; fi
  if [ $t = offday ]; then psql -h /tmp -U postgres -d t -qc "update app.settings set value=to_jsonb(array[(app.today()+2+(extract(dow from app.today()+2)=0)::int)::text]) where key='holidays'"; D=$(psql -h /tmp -U postgres -d t -Atc "select value->>0 from app.settings where key='holidays'"); ARGS="$D $(psql -h /tmp -U postgres -d t -Atc "select min(day) from app.bookings where status in ('hold','ok') and day > '$D'")"; fi
  if [ $t = truckedit ]; then ARGS="$(psql -h /tmp -U postgres -d t -Atc "select min(b.day) from app.bookings b join app.allocations a on a.booking_id=b.id where b.status='ok' and b.day > app.today() and a.truck_code like '%-DK-01'")"; fi
  if [ $t = blfilter ]; then psql -h /tmp -U postgres -d t -qc "update app.customers set cs_user_id='00000000-0000-0000-0000-0000000000c1' where code in ('KH0102','KH0201'); update app.bookings set day = date_trunc('month', app.today())::date - 10, status='ok' where id = (select id from app.bookings where status='ok' order by id desc limit 1)"; ARGS="$(psql -h /tmp -U postgres -d t -Atc "select id from app.bookings where day < date_trunc('month', app.today())::date limit 1")"; fi
  python3 test/e2e/server.py 8787 > /tmp/srv.log 2>&1 & SP=$!
  sleep 1; echo "== $t"; timeout 400 node test/e2e/$t.mjs $ARGS; kill $SP; sleep 1
done; echo ALLDONE

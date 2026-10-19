#!/bin/bash
# Chạy test SQL với "hôm nay" giả lập cho đủ 7 ngày trong tuần (SHIFT=0..6); bắt test phụ thuộc ngày.
cd "$(dirname "$0")/.."
BAD=""
for s in 0 1 2 3 4 5 6; do
  d=$(date -d "+$s day" +%a)
  if SHIFT=$s bash test/sql.sh > /tmp/sqlweek.$s.log 2>&1; then echo "OK   +$s ($d)"; else echo "FAIL +$s ($d):"; grep "^FAIL" /tmp/sqlweek.$s.log; BAD="$BAD +$s"; fi
done
[ -z "$BAD" ] && echo "ALL 7 DAYS PASSED" || { echo "FAILED DAYS:$BAD"; exit 1; }

#!/bin/bash
# Chạy toàn bộ test SQL: mỗi file dựng lại database; số lỗi thật phải bằng số dòng "expect ERROR"
cd "$(dirname "$0")/.."
FAILED=""
for f in test/[1-9]*.sql; do
  if head -1 "$f" | grep -q "^-- legacy"; then echo "SKIP $f (legacy)"; continue; fi
  bash test/reset.sh >/dev/null 2>&1 || { echo "reset lỗi"; exit 1; }
  out=$(psql -h /tmp -U postgres -d t -q -f "$f" 2>&1)
  got=$(echo "$out" | grep -c "^psql:.*ERROR:")
  exp=$(head -1 "$f" | sed -n 's/^-- expect-errors: \([0-9]*\).*/\1/p'); [ -z "$exp" ] && exp=$(grep -c "^\\\\echo expect ERROR" "$f")
  if [ "$got" = "$exp" ]; then echo "OK   $f ($exp lỗi mong đợi)"; else echo "FAIL $f: $got lỗi, mong đợi $exp"; echo "$out" | grep "ERROR:" | head -5; FAILED="$FAILED $f"; fi
done
[ -z "$FAILED" ] && echo "ALL SQL PASSED" || { echo "FAILED:$FAILED"; exit 1; }

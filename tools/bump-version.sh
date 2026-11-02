#!/bin/sh
# Đổi số phiên bản: bash tools/bump-version.sh 3.14.0 "Ghi chú ngắn" [force]
# Cập nhật ?v= của các file JS trong index.html, APP_V, version.json, tên cache của sw.js
# và thêm một dòng vào web/changelog.json (mục "Có gì mới" trong app).
# Thêm chữ force ở cuối: bản bắt buộc – app đếm ngược 60 giây rồi tự tải lại (dùng khi sửa lỗi quan trọng).
set -e
V="$1"; N="${2:-}"; F="${3:-}"; [ -n "$V" ] || { echo "Cách dùng: $0 <phiên bản> [ghi chú] [force]"; exit 1; }
cd "$(dirname "$0")/../web"
sed -i -E "s/\?v=[0-9A-Za-z.\-]+\"/?v=$V\"/g; s/window\.APP_V=\"[^\"]*\"/window.APP_V=\"$V\"/" index.html
sed -i -E "s/const CACHE='tcp-shell-[^']*'/const CACHE='tcp-shell-$V'/" sw.js
V="$V" N="$N" F="$F" python3 - <<'PY'
import json, os, datetime
v, n, f = os.environ['V'], os.environ['N'], os.environ['F'] == 'force'
ver = {'v': v, 'note': n}
if f: ver['force'] = True
with open('version.json', 'w', encoding='utf-8') as fh: json.dump(ver, fh, ensure_ascii=False); fh.write('\n')
try:
    log = json.load(open('changelog.json', encoding='utf-8'))
except Exception:
    log = []
log = [x for x in log if x.get('v') != v]
log.insert(0, {'v': v, 'date': datetime.date.today().isoformat(), 'note': n})
with open('changelog.json', 'w', encoding='utf-8') as fh: json.dump(log[:30], fh, ensure_ascii=False, indent=1); fh.write('\n')
PY
echo "Đã đổi sang $V"

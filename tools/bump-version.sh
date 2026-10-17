#!/bin/sh
# Đổi số phiên bản: bash tools/bump-version.sh 3.14.0 "Ghi chú ngắn"
# Cập nhật ?v= của các file JS trong index.html, APP_V, version.json và tên cache của sw.js.
set -e
V="$1"; N="${2:-}"; [ -n "$V" ] || { echo "Cách dùng: $0 <phiên bản> [ghi chú]"; exit 1; }
cd "$(dirname "$0")/../web"
sed -i -E "s/\?v=[0-9A-Za-z.\-]+\"/?v=$V\"/g; s/window\.APP_V=\"[^\"]*\"/window.APP_V=\"$V\"/" index.html
sed -i -E "s/const CACHE='tcp-shell-[^']*'/const CACHE='tcp-shell-$V'/" sw.js
printf '{"v":"%s","note":"%s"}\n' "$V" "$N" > version.json
echo "Đã đổi sang $V"

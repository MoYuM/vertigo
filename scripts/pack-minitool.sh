#!/usr/bin/env bash
# 把 dist-minitool/ 打成可直接上传的小工具 zip。
# 压的是目录内容而不是目录本身 —— 多套一层 index.html 就不在 zip 根，容器加载不了。
set -euo pipefail
cd "$(dirname "$0")/.."

OUT_DIR=dist-minitool
ZIP=vertigo-minitool.zip
HARD_LIMIT=$((10 * 1024 * 1024))   # 容器上传上限
SOFT_LIMIT=$((2 * 1024 * 1024))    # 加载体验建议值

[ -f "$OUT_DIR/index.html" ] || { echo "缺少 $OUT_DIR/index.html，先跑 pnpm build:minitool" >&2; exit 1; }

rm -f "$ZIP"
(cd "$OUT_DIR" && zip -rq "../$ZIP" . -x '*.DS_Store' '*.map')

SIZE=$(wc -c < "$ZIP" | tr -d ' ')
if [ "$SIZE" -gt "$HARD_LIMIT" ]; then
  echo "ERROR zip $((SIZE / 1024)) KiB 超过 10 MiB 上传上限" >&2
  exit 1
elif [ "$SIZE" -gt "$SOFT_LIMIT" ]; then
  echo "WARN  zip $((SIZE / 1024)) KiB 超过建议的 2 MiB"
fi

echo "$ZIP  $((SIZE / 1024)) KiB"
unzip -l "$ZIP"

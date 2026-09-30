#!/bin/zsh
# 跑一轮 X 采集。launchd 定时调用；也可手动执行。
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
sed "s#__SERVICE_DIR__#${DIR}#" "$DIR/x/collect-x.mjs" | ego-browser nodejs

#!/bin/sh
# 归档 background/子会话（`paseo archive` 解析不到它们）
set -eu
R=/Applications/Paseo.app/Contents/Resources
exec env ELECTRON_RUN_AS_NODE=1 "$R/../Frameworks/Paseo Helper.app/Contents/MacOS/Paseo Helper" \
  "$R/app.asar.unpacked/dist/daemon/node-entrypoint-runner.js" node-script "$(dirname "$0")/archive-agent.mjs" "$@"

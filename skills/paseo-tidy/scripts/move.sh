#!/bin/sh
# 用 Paseo 自带的 Electron 当 node 运行 move.mjs，才能加载 app.asar 里的客户端
set -eu
R=/Applications/Paseo.app/Contents/Resources
exec env ELECTRON_RUN_AS_NODE=1 "$R/../Frameworks/Paseo Helper.app/Contents/MacOS/Paseo Helper" \
  "$R/app.asar.unpacked/dist/daemon/node-entrypoint-runner.js" node-script "$(dirname "$0")/move.mjs" "$@"

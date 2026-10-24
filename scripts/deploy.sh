#!/usr/bin/env bash
# 构建并部署 vertigo 静态站到服务器（薄 wrapper，逻辑在 dev-kit static-deploy.sh）。
# 读取项目根目录 .env.deploy 中的配置（含服务器信息，不进仓库，模板见 .env.deploy.example）。
#
# 前置（用户侧，本脚本不代办）：
#   1. 宝塔 Nginx 在 support.hedianer.cn 站点里加一段
#        location /vertigo/ { alias DEPLOY_PATH; try_files $uri $uri/ $uri.html =404; }
#      DEPLOY_PATH 用独立目录，跟 hedian-support 自己的部署目录隔开，
#      避免被对方部署脚本的 --delete 误删。
#   2. 本地 SSH 公钥已加入服务器 ~/.ssh/authorized_keys。
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
OUT_DIR=dist exec bash "$HOME/Desktop/dev-kit/scripts/web/static-deploy.sh" "$@"

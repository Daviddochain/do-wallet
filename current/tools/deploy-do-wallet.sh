#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/dochain-wallet}"
SOURCE_ROOT="${SOURCE_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
CURRENT_DIR="$APP_ROOT/current"

echo "Do-Wallet deploy"
echo "Source: $SOURCE_ROOT/current"
echo "Target: $CURRENT_DIR"
echo "Single active route: current -> $CURRENT_DIR"
echo "No backup/archive files will be created by this deploy."

if [ ! -f "$SOURCE_ROOT/current/frontend/version.json" ]; then
  echo "Missing frontend/version.json in release source." >&2
  exit 1
fi

if ! grep -q '"name": "Do-Wallet"' "$SOURCE_ROOT/current/frontend/version.json"; then
  echo "Release source is not labelled Do-Wallet." >&2
  exit 1
fi

mkdir -p "$CURRENT_DIR"

echo "Syncing active release files."
rsync -a --delete \
  --exclude 'station-assets/node_modules/' \
  --exclude 'station-assets/.env' \
  --exclude 'station-assets.env' \
  --exclude 'frontend/_local-backups/' \
  "$SOURCE_ROOT/current/" "$CURRENT_DIR/"

if [ ! -d "$CURRENT_DIR/station-assets/node_modules" ]; then
  echo "station-assets node_modules missing; installing production dependencies."
  (cd "$CURRENT_DIR/station-assets" && npm ci --omit=dev)
else
  echo "Preserved existing station-assets node_modules."
fi

if [ "${INSTALL_NGINX:-0}" = "1" ]; then
  echo "Installing nginx config."
  cp "$CURRENT_DIR/server/nginx/dochain-wallet" /etc/nginx/sites-available/dochain-wallet
  ln -sf /etc/nginx/sites-available/dochain-wallet /etc/nginx/sites-enabled/dochain-wallet
fi

if command -v nginx >/dev/null 2>&1; then
  nginx -t
fi

if command -v systemctl >/dev/null 2>&1; then
  if systemctl list-unit-files | grep -q '^do-wallet-station-assets\.service'; then
    systemctl restart do-wallet-station-assets
  elif systemctl list-unit-files | grep -q '^dochain-wallet-assets\.service'; then
    systemctl restart dochain-wallet-assets
  elif systemctl list-unit-files | grep -q '^station-assets\.service'; then
    systemctl restart station-assets
  fi
  if systemctl list-unit-files | grep -q '^nginx\.service'; then
    systemctl reload nginx
  fi
fi

if [ "${CONFIRM_DELETE_OLD_RELEASES:-}" = "yes" ]; then
  echo "Cleaning old server release directories."
  find "$APP_ROOT" -mindepth 1 -maxdepth 1 \
    ! -name current \
    ! -name releases \
    -print
  if [ -d "$APP_ROOT/releases" ]; then
    find "$APP_ROOT/releases" -mindepth 1 -maxdepth 1 -type d ! -name '*do-wallet*' -print -exec rm -rf {} +
  fi
else
  echo "Old release cleanup skipped. Set CONFIRM_DELETE_OLD_RELEASES=yes after verifying Do-Wallet live."
fi

echo "Deploy complete."
echo "Client browser localStorage is not touched by this server deploy."

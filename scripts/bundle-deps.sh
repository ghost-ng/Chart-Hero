#!/usr/bin/env bash
# Regenerate the vendored node_modules tarball for Linux CI.
# Run this locally (Windows) whenever package.json or package-lock.json changes.
#
# The tarball contains Linux-x64 native binaries only (not Windows) to keep
# the size down. Local dev uses npm ci to install the correct platform
# binaries automatically.
#
# Usage:
#   bash scripts/bundle-deps.sh
#   npm ci   # run after to restore Windows binaries for local dev
set -euo pipefail
cd "$(dirname "$0")/.."

# ── Pinned versions (update when deps change) ──────────────────────
ESBUILD_VER="0.27.3"
ROLLUP_VER="4.57.1"
LIGHTNINGCSS_VER="1.30.2"
TAILWIND_OXIDE_VER="4.1.18"
# ────────────────────────────────────────────────────────────────────

echo "=== Step 1/4: Clean install ==="
npm ci

echo ""
echo "=== Step 2/4: Fetching Linux-x64 native binaries ==="
# npm ci only installs platform-native optional deps (Windows on Windows).
# We use npm pack to download Linux packages as tarballs, then extract them
# directly into node_modules. This avoids npm install --force which replaces
# platform binaries instead of adding alongside them.

WORK=$(mktemp -d)
trap "rm -rf '$WORK'" EXIT

install_linux_pkg() {
  local pkg="$1"    # e.g. "@esbuild/linux-x64@0.27.3"
  local dest="$2"   # e.g. "node_modules/@esbuild/linux-x64"

  echo "  $pkg"
  # Download the package tarball
  local tgz
  tgz=$(cd "$WORK" && npm pack "$pkg" --pack-destination . 2>/dev/null)
  # Extract into node_modules (tarball root is "package/")
  mkdir -p "$dest"
  tar xzf "$WORK/$tgz" -C "$dest" --strip-components=1
  rm -f "$WORK/$tgz"
}

install_linux_pkg "@esbuild/linux-x64@${ESBUILD_VER}"            "node_modules/@esbuild/linux-x64"
install_linux_pkg "@rollup/rollup-linux-x64-gnu@${ROLLUP_VER}"   "node_modules/@rollup/rollup-linux-x64-gnu"
install_linux_pkg "lightningcss-linux-x64-gnu@${LIGHTNINGCSS_VER}" "node_modules/lightningcss-linux-x64-gnu"
install_linux_pkg "@tailwindcss/oxide-linux-x64-gnu@${TAILWIND_OXIDE_VER}" "node_modules/@tailwindcss/oxide-linux-x64-gnu"

echo ""
echo "=== Step 3/4: Stripping Windows native binaries ==="
rm -rf \
  node_modules/@esbuild/win32-* \
  node_modules/@rollup/rollup-win32-* \
  node_modules/lightningcss-win32-* \
  node_modules/@tailwindcss/oxide-win32-*
echo "  Removed win32 binaries"

echo ""
echo "=== Step 4/4: Creating tarball ==="
tar czf node_modules.tar.gz node_modules/

SIZE=$(du -sh node_modules.tar.gz | cut -f1)
echo "  node_modules.tar.gz — $SIZE"
echo ""
echo "Done! Now run 'npm ci' to restore Windows binaries for local dev."

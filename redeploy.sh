#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
python3 "$ROOT/build_site.py"
git -C "$ROOT" config user.name "JediCode6767"
git -C "$ROOT" config user.email "339253940+JediCode6767@users.noreply.github.com"
git -C "$ROOT" add --all

if git -C "$ROOT" diff --cached --quiet; then
  printf '%s\n' "Math Lab is already up to date."
  exit 0
fi

git -C "$ROOT" commit -m "Update Math Lab site"
git -C "$ROOT" push origin main

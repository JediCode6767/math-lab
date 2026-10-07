#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if ! GIT_TERMINAL_PROMPT=0 git -C "$ROOT" push --dry-run origin main >/dev/null 2>&1; then
  printf '%s\n' "GitHub push access is not set up for this Mac yet. Install GitHub CLI and run: gh auth login && gh auth setup-git" >&2
  exit 1
fi

python3 "$ROOT/build_site.py"
git -C "$ROOT" config user.name "JediCode6767"
git -C "$ROOT" config user.email "339253940+JediCode6767@users.noreply.github.com"
git -C "$ROOT" add --all

if git -C "$ROOT" diff --cached --quiet; then
  printf '%s\n' "No new Math Lab changes to commit."
else
  git -C "$ROOT" commit -m "Update Math Lab site"
fi

git -C "$ROOT" push origin main

#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target_dir="$repo_root/references/upstream-paperclip"
meta_file="$repo_root/references/upstream.json"
upstream_url="${UPSTREAM_URL:-https://github.com/paperclipai/paperclip.git}"
upstream_ref="${UPSTREAM_REF:-master}"

mkdir -p "$repo_root/references"

if [ -d "$target_dir/.git" ]; then
  git -C "$target_dir" fetch --depth 1 origin "$upstream_ref"
  git -C "$target_dir" checkout -B "$upstream_ref" "origin/$upstream_ref"
else
  git clone --depth 1 --branch "$upstream_ref" "$upstream_url" "$target_dir"
fi

commit_sha="$(git -C "$target_dir" rev-parse HEAD)"
synced_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat >"$meta_file" <<EOF
{
  "upstreamUrl": "$upstream_url",
  "branch": "$upstream_ref",
  "commit": "$commit_sha",
  "syncedAt": "$synced_at"
}
EOF

echo "Upstream reference synced:"
echo "  URL:    $upstream_url"
echo "  Branch: $upstream_ref"
echo "  Commit: $commit_sha"


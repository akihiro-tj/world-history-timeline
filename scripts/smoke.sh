#!/usr/bin/env bash
# デプロイ先（本番・プレビュー）の基本動作を確かめる
# 使い方: bash scripts/smoke.sh https://example.workers.dev
# デプロイ直後は新しいバージョンが行き渡っていないことがあるので、失敗したら間を置いてやり直す
set -euo pipefail

base="${1%/}"
attempts="${SMOKE_ATTEMPTS:-10}"
interval="${SMOKE_INTERVAL:-6}"

fail() {
  echo "$1" >&2
  return 1
}

cache_control() {
  curl -fsS -D - -o /dev/null "$1" | tr -d '\r' | awk -F': ' 'tolower($1) == "cache-control" { print $2 }'
}

check() {
  local html script js data cache
  html="$(curl -fsS "$base/")" || fail "トップページが取得できません" || return 1

  script="$(grep -o '/assets/index-[A-Za-z0-9_-]*\.js' <<<"$html" | head -n1)"
  [[ -n "$script" ]] || fail "トップページに JS の参照がありません" || return 1
  js="$(curl -fsS "$base$script")" || fail "JS が取得できません: $script" || return 1

  # 年表データの URL は JS に埋め込まれている（import ... from "./timeline.json?url"）
  data="$(grep -o 'assets/timeline-[A-Za-z0-9_-]*\.json' <<<"$js" | head -n1)"
  [[ -n "$data" ]] || fail "JS に年表データの参照がありません" || return 1
  curl -fsS "$base/$data" | jq -e '(.lanes | type) == "array"' >/dev/null ||
    fail "年表データが取得できません: $data" || return 1

  cache="$(cache_control "$base/$data")"
  [[ "$cache" == *immutable* ]] || fail "年表データに immutable が付いていません: $cache" || return 1
  cache="$(cache_control "$base$script")"
  [[ "$cache" == *immutable* ]] || fail "JS に immutable が付いていません: $cache" || return 1
}

for ((i = 1; i <= attempts; i++)); do
  if check; then
    echo "スモークテスト成功: $base"
    exit 0
  fi
  if ((i < attempts)); then
    echo "${i} 回目の確認に失敗しました。${interval} 秒後にやり直します" >&2
    sleep "$interval"
  fi
done

echo "スモークテスト失敗: $base（${attempts} 回試しました）" >&2
exit 1

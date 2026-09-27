---
version: alpha
name: 世界史年表
description: 世界史の王朝と王の移り変わりを年表で確かめるための、装飾を抑えたシンプルなデザイン
colors:
  primary: "#1f3a5f"
  on-primary: "#ffffff"
  surface: "#ffffff"
  on-surface: "#1f2328"
  muted: "#5b6570"
  border: "#d5dbe1"
  grid: "#eceef1"
  bar-a: "#e3e8ef"
  bar-b: "#cbd5e2"
  on-bar: "#1d2533"
  error-surface: "#fdecea"
  on-error-surface: "#8a1c12"
typography:
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
  heading:
    fontFamily: "system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: "system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
rounded:
  sm: 3px
  md: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
components:
  toggle:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
  toggle-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  lane-heading:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.heading}"
  year-tick:
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
  grid-line:
    backgroundColor: "{colors.grid}"
  bar:
    backgroundColor: "{colors.bar-a}"
    textColor: "{colors.on-bar}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
  bar-alt:
    backgroundColor: "{colors.bar-b}"
    textColor: "{colors.on-bar}"
  outside-label:
    textColor: "{colors.on-surface}"
    typography: "{typography.caption}"
  divider:
    backgroundColor: "{colors.border}"
  error-message:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.on-error-surface}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
---

# 世界史年表

## Overview

受験生・学習者が、世界史の王朝と王の移り変わりを年表で確かめるための画面。装飾を抑え、年表の棒と名前を主役にする。

## Colors

- `surface`・`on-surface`: 画面の地と文字
- `primary`・`on-primary`: 切り替えボタンの選ばれている側
- `muted`: 年の目盛り、棒の中の期間、棒の外のラベルの引き出し線
- `border`: 見出しと行の区切り線（`divider`）
- `grid`: 100 年ごとの目盛りの線
- `bar-a`・`bar-b`: 棒の地。同じ行で隣り合う棒を見分けるため、交互に使う
- `on-bar`: 棒の中の名前
- `error-surface`・`on-error-surface`: 読み込みに失敗したときのメッセージ

## Typography

- `body`: 読み込み中の表示とエラー
- `label`: 切り替えボタン
- `heading`: 行（国・地域）の名前
- `caption`: 棒の名前と期間、棒の外のラベル、年の目盛り。行の高さは `src/timeline/layout.ts` の `LINE_HEIGHT`（16px）で固定する

## Layout

- 画面の上部に切り替えボタン 2 つ（左に主題、右に向き）、その下を年表が占める
- 年表の縮尺と棒の寸法は、位置の計算に使うため `src/timeline/layout.ts` と `src/timeline/Timeline.tsx` の定数で持つ（1 年 = 2px、横向きの棒の太さ 36px）
- 縦向きは、左端に年の目盛り（幅 48px）、上端に行の名前を貼り付け、行を列として等分に並べる（1 列の最小幅 120px）
- 横向きは、上端に年の目盛り、各行の左上に行の名前を貼り付ける

## Elevation & Depth

影は使わない。見出しの区切りは `divider` の線だけで表す。

## Shapes

- 棒とエラーのメッセージは `sm`
- 切り替えボタンの枠は `md`

## Components

- `toggle`・`toggle-active`: 切り替えボタン（通常と、選ばれている側）
- `lane-heading`: 行の名前
- `year-tick`・`grid-line`: 年の目盛りの文字と線
- `bar`・`bar-alt`: 棒（交互に使う）
- `outside-label`: 棒に収まらない名前を棒の外に出したラベル
- `divider`: 見出しと行の区切り線
- `error-message`: 読み込みに失敗したときのメッセージ

## Do's and Don'ts

- 色・角丸・余白・文字は front matter のトークンだけを使い、コードに値を直接書かない
- spec の UI 文言の一覧にない文言を足さない
- 棒に影やグラデーションを付けない

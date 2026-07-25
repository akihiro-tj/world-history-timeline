---
colors:
  primary: "#1a1c1e"
  surface: "#fafaf9"
  panel: "#ffffff"
  ink: "#1a1c1e"
  muted: "#6b7280"
  line: "#e5e4e0"
  accent: "#4a90d9"
  ruler: "#3b6fb0"
  person: "#7a5cb8"
  event: "#bd541d"
  onBar: "#ffffff"
  action: "#2f6fb5"
colorsDark:
  surface: "#16181c"
  panel: "#1e2126"
  ink: "#e8e6e1"
  muted: "#9aa0aa"
  line: "#33373e"
  accent: "#5b9fe3"
  ruler: "#6fa3d9"
  person: "#a889d9"
  event: "#e08a4a"
  onBar: "#16181c"
  action: "#2f6fb5"
typography:
  base:
    fontFamily: system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif
    fontSize: 14px
    fontWeight: 400
  label:
    fontSize: 12px
    fontWeight: 500
  heading:
    fontSize: 16px
    fontWeight: 600
  display:
    fontSize: 20px
    fontWeight: 700
layout:
  spacingUnit: 4px
shapes:
  cornerRadius: 6px
  barCornerRadius: 4px
---

# 世界史タイムライン デザイン

## Overview

学習ツールとして「静かで読みやすい」ことを最優先する。長時間眺める画面なので、
彩度の低い紙のような背景（{colors.surface}）に、情報の主役であるエントリの
バーだけが色を持つ。装飾は加えない。

## Colors

- {colors.ink}: 本文・見出し。ほぼ黒のインク色
- {colors.muted}: 補助テキスト（年ラベル・説明）
- {colors.ruler} / {colors.person} / {colors.event}: エントリ種別の色。
  統治者は青系、人物は紫系、事件は橙系で、色覚多様性に配慮して明度差もつける
- 地域色はデータ（regions.json）が持ち、レーン背景の淡色（不透明度はライト 6%・
  ダーク 12%）にのみ使う
- {colors.accent}: 選択中エントリの枠色。白のハローを外側に重ね、どのバー色の上でも視認できるようにする
- {colors.onBar}: バー内ラベルの文字色。ライトは白、ダークはバー色に対する
  コントラストを保つため暗色に切り替える
- {colors.action}: ボタン背景専用の色。{colors.accent} は選択枠としての視認性を
  優先して明るく保つため、ボタン背景には使わない

## テーマ切り替え

`<html data-color-theme>` でライト／ダークを切り替える。初期値は OS の
`prefers-color-scheme` に従い、ユーザーが明示的に切り替えたら localStorage に
保存して以後はそれを優先する。ダークは背景（{colors.surface} → {colorsDark.surface}
など）を沈め、前景のバー色は明度を上げて浮かせることで、ライトの設計意図
（彩度の低い背景に、主役であるバーだけが色を持つ）をダークでも保つ。
地域色（regions.json）はライト・ダークで同じ値を使うが、ダークは背景が沈んで
淡色が判別しにくくなるため、レーン背景の不透明度をライトの 6% からダークは
12% に引き上げる。

## Do's and Don'ts

- Do: テキストは {colors.ink} または {colors.muted} のみ。コントラスト比 AA を守る
- Do: 種別の描き分けは色相＋形状（バー / ◆）の二重符号化にする
- Do: バー上の文字は {colors.onBar} を使う（白を直接指定しない）
- Do: ボタン背景は {colors.action}、選択枠は {colors.accent} と用途で使い分ける
- Don't: 地域色を文字色に使わない
- Don't: 地域色にダーク専用値を持たせない（データの管轄を保つ）
- Don't: グラデーション・影・アニメーションを装飾目的で足さない

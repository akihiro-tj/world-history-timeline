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
  event: "#c2571f"
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
- 地域色はデータ（regions.json）が持ち、レーン背景の淡色（不透明度 6%）にのみ使う
- {colors.accent}: 選択中エントリの枠色。白のハローを外側に重ね、どのバー色の上でも視認できるようにする

## Do's and Don'ts

- Do: テキストは {colors.ink} または {colors.muted} のみ。コントラスト比 AA を守る
- Do: 種別の描き分けは色相＋形状（バー / ◆）の二重符号化にする
- Don't: 地域色を文字色に使わない
- Don't: グラデーション・影・アニメーションを装飾目的で足さない

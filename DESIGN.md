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

# World History Timeline Design

## Overview

As a learning tool, this design puts "quiet and readable" above everything
else. The screen is meant to be studied for long stretches, so a
low-saturation, paper-like background ({colors.surface}) carries the page and
only the entry bars — the information itself — get color. No decoration is
added.

## Colors

- {colors.ink}: body text and headings. Near-black ink.
- {colors.muted}: supporting text (year labels, descriptions).
- {colors.ruler} / {colors.person} / {colors.event}: entry-type colors.
  Rulers are blue, persons purple, and events orange, with lightness
  differences layered on top of hue for color-vision accessibility.
- Region colors belong to the data (regions.json) and are used only as pale
  lane backgrounds (6% opacity).

## Do's and Don'ts

- Do: use only {colors.ink} or {colors.muted} for text. Keep AA contrast.
- Do: double-encode entry types with hue plus shape (bar / diamond).
- Don't: use region colors for text.
- Don't: add gradients, shadows, or animation as decoration.

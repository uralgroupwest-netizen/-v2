#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Efimov Group — сборка логотипа в векторе.
Буквы нарисованы геометрически: одна толщина штриха, прямые углы.
"""

S = 20      # толщина штриха
H = 100     # высота прописной
GAP = 12    # межбуквенный пробел
WORDGAP = 44

def r(x, y, w, h):
    return f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}"/>'

def p(*pts):
    s = " ".join(f"{a:g},{b:g}" for a, b in pts)
    return f'<polygon points="{s}"/>'

def path_evenodd(d):
    return f'<path fill-rule="evenodd" d="{d}"/>'

C = 10  # скос на стойке

def stem_ch(h=H):
    """Вертикальная стойка со скосом на верхнем левом углу."""
    return p((C,0),(S,0),(S,h),(0,h),(0,C))

LETTERS = {}
LETTERS["E"] = (70, [stem_ch(), r(S,0,50,S), r(S,40,38,S), r(S,80,50,S)])
LETTERS["F"] = (70, [stem_ch(), r(S,0,50,S), r(S,40,38,S)])
LETTERS["I"] = (S,  [stem_ch()])
LETTERS["M"] = (90, [stem_ch(), r(70,0,S,H), r(S,0,50,S), r(35,S,S,38)])
LETTERS["O"] = (80, [path_evenodd("M10 0H80V100H0V10L10 0Z M20 20H60V80H20V20Z")])
LETTERS["V"] = (80, [p((0,0),(22,0),(51,100),(29,100)), p((58,0),(80,0),(51,100),(29,100))])
LETTERS["G"] = (85, [p((C,0),(85,0),(85,S),(0,S),(0,C)), r(0,S,S,80-S), r(0,80,85,S), r(65,50,S,50), r(45,50,40,S)])
LETTERS["R"] = (75, [stem_ch(), r(S,0,55,S), r(55,0,S,60), r(S,40,55,S),
                     p((50,60),(72,60),(75,100),(53,100))])
LETTERS["U"] = (80, [r(0,0,S,80), r(60,0,S,80), r(0,80,80,S)])
LETTERS["P"] = (75, [stem_ch(), r(S,0,55,S), r(55,0,S,60), r(S,40,55,S)])


def word(text):
    """Возвращает (ширина, svg-группа) для слова."""
    parts, x = [], 0
    for ch in text:
        if ch == " ":
            x += WORDGAP
            continue
        w, shapes = LETTERS[ch]
        inner = "".join(shapes)
        parts.append(f'<g transform="translate({x:g},0)">{inner}</g>')
        x += w + GAP
    if text and text[-1] != " ":
        x -= GAP
    return x, "".join(parts)


W_EFIMOV, G_EFIMOV = word("EFIMOV")
W_GROUP, G_GROUP = word("GROUP")
W_WORD = W_EFIMOV + WORDGAP + W_GROUP


def mark(red, dark, light):
    """Знак: три красные полосы со срезом + угловая G. Финальная композиция Антона."""
    return f'''<g>
  <polygon points="10,8 112,8 90,30 10,30" fill="{red}"/>
  <polygon points="10,54 215,54 193,76 10,76" fill="{red}"/>
  <polygon points="10,100 112,100 90,122 10,122" fill="{red}"/>
  <polygon points="132,8 290,8 290,30 110,30" fill="{dark}"/>
  <rect x="110" y="30" width="22" height="70" fill="{dark}"/>
  <rect x="110" y="100" width="180" height="22" fill="{dark}"/>
  <rect x="268" y="54" width="22" height="68" fill="{dark}"/>
  <polygon points="215,54 290,54 290,76 193,76" fill="{dark}"/>
</g>'''


def mark_mono(color):
    return f'''<g fill="{color}">
  <polygon points="10,8 96,8 74,30 10,30"/>
  <polygon points="10,54 190,54 168,76 10,76"/>
  <polygon points="10,100 96,100 74,122 10,122"/>
  <polygon points="132,8 290,8 290,30 110,30"/>
  <rect x="110" y="30" width="22" height="70"/>
  <rect x="110" y="100" width="180" height="22"/>
  <rect x="268" y="54" width="22" height="68"/>
  <polygon points="215,54 290,54 290,76 193,76"/>
</g>'''


def compact(fg, accent=None):
    """Компактный знак — только G, для фавикона и аватарки."""
    a = accent or fg
    return f'''<g>
  <polygon points="22,0 180,0 180,22 0,22" fill="{fg}"/>
  <rect x="0" y="22" width="22" height="70" fill="{fg}"/>
  <rect x="0" y="92" width="180" height="22" fill="{fg}"/>
  <rect x="158" y="46" width="22" height="68" fill="{fg}"/>
  <rect x="105" y="46" width="75" height="22" fill="{fg}"/>
  <rect x="105" y="46" width="34" height="22" fill="{a}"/>
</g>'''


MARK_W, MARK_H = 300, 130


def lockup(red, dark, wordmark_a, wordmark_b, bg=None):
    """Полный лок: знак + надпись под ним, по центру."""
    scale = MARK_W / W_WORD * 0.92
    cap = 100 * scale
    wx = (MARK_W - W_WORD * scale) / 2
    wy = MARK_H + 26
    total_h = wy + cap + 8
    bgrect = f'<rect width="{MARK_W}" height="{total_h:g}" fill="{bg}"/>' if bg else ""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{MARK_W}" height="{total_h:.0f}" viewBox="0 0 {MARK_W} {total_h:.0f}">
{bgrect}
{mark(red, dark, "#fff")}
<g transform="translate({wx:g},{wy:g}) scale({scale:g})">
  <g fill="{wordmark_a}">{G_EFIMOV}</g>
  <g transform="translate({W_EFIMOV + WORDGAP:g},0)" fill="{wordmark_b}">{G_GROUP}</g>
</g>
</svg>'''


def lockup_mono(color, bg=None):
    scale = MARK_W / W_WORD * 0.92
    cap = 100 * scale
    wx = (MARK_W - W_WORD * scale) / 2
    wy = MARK_H + 26
    total_h = wy + cap + 8
    bgrect = f'<rect width="{MARK_W}" height="{total_h:g}" fill="{bg}"/>' if bg else ""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{MARK_W}" height="{total_h:.0f}" viewBox="0 0 {MARK_W} {total_h:.0f}">
{bgrect}
{mark_mono(color)}
<g transform="translate({wx:g},{wy:g}) scale({scale:g})" fill="{color}">
  {G_EFIMOV}
  <g transform="translate({W_EFIMOV + WORDGAP:g},0)">{G_GROUP}</g>
</g>
</svg>'''


def mark_only(red, dark, bg=None):
    bgrect = f'<rect width="{MARK_W}" height="{MARK_H}" fill="{bg}"/>' if bg else ""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{MARK_W}" height="{MARK_H}" viewBox="0 0 {MARK_W} {MARK_H}">
{bgrect}
{mark(red, dark, "#fff")}
</svg>'''


def compact_svg(fg, accent, bg=None, pad=14):
    w = 180 + pad * 2
    h = 114 + pad * 2
    bgrect = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
{bgrect}
<g transform="translate({pad},{pad})">{compact(fg, accent)}</g>
</svg>'''


def favicon_svg(bg, fg, accent):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<rect width="256" height="256" fill="{bg}"/>
<g transform="translate(24,71) scale(1.156)">{compact(fg, accent)}</g>
</svg>'''


RED = "#E01F26"
INK = "#111214"
PAPER = "#F2F1EE"

FILES = {
    "efimov-group-full-color.svg":  lockup(RED, INK, INK, RED),
    "efimov-group-full-dark-bg.svg": lockup(RED, PAPER, PAPER, RED, bg=INK),
    "efimov-group-full-mono-black.svg": lockup_mono("#000000"),
    "efimov-group-full-mono-white.svg": lockup_mono("#FFFFFF", bg=INK),
    "efimov-group-mark-color.svg": mark_only(RED, INK),
    "efimov-group-mark-dark-bg.svg": mark_only(RED, PAPER, bg=INK),
    "efimov-group-mark-mono.svg": f'''<svg xmlns="http://www.w3.org/2000/svg" width="{MARK_W}" height="{MARK_H}" viewBox="0 0 {MARK_W} {MARK_H}">{mark_mono("#000000")}</svg>''',
    "efimov-group-compact-dark.svg": compact_svg(INK, RED),
    "efimov-group-compact-light.svg": compact_svg(PAPER, RED, bg=INK),
    "efimov-group-favicon.svg": favicon_svg(INK, PAPER, RED),
}

import os
outdir = "export"
os.makedirs(outdir, exist_ok=True)
for name, content in FILES.items():
    with open(os.path.join(outdir, name), "w", encoding="utf-8") as f:
        f.write(content)
print(f"wordmark width {W_WORD}, files: {len(FILES)}")

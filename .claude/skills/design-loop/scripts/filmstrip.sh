#!/usr/bin/env bash
# filmstrip.sh — раскадровка ролика: N равномерных кадров + контактный лист одной картинкой.
# Без раскадровки критик ремесла не видит движение и судит по стоп-кадру.
#
#   ./filmstrip.sh promo.webm --out renders/promo --frames 12
#
#   --out DIR      куда класть кадры (по умолчанию ./renders/<имя>)
#   --frames N     сколько кадров (по умолчанию 12)
#   --no-contact   не собирать контактный лист
set -euo pipefail

VIDEO=""; OUT=""; FRAMES=12; CONTACT=1
while [ $# -gt 0 ]; do
  case "$1" in
    --out) OUT="$2"; shift 2 ;;
    --frames) FRAMES="$2"; shift 2 ;;
    --no-contact) CONTACT=0; shift ;;
    *) VIDEO="$1"; shift ;;
  esac
done
[ -n "$VIDEO" ] || { echo "Укажи файл: ./filmstrip.sh promo.webm --out renders/promo" >&2; exit 1; }
[ -f "$VIDEO" ] || { echo "Файла нет: $VIDEO" >&2; exit 1; }

find_ffmpeg() {
  [ -n "${FFMPEG:-}" ] && [ -x "$FFMPEG" ] && { echo "$FFMPEG"; return; }
  command -v ffmpeg 2>/dev/null && return
  for root in "${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}" "$HOME/.cache/ms-playwright" "$HOME/Library/Caches/ms-playwright"; do
    for f in "$root"/ffmpeg-*/ffmpeg-linux "$root"/ffmpeg-*/ffmpeg-mac; do
      [ -x "$f" ] && { echo "$f"; return; }
    done
  done
}
FF="$(find_ffmpeg || true)"
[ -n "$FF" ] || { echo "ffmpeg не найден. Поставь ffmpeg или задай FFMPEG=/path/to/ffmpeg" >&2; exit 1; }

NAME="$(basename "${VIDEO%.*}")"
OUT="${OUT:-renders/$NAME}"
mkdir -p "$OUT"

# Длительность — из служебного вывода ffmpeg, ffprobe может отсутствовать.
# ffmpeg без выходного файла всегда выходит с ненулевым кодом — гасим, иначе set -e убьёт скрипт.
DUR_RAW="$({ "$FF" -hide_banner -i "$VIDEO" 2>&1 || true; } | sed -n 's/.*Duration: \([0-9:.]*\).*/\1/p' | head -1)"
[ -n "$DUR_RAW" ] || { echo "Не удалось прочитать длительность. Сборка ffmpeg может не знать этот контейнер (у ffmpeg из playwright — только webm/mkv)." >&2; exit 1; }
DUR="$(awk -F: '{print $1*3600 + $2*60 + $3}' <<<"$DUR_RAW")"

echo "→ $VIDEO · ${DUR}s · $FRAMES кадров"
i=1
while [ "$i" -le "$FRAMES" ]; do
  T="$(awk -v d="$DUR" -v i="$i" -v n="$FRAMES" 'BEGIN{printf "%.3f", d*(i-0.5)/n}')"
  F="$(printf '%s/%s-%02d.png' "$OUT" "$NAME" "$i")"
  if ! "$FF" -hide_banner -loglevel error -ss "$T" -i "$VIDEO" -frames:v 1 -y "$F" </dev/null; then
    echo "" >&2
    echo "Кадр не снялся. Обычная причина — урезанная сборка ffmpeg: та, что идёт с playwright," >&2
    echo "декодирует webm/vp8 и больше почти ничего. Варианты:" >&2
    echo "  · поставить полный ffmpeg и запустить снова;" >&2
    echo "  · если движение живёт в браузере (CSS/JS-анимация, переходы), раскадровка снимается" >&2
    echo "    без ffmpeg вообще: node render.mjs <страница> --timeline 12 --interval 200" >&2
    exit 1
  fi
  i=$((i+1))
done

if [ "$CONTACT" -eq 1 ]; then
  # Контактный лист собираем страницей и снимаем рендером: tile-фильтр и ImageMagick
  # есть далеко не везде, а Chrome для этого скилла нужен в любом случае.
  HTML="$OUT/contact.html"
  {
    echo '<style>body{margin:0;background:#111;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px;font:11px system-ui;color:#888}figure{margin:0}img{width:100%;display:block}figcaption{padding:4px 2px}</style>'
    j=1
    while [ "$j" -le "$FRAMES" ]; do
      T="$(awk -v d="$DUR" -v i="$j" -v n="$FRAMES" 'BEGIN{printf "%.2f", d*(i-0.5)/n}')"
      printf '<figure><img src="%s-%02d.png"><figcaption>%s s</figcaption></figure>\n' "$NAME" "$j" "$T"
      j=$((j+1))
    done
  } > "$HTML"
  node "$(dirname "$0")/render.mjs" "$HTML" --out "$OUT" --name "$NAME-contact" --no-screens --viewport 1600x1000 --dpr 1 >/dev/null
  echo "Контактный лист: $OUT/$NAME-contact-desktop-full.png"
fi
echo "Кадры: $OUT"

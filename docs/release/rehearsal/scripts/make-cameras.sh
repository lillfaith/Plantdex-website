#!/usr/bin/env bash
# Fake-camera feeds for the browser rehearsal: a real field photograph of ragweed (a deck species), one of southern magnolia (no card),
# and a flat grey frame (a non-plant). Photographs come from field/ (the owner's own set).
set -euo pipefail
OUT=${1:-/tmp/rehearsal/cam}; mkdir -p "$OUT"; F=$(dirname "$0")/../../../../field
mk() { ffmpeg -loglevel error -y -loop 1 -i "$1" -t 2 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,fps=10" -pix_fmt yuv420p "$OUT/$2.y4m"; }
mk "$F/spec-003/spec-003_1-habit.jpg" spec003
mk "$F/spec-006/spec-006_1-habit.jpg" spec006
python3 -c "from PIL import Image; Image.new('RGB',(1280,720),(128,128,128)).save('$OUT/blank.png')"
mk "$OUT/blank.png" blank

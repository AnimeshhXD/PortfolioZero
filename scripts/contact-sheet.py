"""Tile screenshot PNGs into one labelled contact sheet (cheap visual review of many keyframes).

    python -I scripts/contact-sheet.py <out.png> <img1.png> [img2.png ...] [--cols 3] [--width 2400]
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw


def main() -> None:
    args = sys.argv[1:]
    cols = 3
    width = 2400
    if '--cols' in args:
        i = args.index('--cols')
        cols = int(args[i + 1])
        del args[i : i + 2]
    if '--width' in args:
        i = args.index('--width')
        width = int(args[i + 1])
        del args[i : i + 2]
    out, files = args[0], [Path(f) for f in args[1:] if Path(f).exists()]
    if not files:
        sys.exit('no input images')
    first = Image.open(files[0])
    tw = width // cols
    th = int(first.height * tw / first.width)
    label_h = 26
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new('RGB', (tw * cols, (th + label_h) * rows), (20, 20, 24))
    draw = ImageDraw.Draw(sheet)
    for n, f in enumerate(files):
        im = Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS)
        x = (n % cols) * tw
        y = (n // cols) * (th + label_h)
        sheet.paste(im, (x, y + label_h))
        draw.text((x + 8, y + 6), f.stem, fill=(220, 220, 230))
    sheet.save(out)
    print(f'{out}: {len(files)} frames, {sheet.width}x{sheet.height}')


if __name__ == '__main__':
    main()

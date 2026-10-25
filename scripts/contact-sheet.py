"""Tile captures into one sheet: python scripts/contact-sheet.py <out.png> <cols> <width> <img>..."""
import sys
from PIL import Image, ImageDraw

out, cols, width, *paths = sys.argv[1:]
cols, width = int(cols), int(width)
images = [Image.open(p).convert("RGB") for p in paths]
height = max(round(width * im.height / im.width) for im in images)
rows = (len(images) + cols - 1) // cols
sheet = Image.new("RGB", (cols * width, rows * (height + 18)), "black")
draw = ImageDraw.Draw(sheet)
for i, (im, path) in enumerate(zip(images, paths)):
    x, y = (i % cols) * width, (i // cols) * (height + 18)
    sheet.paste(im.resize((width, round(width * im.height / im.width))), (x, y + 18))
    draw.text((x + 4, y + 3), path.replace("\\", "/").split("/")[-1], fill="white")
sheet.save(out)

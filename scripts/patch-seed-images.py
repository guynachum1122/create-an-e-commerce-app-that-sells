from pathlib import Path
import re

path = Path(__file__).resolve().parents[1] / "prisma" / "seed.ts"
text = path.read_text(encoding="utf-8")
text = re.sub(r"image: IMG\('photo-[^']+'\),", "image: nextImage(),", text)
text = re.sub(
    r"extraImages: \[IMG\('photo-[^']+'\), IMG\('photo-[^']+'\)\],",
    "extraImages: [nextImage(), nextImage()],",
    text,
)
text = text.replace(
    "imageUrl: IMG('photo-1599599810769-39faba15c96a')",
    "imageUrl: nextImage()",
)
path.write_text(text, encoding="utf-8")
print("patched seed.ts, nextImage count:", text.count("nextImage()"))

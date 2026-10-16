"""Prepare the public static site from the canonical MovMov source."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parent.parent
out = root / "dist"
out.mkdir(exist_ok=True)
for pattern in ("*.html", "*.css"):
    for source in root.glob(pattern):
        shutil.copy2(source, out / source.name)
shutil.copytree(root / "js", out / "js", dirs_exist_ok=True)
art = out / "assets" / "pose-guides"
art.mkdir(parents=True, exist_ok=True)
for source in (root / "assets" / "pose-guides").glob("*.png"):
    shutil.copy2(source, art / source.name)
print("Prepared public MovMov files in dist/")

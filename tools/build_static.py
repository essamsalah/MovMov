"""Prepare the public static site from the canonical MovMov source."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parent.parent
out = root / "dist"
out.mkdir(exist_ok=True)
for pattern in ("*.html", "*.css", "*.js"):
    for source in root.glob(pattern):
        shutil.copy2(source, out / source.name)
if (root / "CNAME").exists():
    shutil.copy2(root / "CNAME", out / "CNAME")
shutil.copytree(root / "js", out / "js", dirs_exist_ok=True)
shutil.copytree(root / "assets", out / "assets", dirs_exist_ok=True)
print("Prepared public MovMov files in dist/")

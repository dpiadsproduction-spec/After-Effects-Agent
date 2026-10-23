#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/cep/com.aeagent.panel"
DIST="$ROOT/dist"
NAME="AE-Agent-1.0.0.zxp"
OUT="$DIST/$NAME"
STAGE="$DIST/.zxp-stage"

mkdir -p "$DIST" "$STAGE"
find "$STAGE" -mindepth 1 -maxdepth 1 -exec true \; 2>/dev/null || true

python3 - "$SRC" "$STAGE" "$OUT" << 'PY'
import os, sys, zipfile, shutil

src, stage, out = sys.argv[1], sys.argv[2], sys.argv[3]

if os.path.isdir(stage):
    for name in os.listdir(stage):
        path = os.path.join(stage, name)
        if os.path.isdir(path):
            shutil.rmtree(path)
        else:
            os.remove(path)
else:
    os.makedirs(stage)

skip = {".DS_Store", "Thumbs.db"}
for root, dirs, files in os.walk(src):
    rel = os.path.relpath(root, src)
    dest_dir = stage if rel == "." else os.path.join(stage, rel)
    if not os.path.isdir(dest_dir):
        os.makedirs(dest_dir)
    dirs[:] = [d for d in dirs if d not in skip]
    for name in files:
        if name in skip:
            continue
        shutil.copy2(os.path.join(root, name), os.path.join(dest_dir, name))

mimetype_path = os.path.join(stage, "mimetype")
with open(mimetype_path, "w") as f:
    f.write("application/vnd.adobe.air-ucf-package+zip")

parent = os.path.dirname(out)
if not os.path.isdir(parent):
    os.makedirs(parent)
if os.path.exists(out):
    os.remove(out)

with zipfile.ZipFile(out, "w") as zf:
    zf.write(mimetype_path, "mimetype", compress_type=zipfile.ZIP_STORED)
    for root, dirs, files in os.walk(stage):
        for name in files:
            full = os.path.join(root, name)
            arc = os.path.relpath(full, stage).replace(os.sep, "/")
            if arc == "mimetype":
                continue
            zf.write(full, arc, compress_type=zipfile.ZIP_DEFLATED)

print(out)
print("bytes", os.path.getsize(out))
print("entries", len(zipfile.ZipFile(out).namelist()))
PY

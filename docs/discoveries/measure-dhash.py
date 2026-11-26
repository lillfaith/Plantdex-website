#!/usr/bin/env python3
"""Measures what a perceptual hash (dHash, 64-bit) would and would not do for capture-duplicate detection.

    python3 -I docs/discoveries/measure-dhash.py            # prints the tables quoted in
                                                            # docs/discoveries/d5-anti-cheat-and-measurements.md

Inputs: the real photographs in this repository (public/reference, public/boss-form). It is a SMALL set (a few dozen photographs, one genus mostly) and the
document says so. No network, no writes.
"""
import io, itertools, glob, statistics, sys
from PIL import Image

def dhash(img):
    """9x8 grayscale, compare horizontal neighbours -> 64 bits. Mirrors dHash72() in observation-capture-receipt.ts."""
    g = img.convert("L").resize((9, 8), Image.BOX)
    px = list(g.tobytes())
    bits = 0
    for y in range(8):
        for x in range(8):
            bits = (bits << 1) | (1 if px[y * 9 + x] > px[y * 9 + x + 1] else 0)
    return bits

def ham(a, b): return bin(a ^ b).count("1")

def reencode(img, q):
    b = io.BytesIO(); img.convert("RGB").save(b, "JPEG", quality=q); b.seek(0); return Image.open(b)

# evidence/boss-form-photos holds copies of five of the public/boss-form photographs (measured: distance 0, identical
# or re-encoded files), so it is excluded: counting a picture against its own copy is not a false positive.
paths = sorted(glob.glob("public/reference/**/*.webp", recursive=True) + glob.glob("public/boss-form/*.webp"))
imgs = {p: Image.open(p).convert("RGB") for p in paths}
H = {p: dhash(i) for p, i in imgs.items()}
print(f"photographs: {len(paths)}")

# 1. DISTINCT photographs: how close do two different pictures get?
d = [ham(H[a], H[b]) for a, b in itertools.combinations(paths, 2)]
print(f"\n1. distinct-photograph pairs: {len(d)}  min={min(d)}  p1={sorted(d)[len(d)//100]}  median={statistics.median(d)}  max={max(d)}")
for t in (4, 6, 8, 10, 12):
    print(f"   pairs at distance <= {t:2d}: {sum(1 for x in d if x <= t):3d}  ({100*sum(1 for x in d if x <= t)/len(d):.2f}% )")

# 2. SAME photograph, altered: how far does it move?
def stats(name, f):
    v = [ham(H[p], dhash(f(imgs[p]))) for p in paths]
    print(f"   {name:34s} max={max(v):2d}  mean={statistics.mean(v):4.1f}")
print("\n2. the SAME photograph after an alteration (distance from the original):")
stats("JPEG re-encode q=85", lambda i: reencode(i, 85))
stats("JPEG re-encode q=60", lambda i: reencode(i, 60))
stats("downscale to 50%", lambda i: i.resize((max(1, i.width // 2), max(1, i.height // 2)), Image.LANCZOS))
stats("crop 5% each edge", lambda i: i.crop((i.width*.05, i.height*.05, i.width*.95, i.height*.95)))
stats("crop 15% each edge", lambda i: i.crop((i.width*.15, i.height*.15, i.width*.85, i.height*.85)))
stats("mirror (horizontal flip)", lambda i: i.transpose(Image.FLIP_LEFT_RIGHT))
stats("rotate 90 degrees", lambda i: i.rotate(90, expand=True))
stats("brightness +20%", lambda i: Image.eval(i, lambda v: min(255, int(v * 1.2))))

# 3. Does the same-photo distance separate from the different-photo distance at the thresholds above?
alt = [ham(H[p], dhash(reencode(imgs[p], 60))) for p in paths]
print(f"\n3. worst re-encode distance {max(alt)} vs closest DISTINCT pair {min(d)}")

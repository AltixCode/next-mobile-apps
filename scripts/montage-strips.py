#!/usr/bin/env python3
"""
Stacks a horizontal strip from each of many PNGs into one image.

Built to audit live App Store screenshots: an iPad screenshot carries the app's
own name in its status bar, so cropping that strip from every screenshot and
stacking them lets you verify a whole listing's identity in a single look
instead of opening them one at a time.

It is deliberately dull about PNG. It writes RGB8 with filter 0 on every row —
the one case that is trivial to get right — because a hand-rolled writer that
tries to be clever produces a file the viewer rejects, which is a slow way to
learn nothing.

**Know what it cannot do.** An iPhone screenshot's status bar shows time,
signal, wifi and battery, and no app name. So this audit works on iPad and is
blind on iPhone. Verifying identity *before* capturing — the app is installed,
running, and frontmost — works on both, and is the check that actually belongs
in the pipeline. This is for auditing what is already uploaded.

Usage:
    montage-strips.py OUT.png Y0 HEIGHT IN1.png IN2.png ...
"""
import sys, zlib, struct


def read_png(path):
    d = open(path, "rb").read()
    pos, ihdr, idat = 8, None, b""
    while pos < len(d):
        ln = struct.unpack(">I", d[pos:pos + 4])[0]
        typ = d[pos + 4:pos + 8]
        if typ == b"IHDR":
            ihdr = struct.unpack(">IIBB", d[pos + 8:pos + 18])
        elif typ == b"IDAT":
            idat += d[pos + 8:pos + 8 + ln]
        elif typ == b"IEND":
            break
        pos += 12 + ln
    w, h, _bd, ct = ihdr
    ch = {0: 1, 2: 3, 4: 2, 6: 4}[ct]
    raw = zlib.decompress(idat)
    stride = w * ch
    out, prev, p = [], bytearray(stride), 0
    for _ in range(h):
        f = raw[p]
        line = bytearray(raw[p + 1:p + 1 + stride])
        p += 1 + stride
        for i in range(stride):
            a = line[i - ch] if i >= ch else 0
            b = prev[i]
            c = prev[i - ch] if i >= ch else 0
            if f == 1:
                line[i] = (line[i] + a) & 255
            elif f == 2:
                line[i] = (line[i] + b) & 255
            elif f == 3:
                line[i] = (line[i] + (a + b) // 2) & 255
            elif f == 4:
                pp = a + b - c
                pa, pb, pc = abs(pp - a), abs(pp - b), abs(pp - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out.append(bytes(line))
        prev = line
    return out, w, h, ch


def main() -> int:
    if len(sys.argv) < 5:
        print(__doc__.strip().splitlines()[-2].strip(), file=sys.stderr)
        return 2
    out_path, y0, height = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
    target_w = 1200
    tiles = []
    for path in sys.argv[4:]:
        rows, w, h, ch = read_png(path)
        step = max(1, w // target_w)
        for row in rows[y0:y0 + height]:
            px = bytearray()
            for x in range(0, w, step):
                i = x * ch
                px += bytes((row[i], row[i + 1], row[i + 2]))
            tiles.append(bytes(px))
        # a red rule between sources, so the boundaries are unambiguous
        tiles.append(bytes([255, 80, 80] * (len(tiles[-1]) // 3)))

    W, H = len(tiles[0]) // 3, len(tiles)
    raw = b"".join(b"\x00" + t[:W * 3].ljust(W * 3, b"\x00") for t in tiles)

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw))
           + chunk(b"IEND", b""))
    open(out_path, "wb").write(png)
    print(f"{out_path} {W}x{H} from {len(sys.argv) - 4} source(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

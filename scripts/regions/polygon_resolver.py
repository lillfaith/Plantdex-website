#!/usr/bin/env python3
"""Compact direct polygon point-in-polygon resolver for the ten PlantDex regions (PROPOSAL tooling; nothing imports the output).

  build : python3 -I scripts/regions/polygon_resolver.py build --source <dir>/us_eco_l3 --tol 100 --out <file>.bin
  lookup: python3 -I scripts/regions/polygon_resolver.py lookup <file>.bin <lat> <lon>

WHY IT IS DETERMINISTIC (the whole point of writing it this way)
  * projection: the shapefile's Albers coordinates are turned into lon/lat by a hand-written inverse with a FIXED iteration count;
    results are rounded to integer 1e-4 degree. After that, nothing here uses a float except the optional distance flag at lookup.
  * topology: arcs are cut wherever the set of owning units changes, so a border shared by two units is ONE arc stored once.
    Two neighbours therefore cannot drift apart when simplified.
  * simplification: Douglas-Peucker on integer coordinates, exact big-int cross products, ties to the lowest index, canonical arc
    orientation (the lexicographically smaller of the two directions) so both owners get the same answer.
  * no hash-ordered iteration, no GEOS, no timestamps, no compressor. Same inputs, same bytes, on any machine and any PYTHONHASHSEED.
  * lookup: even-odd crossing test in exact integer arithmetic; units are tested in ascending code order, first hit wins.
Asset layout (all integers are LEB128 varints, signed ones zigzag):
  'PDXR' u8 version=1 | varint tol | cos table (53 x u16, lat 24.0..50.0 in 0.5 steps, cos*10000)
  varint n_arcs | arcs[ u8 ownerA, u8 ownerB (0 = none), varint npts, first (lon,lat) zigzag absolute, rest zigzag deltas ]
  varint n_units | units[ u8 unit code, u8 region 1..10, u8 state 0/1/2, u16 alt mask (bit i = REGIONS[i]), varint n_rings,
                         rings[ varint n_refs, refs[ varint (arc<<1 | reversed) ] ] ]
"""
import argparse, math, os, struct, sys

REGIONS = ['NF', 'NE', 'AP', 'SE', 'GC', 'MW', 'GP', 'RM', 'SW', 'PC']
STATES = ['assigned', 'assigned-near', 'uncertain']
A_ = 6378137.0; F_ = 1 / 298.257222101; E2 = F_ * (2 - F_); E = math.sqrt(E2)
def _m(p): s = math.sin(p); return math.cos(p) / math.sqrt(1 - E2 * s * s)
def _q(p): s = math.sin(p); return (1 - E2) * (s / (1 - E2 * s * s) - (1 / (2 * E)) * math.log((1 - E * s) / (1 + E * s)))
_p1, _p2, _p0 = map(math.radians, (29.5, 45.5, 23.0)); _l0 = math.radians(-96.0)
_N = (_m(_p1) ** 2 - _m(_p2) ** 2) / (_q(_p2) - _q(_p1)); _C = _m(_p1) ** 2 + _N * _q(_p1); _R0 = A_ * math.sqrt(_C - _N * _q(_p0)) / _N

def inverse_albers(x, y):
    """metres -> (lon, lat) degrees. Fixed 12 Newton steps (Snyder 14-9), no data-dependent loop exit."""
    dy = _R0 - y; rho = math.sqrt(x * x + dy * dy); th = math.atan2(x, dy)
    q = (_C - (rho * _N / A_) ** 2) / _N
    phi = math.asin(max(-1.0, min(1.0, q / 2)))
    for _ in range(12):
        s = math.sin(phi); c = math.cos(phi); w = 1 - E2 * s * s
        phi += (w * w / (2 * c)) * (q / (1 - E2) - s / w + (1 / (2 * E)) * math.log((1 - E * s) / (1 + E * s)))
    return math.degrees(_l0 + th / _N), math.degrees(phi)

# ---------------------------------------------------------------- varints
def put_u(b, n):
    assert n >= 0
    while True:
        c = n & 0x7F; n >>= 7
        if n: b.append(c | 0x80)
        else: b.append(c); return
def put_s(b, n): put_u(b, (n << 1) ^ (n >> 63) if n < 0 else n << 1)
def get_u(buf, i):
    n = 0; sh = 0
    while True:
        c = buf[i]; i += 1; n |= (c & 0x7F) << sh; sh += 7
        if not c & 0x80: return n, i
def get_s(buf, i):
    z, i = get_u(buf, i); return (z >> 1) ^ -(z & 1), i

# ---------------------------------------------------------------- simplification
def dp(pts, tol2):
    """Douglas-Peucker on integer points, returns kept indices. cross^2 > tol^2 * |AB|^2, exact. Ties keep the LOWEST index."""
    n = len(pts); keep = {0, n - 1}; stack = [(0, n - 1)]
    while stack:
        a, b = stack.pop()
        if b - a < 2: continue
        ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy
        best = -1; bi = -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if L2 == 0: d = (px - ax) ** 2 + (py - ay) ** 2; ref = 1
            else: cr = dx * (py - ay) - dy * (px - ax); d = cr * cr; ref = L2
            # compare d/ref (squared distance) ; keep strictly greater so earlier index wins ties
            if bi < 0 or d * best_ref > best * ref: best, best_ref, bi = d, ref, i
        if bi >= 0:
            if best > tol2 * best_ref: keep.add(bi); stack.append((a, bi)); stack.append((bi, b))
    return sorted(keep)

def simplify_arc(pts, tol, closed):
    """pts: list of (lon,lat) ints. Open arc: ends fixed. Closed ring (pts[0]==pts[-1]): anchored at the start and at the farthest vertex."""
    tol2 = tol * tol
    if not closed:
        k = dp(pts, tol2); return [pts[i] for i in k]
    ring = pts[:-1]; n = len(ring); sx, sy = ring[0]
    far = max(range(1, n), key=lambda i: ((ring[i][0] - sx) ** 2 + (ring[i][1] - sy) ** 2, -i)) if n > 1 else 0
    h1 = ring[0:far + 1]; h2 = ring[far:] + [ring[0]]
    k1 = dp(h1, tol2); k2 = dp(h2, tol2)
    out = [h1[i] for i in k1] + [h2[i] for i in k2][1:]
    return out  # closed: first == last

# ---------------------------------------------------------------- build
def build(source, tol, table):
    import shapefile
    rd = shapefile.Reader(source)
    rings = []   # (unit, [(lon,lat)...]) closed, deduped
    for sr in rd.iterShapeRecords():
        u = int(sr.record['US_L3CODE']); sh = sr.shape; parts = list(sh.parts) + [len(sh.points)]
        for a, b in zip(parts, parts[1:]):
            q = []
            for x, y in sh.points[a:b]:
                lon, lat = inverse_albers(x, y); p = (round(lon * 1e4), round(lat * 1e4))
                if not q or q[-1] != p: q.append(p)
            if len(q) > 1 and q[0] == q[-1]: q.pop()
            if len(q) >= 3: rings.append((u, q))
    owners = {}
    for u, q in rings:
        for i in range(len(q)):
            a, b = q[i], q[(i + 1) % len(q)]; owners.setdefault((a, b) if a < b else (b, a), set()).add(u)
    arcs = []; arc_index = {}; unit_rings = {}
    def intern(seg, own, closed):
        rev = tuple(reversed(seg)); canon = seg if seg <= rev else rev; flipped = canon is not seg and canon != seg
        key = (tuple(canon), closed)
        if key not in arc_index:
            sp = simplify_arc(list(canon), tol, closed); arc_index[key] = len(arcs)
            arcs.append({'pts': sp, 'own': sorted(own)})
        return arc_index[key], flipped
    for u, q in rings:
        n = len(q); eo = [frozenset(owners[((q[i], q[(i + 1) % n]) if q[i] < q[(i + 1) % n] else (q[(i + 1) % n], q[i]))]) for i in range(n)]
        brk = [i for i in range(n) if eo[i - 1] != eo[i]]
        refs = []
        if not brk:
            m = min(range(n), key=lambda i: q[i]); r = q[m:] + q[:m]; seg = r + [r[0]]
            ai, fl = intern(tuple(seg), eo[0], True); refs.append((ai, fl))
        else:
            s = brk[0]; r = q[s:] + q[:s]; e = eo[s:] + eo[:s]; bs = [i for i in range(n) if e[i - 1] != e[i]] + [n]
            for a, b in zip(bs, bs[1:]):
                seg = tuple(r[a:b + 1]) if b < n else tuple(r[a:] + [r[0]])
                ai, fl = intern(seg, e[a], False); refs.append((ai, fl))
        unit_rings.setdefault(u, []).append(refs)
    # fix orientation flags: an arc interned from segment S stores canon(S); ref is reversed iff canon != S
    out = bytearray(b'PDXR\x01'); put_u(out, tol)
    for k in range(53):
        out += struct.pack('<H', round(math.cos(math.radians(24.0 + 0.5 * k)) * 10000))
    put_u(out, len(arcs))
    for a in arcs:
        own = a['own'][:2]; own += [0] * (2 - len(own)); out += bytes(own); pts = a['pts']; put_u(out, len(pts))
        put_s(out, pts[0][0]); put_s(out, pts[0][1])
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]): put_s(out, x1 - x0); put_s(out, y1 - y0)
    put_u(out, len(unit_rings))
    for u in sorted(unit_rings):
        st, p, alts, basis, why = table[u]; mask = 0
        for x in [z for z in alts.split(',') if z]: mask |= 1 << REGIONS.index(x)
        out += bytes([u, REGIONS.index(p) + 1, STATES.index(st)]) + struct.pack('<H', mask); put_u(out, len(unit_rings[u]))
        for refs in unit_rings[u]:
            put_u(out, len(refs))
            for ai, fl in refs: put_u(out, (ai << 1) | (1 if fl else 0))
    return bytes(out)

# ---------------------------------------------------------------- decode + lookup
class Resolver:
    def __init__(self, buf):
        assert buf[:4] == b'PDXR' and buf[4] == 1; i = 5; self.tol, i = get_u(buf, i)
        self.cos = [struct.unpack_from('<H', buf, i + 2 * k)[0] for k in range(53)]; i += 106
        n, i = get_u(buf, i); self.arcs = []
        for _ in range(n):
            o = (buf[i], buf[i + 1]); i += 2; m, i = get_u(buf, i); x, i = get_s(buf, i); y, i = get_s(buf, i); pts = [(x, y)]
            for _ in range(m - 1):
                dx, i = get_s(buf, i); dy, i = get_s(buf, i); x += dx; y += dy; pts.append((x, y))
            self.arcs.append((o, pts))
        n, i = get_u(buf, i); self.units = []
        for _ in range(n):
            u, r, s = buf[i], buf[i + 1], buf[i + 2]; mask = struct.unpack_from('<H', buf, i + 3)[0]; i += 5
            nr, i = get_u(buf, i); rings = []
            for _ in range(nr):
                nf, i = get_u(buf, i); ring = []
                for _ in range(nf):
                    v, i = get_u(buf, i); pts = self.arcs[v >> 1][1]; pts = pts[::-1] if v & 1 else pts; ring += pts[:-1]
                rings.append(ring)
            xs = [p[0] for rg in rings for p in rg]; ys = [p[1] for rg in rings for p in rg]
            self.units.append({'code': u, 'region': REGIONS[r - 1], 'state': STATES[s], 'alts': [REGIONS[k] for k in range(10) if mask >> k & 1],
                               'rings': rings, 'bbox': (min(xs), min(ys), max(xs), max(ys))})
        self.region_of = {u['code']: u['region'] for u in self.units}
        self.bnd = []   # (regionA, regionB, pts) arcs between different regions ; coast/border arcs (one owner) as ('', '', pts)
        for (a, b), pts in self.arcs:
            ra, rb = self.region_of.get(a, ''), self.region_of.get(b, '')
            if b == 0 or a == 0: self.bnd.append(('', '', pts))
            elif ra != rb: self.bnd.append((ra, rb, pts))
    def unit_at(self, px, py):
        for u in self.units:                                     # ascending unit code: first hit wins
            x0, y0, x1, y1 = u['bbox']
            if px < x0 or px > x1 or py < y0 or py > y1: continue
            inside = False
            for ring in u['rings']:
                n = len(ring); xa, ya = ring[-1]
                for k in range(n):
                    xb, yb = ring[k]
                    if (ya > py) != (yb > py):
                        l = (px - xa) * (yb - ya); r = (xb - xa) * (py - ya)
                        if (l < r) if yb > ya else (l > r): inside = not inside
                    xa, ya = xb, yb
            if inside: return u
        return None
    def lookup(self, lat, lon, band_km=10.0):
        px, py = round(lon * 1e4), round(lat * 1e4); u = self.unit_at(px, py)
        if u is None: return {'status': 'no-region-yet', 'region': None, 'reason': 'outside-coverage'}
        ck = min(52, max(0, int((lat - 24.0) / 0.5))); c = self.cos[ck] / 10000.0; kx = 1e-4 * c * 111195.0; ky = 1e-4 * 111195.0
        near = {}; edge = None; lim = band_km * 1000.0
        for ra, rb, pts in self.bnd:
            for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
                ax, ay, bx, by = (x0 - px) * kx, (y0 - py) * ky, (x1 - px) * kx, (y1 - py) * ky
                dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy
                t = 0.0 if L2 == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / L2)); d = math.hypot(ax + t * dx, ay + t * dy)
                if d > lim: continue
                if ra == '': edge = d if edge is None or d < edge else edge
                else:
                    for r in (ra, rb):
                        if r != u['region'] and (r not in near or d < near[r]): near[r] = d
        return {'status': 'region', 'region': u['region'], 'unit': u['code'], 'unitState': u['state'], 'unitAlternatives': u['alts'],
                'neighbours': sorted(near), 'neighbourKm': {r: round(near[r] / 1000, 1) for r in sorted(near)},
                'nearCoverageEdgeKm': None if edge is None else round(edge / 1000, 1)}

def main():
    ap = argparse.ArgumentParser(); sp = ap.add_subparsers(dest='cmd', required=True)
    b = sp.add_parser('build'); b.add_argument('--source', required=True); b.add_argument('--tol', type=int, default=100); b.add_argument('--out', required=True)
    l = sp.add_parser('lookup'); l.add_argument('asset'); l.add_argument('lat', type=float); l.add_argument('lon', type=float)
    a = ap.parse_args()
    if a.cmd == 'build':
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from mapping_v2_table import T
        buf = build(a.source, a.tol, T); open(a.out, 'wb').write(buf); print(a.out, len(buf), 'bytes')
    else:
        print(Resolver(open(a.asset, 'rb').read()).lookup(a.lat, a.lon))
if __name__ == '__main__': main()

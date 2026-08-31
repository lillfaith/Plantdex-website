"""Skeletal-formula generator.

Coordinates are COMPUTED from ring geometry rather than hand-placed, because a hand-placed
benzene ring is never quite a hexagon and a chemistry plate whose rings are visibly wonky
reads as decoration rather than as a structure. Bond length is one constant; every ring is
a real regular hexagon; fused rings share an edge exactly.
"""
import math

L = 22.0                      # bond length
AP = L * math.sqrt(3) / 2     # hexagon apothem

def ring6(cx, cy, rot=90.0):
    """Six vertices of a regular hexagon, index 0 at `rot` degrees, going anticlockwise."""
    return [(cx + L * math.cos(math.radians(rot + 60 * i)),
             cy - L * math.sin(math.radians(rot + 60 * i))) for i in range(6)]

def ringn(cx, cy, n, rot=90.0):
    """Vertices of a regular n-gon with side L, index 0 at `rot` degrees, anticlockwise.

    A guaianolide is 5-7-5, and a seven-membered ring has no shortcut construction; doing
    it by hand is how a cycloheptane ends up as a lumpy hexagon with an extra corner.
    """
    r = L / (2 * math.sin(math.pi / n))
    return [(cx + r * math.cos(math.radians(rot + 360.0 / n * i)),
             cy - r * math.sin(math.radians(rot + 360.0 / n * i))) for i in range(n)]

def fused(m, p, q, n, away_from):
    """Fuse an n-ring onto the existing edge p-q and draw only its NEW bonds.

    The shared edge belongs to the ring that was there first; drawing it twice lays a second
    stroke over the first, which is invisible on screen and doubles the ink at plate size.
    """
    R, c = ring_on_edge(p, q, n, away_from)
    for i in range(1, n):
        m.bond(R[i], R[(i + 1) % n])
    return R, c

def ring5(cx, cy, rot=90.0, r=None):
    r = r or L / (2 * math.sin(math.pi / 5))
    return [(cx + r * math.cos(math.radians(rot + 72 * i)),
             cy - r * math.sin(math.radians(rot + 72 * i))) for i in range(5)]

def fuse(verts, i, j, cx, cy):
    """Centre of the hexagon fused onto the edge (verts[i], verts[j])."""
    mx, my = (verts[i][0] + verts[j][0]) / 2, (verts[i][1] + verts[j][1]) / 2
    dx, dy = mx - cx, my - cy
    n = math.hypot(dx, dy)
    return (mx + dx / n * AP, my + dy / n * AP)

def ring_on_edge(p, q, n, away_from):
    """The n-gon sharing edge p-q, placed on the far side from `away_from`.

    Generalises `fuse`, which only did hexagon-on-hexagon. Fused 5- and 7-rings need the
    same construction with a different apothem, and doing it by hand is how a pyrrole ends
    up not quite regular.
    """
    mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
    side = math.hypot(q[0] - p[0], q[1] - p[1])
    apothem = side / (2 * math.tan(math.pi / n))
    # Unit normal to the edge, pointing away from `away_from`.
    ex, ey = (q[0] - p[0]) / side, (q[1] - p[1]) / side
    nx, ny = -ey, ex
    if (mx + nx - away_from[0]) ** 2 + (my + ny - away_from[1]) ** 2 < \
       (mx - nx - away_from[0]) ** 2 + (my - ny - away_from[1]) ** 2:
        nx, ny = -nx, -ny
    cx, cy = mx + nx * apothem, my + ny * apothem
    start = math.degrees(math.atan2(-(p[1] - cy), p[0] - cx))
    r = side / (2 * math.sin(math.pi / n))
    # Walk from p toward q, so the shared edge is always indices 0 and 1.
    step = 360.0 / n
    a0 = math.degrees(math.atan2(-(q[1] - cy), q[0] - cx))
    if ((a0 - start) % 360) > 180:
        step = -step
    return [(cx + r * math.cos(math.radians(start + step * i)),
             cy - r * math.sin(math.radians(start + step * i))) for i in range(n)], (cx, cy)

def carboxyl(m, v, centre):
    """Draw -C(=O)OH on vertex v, pointing away from `centre`; returns the acid carbon.

    The two oxygens go out at 60 degrees either side of the incoming bond, which is what
    stops them stacking on top of each other. Gallic acid did this with hard-coded offsets
    that only worked because its carboxyl happened to point straight up.
    """
    c = away(v, *centre)
    m.bond(v, c)
    ang = math.atan2(c[1] - v[1], c[0] - v[0])
    od = (c[0] + L * math.cos(ang - math.radians(60)), c[1] + L * math.sin(ang - math.radians(60)))
    oh = (c[0] + L * math.cos(ang + math.radians(60)), c[1] + L * math.sin(ang + math.radians(60)))
    m.bond(c, od, 2); m.label(od, 'O')
    m.bond(c, oh); m.label(oh, 'OH')
    return c

def chromene(m, centre=(0.0, 0.0)):
    """Benzene fused to a pyran - the skeleton under flavonoids, catechins, coumarins and
    anthocyanins - with the pyran atoms returned in RING-WALK order as (o1, c2, c3, c4).

    The order is the whole point. The first version picked the four non-shared vertices by
    sorting them on position, which yields ring indices [2, 1, 5, 0]: the second and third
    are NOT neighbours. Bonding them drew a double bond straight across the middle of the
    pyran ring, and that shipped in both the flavonoid and the flavylium core - the
    flavonoid one appearing on roughly twenty cards. Coumarin escaped only because it
    happened to bond the one pair that was adjacent. A walk cannot produce that class of
    error at all, which is why the sort is gone rather than corrected.
    """
    A = ring6(*centre)
    cc = fuse(A, 0, 1, *centre)
    C = ring6(*cc)
    m.ring(A, aromatic_from=(2, 4), centre=centre)
    m.bond(A[0], A[1], 2, centre)
    key = lambda q: (round(q[0], 1), round(q[1], 1))
    sh = {key(A[0]), key(A[1])}
    for i in range(6):
        a, b = C[i], C[(i + 1) % 6]
        if key(a) in sh and key(b) in sh:
            continue                                  # the fused edge is already drawn
        m.bond(a, b)
    idx = [i for i in range(6) if key(C[i]) not in sh]
    start = next(i for i in idx if (i - 1) % 6 not in idx)
    walk = [C[(start + k) % 6] for k in range(4)]
    walk.reverse()      # so the ring oxygen keeps the side it has always been drawn on
    return A, C, cc, walk

def out(p, q, d=L):
    """A point `d` away from p, in the direction p->q extended (for substituents)."""
    dx, dy = q[0] - p[0], q[1] - p[1]
    n = math.hypot(dx, dy)
    return (p[0] + dx / n * d, p[1] + dy / n * d)

def away(p, cx, cy, d=L):
    """A point `d` from p, pointing directly away from a ring centre."""
    return out(p, (2 * p[0] - cx, 2 * p[1] - cy), d)

def _turn(p, incoming, deg):
    """A point one bond from p, turning `deg` off the direction `incoming` arrived in."""
    a = math.atan2(incoming[1], incoming[0]) + math.radians(deg)
    return (p[0] + L * math.cos(a), p[1] + L * math.sin(a))

def branch(p, incoming, occupied):
    """The clearer of the two 60-degree continuations from p.

    A skeletal chain can turn either way and both are chemically identical, so the choice is
    purely about not landing on something already drawn. Picking it by measurement rather
    than by eye is what stopped a hydroxyl being placed exactly on top of a ring carbon:
    the two candidates were 0.09 units apart from an existing vertex and 38 units apart, and
    the sign that chose between them was simply wrong.
    """
    best, best_clear = None, -1.0
    for deg in (60, -60):
        q = _turn(p, incoming, deg)
        clear = min(math.hypot(q[0] - o[0], q[1] - o[1]) for o in occupied) if occupied else L
        if clear > best_clear:
            best, best_clear = q, clear
    return best

def glucopyranose(m, centre, anchor, rot=0.0):
    """Draw a beta-D-glucopyranose ring and return its anomeric carbon (C1).

    The ring oxygen sits BETWEEN C1 and C5 - that is what makes it a pyranose - so the
    hydroxymethyl goes on the vertex two steps round from C1, not five. Getting that wrong
    draws a ring whose oxygen has a plain CH(OH) on one side, which is a different sugar
    (and, with the hydroxymethyl omitted altogether, not a hexose at all). Both sugars in
    this file had it wrong in different ways, so the walk lives here once.

    Ring walk from C1: C1, O, C5, C4, C3, C2.
    """
    G = ring6(*centre, rot=rot)
    k = min(range(6), key=lambda i: (G[i][0] - anchor[0]) ** 2 + (G[i][1] - anchor[1]) ** 2)
    # Walk in whichever direction puts the ring oxygen further from the anchor, so the
    # incoming bond and the ring oxygen label never crowd the same corner.
    fwd = G[(k + 1) % 6]
    bwd = G[(k - 1) % 6]
    step = 1 if (fwd[0] - anchor[0]) ** 2 + (fwd[1] - anchor[1]) ** 2 >= \
                (bwd[0] - anchor[0]) ** 2 + (bwd[1] - anchor[1]) ** 2 else -1
    at = lambda n: G[(k + step * n) % 6]
    m.ring(G)
    m.label(at(1), 'O')                                   # ring oxygen, between C1 and C5
    occupied = list(G) + [anchor]
    c5 = at(2)
    ch2 = away(c5, *centre)
    m.bond(c5, ch2)
    occupied.append(ch2)
    oh6 = branch(ch2, (ch2[0] - c5[0], ch2[1] - c5[1]), occupied)
    m.bond(ch2, oh6); m.label(oh6, 'OH')
    occupied.append(oh6)
    for n in (3, 4, 5):                                   # C4, C3, C2
        v = at(n)
        q = away(v, *centre)
        m.bond(v, q); m.label(q, 'OH')
        occupied.append(q)
    return G[k]

class Mol:
    def __init__(self, name):
        self.name, self.bonds, self.labels = name, [], []
    def bond(self, a, b, order=1, inner=None):
        self.bonds.append((a, b, order, inner))
        return self
    def ring(self, verts, aromatic_from=None, centre=None):
        for i in range(len(verts)):
            a, b = verts[i], verts[(i + 1) % len(verts)]
            self.bond(a, b, 1)
        if aromatic_from is not None:
            for i in aromatic_from:
                a, b = verts[i], verts[(i + 1) % len(verts)]
                self.bonds[-len(verts) + i] = (a, b, 2, centre)
        return self
    def label(self, p, text, dx=0.0, dy=0.0):
        self.labels.append((p[0] + dx, p[1] + dy, text))
        return self

def render(mol, pad=16, font=11):
    xs, ys = [], []
    for a, b, *_ in mol.bonds:
        xs += [a[0], b[0]]; ys += [a[1], b[1]]
    for x, y, t in mol.labels:
        xs += [x - 5 * len(t) / 2 - 3, x + 5 * len(t) / 2 + 3]; ys += [y - 7, y + 4]
    x0, x1, y0, y1 = min(xs) - pad, max(xs) + pad, min(ys) - pad, max(ys) + pad
    lines = []
    # Where a bond meets a label, pull it back so the stroke does not run under the text.
    labelled = {(round(x, 2), round(y, 2)): t for x, y, t in mol.labels}
    def trim(p, q):
        t = labelled.get((round(p[0], 2), round(p[1], 2)))
        if not t: return p
        back = 5.2 + 2.6 * len(t)
        dx, dy = q[0] - p[0], q[1] - p[1]; n = math.hypot(dx, dy)
        return (p[0] + dx / n * min(back, n * 0.55), p[1] + dy / n * min(back, n * 0.55))
    for a, b, order, inner in mol.bonds:
        pa, pb = trim(a, b), trim(b, a)
        lines.append(f'<path d="M{pa[0]:.1f} {pa[1]:.1f}L{pb[0]:.1f} {pb[1]:.1f}" />')
        if order == 2:
            if inner:  # aromatic: the second line sits INSIDE the ring
                cx, cy = inner
                def pull(p):
                    dx, dy = cx - p[0], cy - p[1]; n = math.hypot(dx, dy)
                    return (p[0] + dx / n * 5.0, p[1] + dy / n * 5.0)
                qa, qb = pull(pa), pull(pb)
                # shorten so the inner line reads as parallel, not as a second ring edge
                def shrink(u, v, f=0.16):
                    return (u[0] + (v[0] - u[0]) * f, u[1] + (v[1] - u[1]) * f)
                qa2, qb2 = shrink(qa, qb), shrink(qb, qa)
                lines.append(f'<path d="M{qa2[0]:.1f} {qa2[1]:.1f}L{qb2[0]:.1f} {qb2[1]:.1f}" />')
            else:      # plain double bond: offset perpendicular
                dx, dy = pb[0] - pa[0], pb[1] - pa[1]; n = math.hypot(dx, dy)
                ox, oy = -dy / n * 3.4, dx / n * 3.4
                lines.append(
                    f'<path d="M{pa[0]+ox:.1f} {pa[1]+oy:.1f}L{pb[0]+ox:.1f} {pb[1]+oy:.1f}" />')
    for x, y, t in mol.labels:
        lines.append(
            f'<text x="{x:.1f}" y="{y:.1f}" fill="currentColor" stroke="none" '
            f'font-size="{font}" font-weight="600" text-anchor="middle" '
            f'dominant-baseline="central">{t}</text>')
    vb = f'{x0:.1f} {y0:.1f} {x1-x0:.1f} {y1-y0:.1f}'
    return vb, '\n      '.join(lines)

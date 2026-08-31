import sys, math, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from mol import Mol, ring6, ring5, ringn, fuse, fused, out, away, branch, carboxyl, chromene, render, ring_on_edge, glucopyranose, L

M = {}

# ── Cyclohexane monoterpenoids ────────────────────────────────────────────────
def menthol_like(name, c1_label, c1_double):
    cx, cy = 0, 0
    v = ring6(cx, cy)
    m = Mol(name); m.ring(v)
    # C1 (v[0]) carries the oxygen; C2 (v[1]) the isopropyl; C5 (v[4]) the methyl.
    o = away(v[0], cx, cy)
    m.bond(v[0], o, 2 if c1_double else 1); m.label(o, c1_label)
    ip = away(v[1], cx, cy)
    m.bond(v[1], ip)
    m.bond(ip, out(ip, (ip[0] - L, ip[1] - L * 0.3)))
    m.bond(ip, out(ip, (ip[0] - L * 0.3, ip[1] + L)))
    me = away(v[4], cx, cy)
    m.bond(v[4], me)
    return m

M['menthol'] = ('Menthol', menthol_like('menthol', 'OH', False))
M['menthone'] = ('Menthone', menthol_like('menthone', 'O', True))

# Limonene: 1-methyl-4-(prop-1-en-2-yl)cyclohex-1-ene
cx, cy = 0, 0
v = ring6(cx, cy)
m = Mol('limonene'); m.ring(v)
m.bonds[0] = (v[0], v[1], 2, (cx, cy))       # ring double bond C1=C2
m.bond(v[0], away(v[0], cx, cy))             # C1 methyl
ipe = away(v[3], cx, cy)
m.bond(v[3], ipe)
m.bond(ipe, out(ipe, (ipe[0] - L, ipe[1] + L * 0.2)))            # methyl
m.bond(ipe, out(ipe, (ipe[0] + L * 0.2, ipe[1] + L)), 2)         # =CH2
M['limonene'] = ('Limonene', m)

# ── Phenols ───────────────────────────────────────────────────────────────────
def phenol_ring(name, subs):
    """subs: {vertex index: ('label'|'me'|'ipr')}"""
    cx, cy = 0, 0
    v = ring6(cx, cy)
    m = Mol(name); m.ring(v, aromatic_from=(0, 2, 4), centre=(cx, cy))
    for i, kind in subs.items():
        p = away(v[i], cx, cy)
        if kind == 'me':
            m.bond(v[i], p)
        elif kind == 'ipr':
            m.bond(v[i], p)
            d = (p[0] - cx, p[1] - cy); n = math.hypot(*d)
            perp = (-d[1] / n, d[0] / n)
            m.bond(p, (p[0] + perp[0] * L * 0.87 + d[0] / n * L * 0.5,
                       p[1] + perp[1] * L * 0.87 + d[1] / n * L * 0.5))
            m.bond(p, (p[0] - perp[0] * L * 0.87 + d[0] / n * L * 0.5,
                       p[1] - perp[1] * L * 0.87 + d[1] / n * L * 0.5))
        else:
            m.bond(v[i], p); m.label(p, kind)
    return m, v, (cx, cy)

# Thymol = 2-isopropyl-5-methylphenol; carvacrol = 5-isopropyl-2-methylphenol.
M['thymol'] = ('Thymol', phenol_ring('thymol', {0: 'OH', 1: 'ipr', 4: 'me'})[0])
M['carvacrol'] = ('Carvacrol', phenol_ring('carvacrol', {0: 'OH', 1: 'me', 4: 'ipr'})[0])

# Gallic acid: 3,4,5-trihydroxybenzoic acid
m, v, c = phenol_ring('gallic', {2: 'OH', 3: 'OH', 4: 'OH'})
cooh = away(v[0], *c)
m.bond(v[0], cooh)
# The two oxygens go out at 120 degrees either side of the ring bond, so they cannot stack.
od = (cooh[0] + L * 0.87, cooh[1] - L * 0.5)
oh = (cooh[0] - L * 0.87, cooh[1] - L * 0.5)
m.bond(cooh, od, 2); m.label(od, 'O')
m.bond(cooh, oh); m.label(oh, 'HO')
M['gallic-acid'] = ('Gallic acid', m)

# Tyramine: 4-(2-aminoethyl)phenol
m, v, c = phenol_ring('tyramine', {0: 'OH'})
a = away(v[3], *c)
m.bond(v[3], a)
b = out(a, (a[0] - L, a[1] + L * 0.6))
m.bond(a, b)
n2 = out(b, (b[0] - L, b[1] - L * 0.6))
m.bond(b, n2); m.label(n2, 'NH2')
M['tyramine'] = ('Tyramine', m)

# ── Simple acids and amines ───────────────────────────────────────────────────
m = Mol('oxalic')
a, b = (0, 0), (L, 0)
m.bond(a, b)
for p, s in ((a, -1), (b, 1)):
    o = (p[0] + s * L * 0.5, p[1] - L * 0.87); m.bond(p, o, 2); m.label(o, 'O')
    h = (p[0] + s * L * 0.5, p[1] + L * 0.87); m.bond(p, h); m.label(h, 'OH')
M['oxalic-acid'] = ('Oxalic acid', m)

m = Mol('fumaric')
c2, c3 = (0, 0), (L * 0.87, -L * 0.5)
m.bond(c2, c3, 2)
c1 = (-L * 0.87, -L * 0.5); m.bond(c2, c1)
c4 = (L * 1.74, 0); m.bond(c3, c4)
o1 = (c1[0], c1[1] - L); m.bond(c1, o1, 2); m.label(o1, 'O')
h1 = (c1[0] - L * 0.87, c1[1] + L * 0.5); m.bond(c1, h1); m.label(h1, 'HO')
o2 = (c4[0], c4[1] + L); m.bond(c4, o2, 2); m.label(o2, 'O')
h2 = (c4[0] + L * 0.87, c4[1] - L * 0.5); m.bond(c4, h2); m.label(h2, 'OH')
M['fumaric-acid'] = ('Fumaric acid', m)

m = Mol('choline')
n = (0, 0)
m.label(n, 'N+')
for d in ((-L, -L * 0.4), (-L * 0.2, -L), (-L, L * 0.6)):
    m.bond(n, (n[0] + d[0], n[1] + d[1]))
c1 = (L * 0.87, L * 0.5); m.bond(n, c1)
c2 = (c1[0] + L * 0.87, c1[1] - L * 0.5); m.bond(c1, c2)
oh = (c2[0] + L * 0.87, c2[1] + L * 0.5); m.bond(c2, oh); m.label(oh, 'OH')
M['choline'] = ('Choline', m)

# ── Heterocycles ──────────────────────────────────────────────────────────────
# Histamine: imidazole with a 2-aminoethyl chain at C4.
v = ring5(0, 0, rot=90)
m = Mol('histamine')
m.ring(v)
m.bonds[1] = (v[1], v[2], 2, (0, 0))
m.bonds[3] = (v[3], v[4], 2, (0, 0))
m.label(v[1], 'N'); m.label(v[3], 'NH')
a = away(v[0], 0, 0); m.bond(v[0], a)
b = out(a, (a[0] + L, a[1] - L * 0.6)); m.bond(a, b)
n2 = out(b, (b[0] + L, b[1] + L * 0.6)); m.bond(b, n2); m.label(n2, 'NH2')
M['histamine'] = ('Histamine', m)

# Ascorbic acid: gamma-lactone with the C2-C3 enediol. Hand-placed, because the generic
# ring-5 substituent helper stacked the two enediol hydroxyls on top of each other.
v = ring5(0, 0, rot=90)
m = Mol('ascorbic')
m.ring(v)
o1, c1, c2, c3, c4 = v[0], v[1], v[2], v[3], v[4]
m.label(o1, 'O')                                       # ring oxygen
m.bond(c2, c3, 2, (0, 0))                              # enediol double bond, inner line
ket = away(c1, 0, 0); m.bond(c1, ket, 2); m.label(ket, 'O')
# The two enediol hydroxyls go straight down, splayed, so their labels cannot collide.
for cc_, dx in ((c2, -1), (c3, 1)):
    p = (cc_[0] + dx * L * 0.34, cc_[1] + L * 0.94)
    m.bond(cc_, p); m.label(p, 'OH')
s1 = away(c4, 0, 0); m.bond(c4, s1)
sOH = (s1[0] + L * 0.87, s1[1] - L * 0.5); m.bond(s1, sOH); m.label(sOH, 'OH')
s2 = (s1[0], s1[1] - L); m.bond(s1, s2)
sOH2 = (s2[0] - L * 0.87, s2[1] - L * 0.5); m.bond(s2, sOH2); m.label(sOH2, 'HO')
M['ascorbic-acid'] = ('Vitamin C', m)

# Allantoin: hydantoin ring bearing a ureido group at C5.
v = ring5(0, 0, rot=90)
m = Mol('allantoin')
m.ring(v)
m.label(v[1], 'NH'); m.label(v[4], 'HN')
o1 = away(v[0], 0, 0); m.bond(v[0], o1, 2); m.label(o1, 'O')     # C2=O
o2 = away(v[2], 0, 0); m.bond(v[2], o2, 2); m.label(o2, 'O')     # C4=O
n = away(v[3], 0, 0); m.bond(v[3], n); m.label(n, 'NH')
c = out(n, (n[0] + L, n[1] + L * 0.4)); m.bond(n, c)
oc = out(c, (c[0], c[1] + L)); m.bond(c, oc, 2); m.label(oc, 'O')
n2 = out(c, (c[0] + L, c[1] - L * 0.4)); m.bond(c, n2); m.label(n2, 'NH2')
M['allantoin'] = ('Allantoin', m)

# ── Fused aromatics ───────────────────────────────────────────────────────────
def flavonol(name, b_ring_ohs, b_at='c2', three_oh=True):
    """Chromen-4-one core plus a B ring. b_ring_ohs: vertex indices on the B ring."""
    ca = (0.0, 0.0)
    A = ring6(*ca)                       # A ring (benzene)
    cc = fuse(A, 0, 1, *ca)
    C = ring6(*cc)                       # C ring (pyranone), shares A[0]-A[1]
    m = Mol(name)
    m.ring(A, aromatic_from=(2, 4), centre=ca)
    m.bond(A[0], A[1], 2, ca)
    # C ring, skipping the shared edge which the A ring already drew
    Cs = [p for p in C]
    shared = {(round(A[0][0], 1), round(A[0][1], 1)), (round(A[1][0], 1), round(A[1][1], 1))}
    for i in range(6):
        p, q = Cs[i], Cs[(i + 1) % 6]
        if (round(p[0], 1), round(p[1], 1)) in shared and (round(q[0], 1), round(q[1], 1)) in shared:
            continue
        m.bond(p, q)
    # Identify C-ring vertices that are not shared with A.
    free = [p for p in Cs if (round(p[0], 1), round(p[1], 1)) not in shared]
    free.sort(key=lambda p: (-p[1], p[0]))
    o1, c2, c3, c4 = free[0], free[1], free[2], free[3]
    m.label(o1, 'O')                                   # pyran oxygen
    m.bond(c2, c3, 2, cc)                               # C2=C3, inner line
    ket = away(c4, *cc); m.bond(c4, ket, 2); m.label(ket, 'O')   # C4 ketone
    if three_oh:
        oh3 = away(c3, *cc); m.bond(c3, oh3); m.label(oh3, 'OH')  # 3-OH (flavonol only)
    # 5-OH and 7-OH on the A ring
    for i in (2, 4):
        p = away(A[i], *ca); m.bond(A[i], p); m.label(p, 'OH')
    # B ring hung off C2 (flavonol) or C3 (isoflavone)
    anchor = c2 if b_at == 'c2' else c3
    bstart = away(anchor, *cc, d=L)
    cb = out(bstart, (bstart[0] + (bstart[0] - cc[0]), bstart[1] + (bstart[1] - cc[1])), d=L)
    B = ring6(*cb)
    # attach at the nearest B vertex
    Bv = ring6(*cb)
    near = min(range(6), key=lambda i: (Bv[i][0] - anchor[0]) ** 2 + (Bv[i][1] - anchor[1]) ** 2)
    m.bond(anchor, Bv[near])
    m.ring(Bv, aromatic_from=(0, 2, 4), centre=cb)
    for off in b_ring_ohs:
        p = away(Bv[(near + off) % 6], *cb); m.bond(Bv[(near + off) % 6], p); m.label(p, 'OH')
    return m

M['quercetin'] = ('Quercetin', flavonol('quercetin', (3, 4)))    # 3',4'-catechol
M['kaempferol'] = ('Kaempferol', flavonol('kaempferol', (3,)))   # 4'-OH only

# ── Second tranche ────────────────────────────────────────────────────────────

# Genistein: an ISOflavone — same chromone core, B ring on C3 rather than C2, no 3-OH.
M['genistein'] = ('Genistein', flavonol('genistein', (3,), b_at='c3', three_oh=False))

# Citronellal: 3,7-dimethyloct-6-enal. A plain zigzag, so it is placed directly.
m = Mol('citronellal')
step = [(L * 0.866, -L * 0.5), (L * 0.866, L * 0.5)]
pts = [(0.0, 0.0)]
for i in range(7):
    d = step[i % 2]
    pts.append((pts[-1][0] + d[0], pts[-1][1] + d[1]))
for i in range(7):
    # C6=C7 is the only double bond; the aldehyde is drawn below.
    m.bond(pts[i], pts[i + 1], 2 if i == 5 else 1)
o = (pts[0][0] - L * 0.866, pts[0][1] - L * 0.5)
m.bond(pts[0], o, 2); m.label(o, 'O')                       # the aldehyde
for idx in (2, 6):                                          # methyls at C3 and C7
    up = (pts[idx][0], pts[idx][1] - L) if pts[idx][1] <= pts[idx - 1][1] else (pts[idx][0], pts[idx][1] + L)
    m.bond(pts[idx], up)
M['citronellal'] = ('Citronellal', m)

# Lawsone, second attempt: 2-hydroxy-1,4-naphthoquinone, placed by hand. The generic
# fused-ring helper sorted the quinone's free vertices by position and put the carbonyls on
# the wrong carbons, which is why the first version was dropped rather than shipped.
ca = (0.0, 0.0)
A = ring6(*ca, rot=0)                       # aromatic ring
cq = (0.0, -L * 1.732)                      # quinone ring, fused on A's top edge
Q = ring6(*cq, rot=0)
m = Mol('lawsone')
m.ring(A, aromatic_from=(0, 3), centre=ca)
m.bond(A[1], A[2], 2, ca)                   # the shared bond, aromatic
for i in range(6):
    pp, qq = Q[i], Q[(i + 1) % 6]
    if {i, (i + 1) % 6} == {4, 5}:
        continue                            # already drawn as A's top edge
    m.bond(pp, qq)
c1, c2_, c3_, c4 = Q[0], Q[1], Q[2], Q[3]
for cc_ in (c1, c4):
    o = away(cc_, *cq); m.bond(cc_, o, 2); m.label(o, 'O')
m.bond(c2_, c3_, 2, cq)
oh = away(c2_, *cq); m.bond(c2_, oh); m.label(oh, 'OH')
M['lawsone'] = ('Lawsone', m)

# Resveratrol, second attempt: trans-3,5,4'-trihydroxystilbene, walked along one axis. The
# first version placed ring B by extending a direction vector and the two rings overlapped.
ca = (0.0, 0.0)
A = ring6(*ca, rot=0)
m = Mol('resveratrol')
m.ring(A, aromatic_from=(0, 2, 4), centre=ca)
v0 = A[0]                                              # right-hand vertex of ring A
c_a = (v0[0] + L * 0.866, v0[1] - L * 0.5)
c_b = (c_a[0] + L * 0.866, c_a[1] + L * 0.5)
m.bond(v0, c_a); m.bond(c_a, c_b, 2)                   # the trans vinyl bridge
vB = (c_b[0] + L * 0.866, c_b[1] - L * 0.5)
cb = (vB[0] + L, vB[1])                                # vB is ring B's left-hand vertex
B = ring6(*cb, rot=0)
m.bond(c_b, B[3])
m.ring(B, aromatic_from=(0, 2, 4), centre=cb)
p4 = away(B[0], *cb); m.bond(B[0], p4); m.label(p4, 'OH')        # 4'-OH, para
for i in (2, 4):                                                  # 3- and 5-OH, both meta
    q = away(A[i], *ca); m.bond(A[i], q); m.label(q, 'OH')
M['resveratrol'] = ('Resveratrol', m)

# Emodin: 1,3,8-trihydroxy-6-methylanthraquinone. Three rings fused in a line, so the
# hexagons are rotated 30 degrees to give them vertical edges to share.
cA = (0.0, 0.0)
cM = (L * 1.732, 0.0)
cC = (L * 3.464, 0.0)
A, Mid, C = ring6(*cA, rot=30), ring6(*cM, rot=30), ring6(*cC, rot=30)
m = Mol('emodin')
m.ring(A, aromatic_from=(1, 3), centre=cA)
m.bond(A[0], A[5], 2, cA)
m.ring(C, aromatic_from=(0, 4), centre=cC)
m.bond(C[2], C[3], 2, cC)
for i in range(6):
    if {i, (i + 1) % 6} in ({2, 3}, {0, 5}):
        continue                                    # both shared edges already drawn
    m.bond(Mid[i], Mid[(i + 1) % 6])
for idx in (1, 4):                                  # C9 and C10, the two ketones
    o = away(Mid[idx], *cM); m.bond(Mid[idx], o, 2); m.label(o, 'O')
for idx in (1, 3):                                  # C1 and C3 hydroxyls
    o = away(A[idx], *cA); m.bond(A[idx], o); m.label(o, 'OH')
o8 = away(C[1], *cC); m.bond(C[1], o8); m.label(o8, 'OH')   # C8 hydroxyl
m.bond(C[5], away(C[5], *cC))                                # C6 methyl
M['emodin'] = ('Emodin', m)


# Rosmarinic acid: the caffeic-acid ester of 3-(3,4-dihydroxyphenyl)lactic acid. Two
# catechol rings joined by a vinyl, an ester and a lactic-acid centre — the widest thing
# here, so it is walked along one axis to keep the height down.
cA = (0.0, 0.0)
A = ring6(*cA, rot=0)
m = Mol('rosmarinic')
m.ring(A, aromatic_from=(0, 2, 4), centre=cA)
for i in (2, 3):                                   # the 3,4-catechol
    q = away(A[i], *cA); m.bond(A[i], q); m.label(q, 'OH')
v0 = A[0]
c_a = (v0[0] + L * 0.866, v0[1] - L * 0.5)
c_b = (c_a[0] + L * 0.866, c_a[1] + L * 0.5)
m.bond(v0, c_a); m.bond(c_a, c_b, 2)               # the caffeoyl vinyl, trans
c_c = (c_b[0] + L * 0.866, c_b[1] - L * 0.5)       # the ester carbonyl
m.bond(c_b, c_c)
ok = (c_c[0], c_c[1] - L); m.bond(c_c, ok, 2); m.label(ok, 'O')
o_d = (c_c[0] + L * 0.866, c_c[1] + L * 0.5)       # the ester oxygen
m.bond(c_c, o_d); m.label(o_d, 'O')
c_e = (o_d[0] + L * 0.866, o_d[1] - L * 0.5)       # the lactic-acid carbon
m.bond(o_d, c_e)
c_f = (c_e[0], c_e[1] - L)                          # its carboxylic acid
m.bond(c_e, c_f)
m.bond(c_f, (c_f[0] + L * 0.866, c_f[1] - L * 0.5), 2)
m.label((c_f[0] + L * 0.866, c_f[1] - L * 0.5), 'O')
m.bond(c_f, (c_f[0] - L * 0.866, c_f[1] - L * 0.5))
m.label((c_f[0] - L * 0.866, c_f[1] - L * 0.5), 'HO')
c_g = (c_e[0], c_e[1] + L)                          # the benzylic CH2
m.bond(c_e, c_g)
vB = (c_g[0] + L * 0.866, c_g[1] + L * 0.5)
cb = (vB[0] + L, vB[1])
B = ring6(*cb, rot=0)
m.bond(c_g, B[3])
m.ring(B, aromatic_from=(0, 2, 4), centre=cb)
for i in (5, 0):                                    # the second 3,4-catechol
    q = away(B[i], *cb); m.bond(B[i], q); m.label(q, 'OH')
M['rosmarinic-acid'] = ('Rosmarinic acid', m)


# ── Third tranche: molecules that lift a card to two drawn structures ─────────

def beta_carboline(name, c1_methyl=True, saturated=False):
    """The harmine / harmaline skeleton: benzene - pyrrole - pyridine, fused in a line.

    Harmaline is harmine's 3,4-dihydro form, so the two differ by ONE ring bond. Building
    them from a shared constructor keeps that the only difference, which is what it is.
    """
    ca = (0.0, 0.0)
    A = ring6(*ca, rot=0)                       # benzene
    m = Mol(name)
    m.ring(A, aromatic_from=(2, 4), centre=ca)
    m.bond(A[0], A[1], 2, ca)
    # Pyrrole on the benzene's upper-right edge.
    P, cp = ring_on_edge(A[0], A[1], 5, ca)
    for i in range(5):
        if i == 0:
            continue                            # shared with the benzene
        m.bond(P[i], P[(i + 1) % 5])
    m.bond(P[4], P[0])
    # Walking from A[0] to A[1], P[0] and P[1] are the shared carbons, so P[2] is the
    # indole nitrogen and the pyridine belongs on the far edge P[3]-P[4].
    m.label(P[2], 'HN')
    C, cc = ring_on_edge(P[3], P[4], 6, cp)
    for i in range(6):
        if i == 0:
            continue
        m.bond(C[i], C[(i + 1) % 6])
    m.bond(C[5], C[0])
    m.label(C[3], 'N')
    if not saturated:
        # Harmine: the pyridine ring is aromatic.
        m.bond(C[1], C[2], 2, cc)
        m.bond(C[3], C[4], 2, cc)
    else:
        # Harmaline: 3,4-dihydro — one imine, and the ring is not aromatic.
        m.bond(C[2], C[3], 2, cc)
    if c1_methyl:
        m.bond(C[4], away(C[4], *cc))           # the C1 methyl
    # 7-methoxy on the benzene, drawn as O-CH3.
    o = away(A[3], *ca); m.bond(A[3], o); m.label(o, 'O')
    m.bond(o, out(o, (o[0] - L, o[1] + L * 0.5)))
    return m

M['harmine'] = ('Harmine', beta_carboline('harmine'))
M['harmaline'] = ('Harmaline', beta_carboline('harmaline', saturated=True))

# Azulene: a fused 5-7 bicycle, and the reason yarrow oil is blue.
c5 = (0.0, 0.0)
F = ring5(*c5, rot=90)
m = Mol('azulene')
m.ring(F)
S, cs_ = ring_on_edge(F[0], F[1], 7, c5)
for i in range(7):
    if i == 0:
        continue
    m.bond(S[i], S[(i + 1) % 7])
m.bond(S[6], S[0])
# Alternating unsaturation around both rings — azulene is fully conjugated.
m.bond(F[1], F[2], 2, c5)
m.bond(F[3], F[4], 2, c5)
m.bond(S[1], S[2], 2, cs_)
m.bond(S[3], S[4], 2, cs_)
m.bond(S[5], S[6], 2, cs_)
M['azulene'] = ('Azulene', m)

# Salicin: salicyl alcohol 2-O-beta-D-glucoside. The card prints "Sallicin", a known typo.
ca = (0.0, 0.0)
A = ring6(*ca, rot=0)
m = Mol('salicin')
m.ring(A, aromatic_from=(0, 2, 4), centre=ca)
ch2 = away(A[1], *ca); m.bond(A[1], ch2)
oh = out(ch2, (ch2[0], ch2[1] - L)); m.bond(ch2, oh); m.label(oh, 'OH')
og = away(A[0], *ca); m.bond(A[0], og); m.label(og, 'O')
# The pyranose. Drawn by the shared helper, which walks C1-O-C5 in the right order and
# carries the hydroxymethyl the first version left off entirely.
cg = (og[0] + L * 1.5, og[1] + L * 0.5)
c1 = glucopyranose(m, cg, og, rot=0)
m.bond(og, c1)
M['salicin'] = ('Salicin', m)

# Chlorogenic acid: the caffeoyl ester of quinic acid.
ca = (0.0, 0.0)
A = ring6(*ca, rot=0)
m = Mol('chlorogenic')
m.ring(A, aromatic_from=(0, 2, 4), centre=ca)
for i in (2, 3):
    q = away(A[i], *ca); m.bond(A[i], q); m.label(q, 'OH')      # the catechol
v0 = A[0]
c_a = (v0[0] + L * 0.866, v0[1] - L * 0.5)
c_b = (c_a[0] + L * 0.866, c_a[1] + L * 0.5)
m.bond(v0, c_a); m.bond(c_a, c_b, 2)                             # trans vinyl
c_c = (c_b[0] + L * 0.866, c_b[1] - L * 0.5)
m.bond(c_b, c_c)
ok = (c_c[0], c_c[1] - L); m.bond(c_c, ok, 2); m.label(ok, 'O')
o_d = (c_c[0] + L * 0.866, c_c[1] + L * 0.5)
m.bond(c_c, o_d); m.label(o_d, 'O')                              # the ester link
# Quinic acid: a cyclohexane carrying three hydroxyls and a carboxylic acid.
cq = (o_d[0] + L * 0.866 + L, o_d[1] - L * 0.5)
Q = ring6(*cq, rot=0)
near = min(range(6), key=lambda i: (Q[i][0] - o_d[0]) ** 2 + (Q[i][1] - o_d[1]) ** 2)
m.bond(o_d, Q[near])
m.ring(Q)
for off in (1, 2, 3):
    v = Q[(near + off) % 6]
    if v[1] >= max(x[1] for x in Q) - 0.1:
        continue          # skip the vertex the carboxyl now occupies
    q = away(v, *cq); m.bond(v, q); m.label(q, 'OH')
# The carboxyl goes on the vertex furthest from the ester link and points straight out,
# so its two oxygens cannot land on top of a ring hydroxyl.
cq_v = max((v for i, v in enumerate(Q) if i != near), key=lambda v: v[1])
cooh = (cq_v[0], cq_v[1] + L)
m.bond(cq_v, cooh)
m.bond(cooh, (cooh[0] + L * 0.866, cooh[1] + L * 0.5), 2)
m.label((cooh[0] + L * 0.866, cooh[1] + L * 0.5), 'O')
m.bond(cooh, (cooh[0] - L * 0.866, cooh[1] + L * 0.5))
m.label((cooh[0] - L * 0.866, cooh[1] + L * 0.5), 'HO')
M['chlorogenic-acid'] = ('Chlorogenic acid', m)





# ── Allicin, and the class scaffolds ─────────────────────────────────────────

# Allicin: diallyl thiosulfinate, formed the moment garlic tissue is crushed.
m = Mol('allicin')
pts = [(0.0, 0.0)]
step = [(L * 0.866, -L * 0.5), (L * 0.866, L * 0.5)]
for i in range(6):
    d = step[i % 2]
    pts.append((pts[-1][0] + d[0], pts[-1][1] + d[1]))
m.bond(pts[0], pts[1], 2)                    # terminal alkene
m.bond(pts[1], pts[2])
m.bond(pts[2], pts[3])                       # S(=O)
m.label(pts[2], 'S')
m.bond(pts[3], pts[4])
m.label(pts[3], 'S')
m.bond(pts[4], pts[5])
m.bond(pts[5], pts[6], 2)                    # the second terminal alkene
o = (pts[2][0], pts[2][1] - L)
m.bond(pts[2], o, 2); m.label(o, 'O')        # the sulfinyl oxygen
M['allicin'] = ('Allicin', m)

# ── CLASS SCAFFOLDS ──────────────────────────────────────────────────────────
#
# The CORE SKELETON that defines a class, not a member of it. A flavonoid is defined by its
# C6-C3-C6 core; drawing that core is a true statement about every flavonoid, where drawing
# one flavonoid and labelling it "Flavonoids" would be false. Rendered ghosted and captioned
# as a shared core so the two can never be confused.
#
# ONLY where a class really has one defining skeleton. Tannins (hydrolysable vs condensed),
# saponins (triterpenoid vs steroidal), alkaloids and glycosides deliberately have none —
# that restraint is what makes the rest of these credible.

# Flavonoid core: 2-phenylchromene. C6-C3-C6, no substituents, no oxidation state implied.
ca = (0.0, 0.0)
A = ring6(*ca)
cc = fuse(A, 0, 1, *ca)
C = ring6(*cc)
m = Mol('flavonoid-core')
A, C, cc, (o1, c2, c3, c4) = chromene(m)
m.label(o1, 'O')
m.bond(c2, c3, 2, cc)                             # C2=C3, now a real ring edge
bstart = away(c2, *cc, d=L)
cb = out(bstart, (bstart[0] + (bstart[0] - cc[0]), bstart[1] + (bstart[1] - cc[1])), d=L)
B = ring6(*cb)
near = min(range(6), key=lambda i: (B[i][0] - c2[0]) ** 2 + (B[i][1] - c2[1]) ** 2)
m.bond(c2, B[near])
m.ring(B, aromatic_from=(0, 2, 4), centre=cb)
M['flavonoid-core'] = ('Flavonoid core', m)

# Coumarin core: 2H-chromen-2-one. Coumarin itself is the parent of the class.
ca = (0.0, 0.0)
A = ring6(*ca)
cc = fuse(A, 0, 1, *ca)
C = ring6(*cc)
m = Mol('coumarin-core')
A, C, cc, (o1, c2, c3, c4) = chromene(m)
m.label(o1, 'O')                                  # the ring oxygen
ket = away(c2, *cc); m.bond(c2, ket, 2); m.label(ket, 'O')   # the lactone carbonyl at C2
m.bond(c3, c4, 2, cc)                             # C3=C4
M['coumarin-core'] = ('Coumarin core', m)

# Iridoid core: cyclopenta[c]pyran — a cyclopentane fused to a pyran.
ca = (0.0, 0.0)
P = ring6(*ca, rot=30)
m = Mol('iridoid-core')
m.ring(P)
m.label(P[1], 'O')
F, cf = ring_on_edge(P[3], P[4], 5, ca)
for i in range(5):
    if i == 0:
        continue
    m.bond(F[i], F[(i + 1) % 5])
m.bond(F[4], F[0])
m.bond(P[5], P[0], 2, ca)                         # the enol ether double bond
M['iridoid-core'] = ('Iridoid core', m)

# Anthraquinone core: 9,10-anthraquinone, stripped of every substituent.
cA = (0.0, 0.0); cM = (L * 1.732, 0.0); cC = (L * 3.464, 0.0)
A, Mid, C = ring6(*cA, rot=30), ring6(*cM, rot=30), ring6(*cC, rot=30)
m = Mol('anthraquinone-core')
m.ring(A, aromatic_from=(1, 3), centre=cA)
m.bond(A[0], A[5], 2, cA)
m.ring(C, aromatic_from=(0, 4), centre=cC)
m.bond(C[2], C[3], 2, cC)
for i in range(6):
    if {i, (i + 1) % 6} in ({2, 3}, {0, 5}):
        continue
    m.bond(Mid[i], Mid[(i + 1) % 6])
for idx in (1, 4):
    o = away(Mid[idx], *cM); m.bond(Mid[idx], o, 2); m.label(o, 'O')
M['anthraquinone-core'] = ('Anthraquinone core', m)

# Anthocyanin core: the flavylium cation — the flavonoid core with a charged oxygen.
ca = (0.0, 0.0)
A = ring6(*ca)
cc = fuse(A, 0, 1, *ca)
C = ring6(*cc)
m = Mol('flavylium-core')
A, C, cc, (o1, c2, c3, c4) = chromene(m)
m.label(o1, 'O+')                                 # the flavylium oxygen carries the charge
m.bond(c2, c3, 2, cc)
bstart = away(c2, *cc, d=L)
cb = out(bstart, (bstart[0] + (bstart[0] - cc[0]), bstart[1] + (bstart[1] - cc[1])), d=L)
B = ring6(*cb)
near = min(range(6), key=lambda i: (B[i][0] - c2[0]) ** 2 + (B[i][1] - c2[1]) ** 2)
m.bond(c2, B[near])
m.ring(B, aromatic_from=(0, 2, 4), centre=cb)
M['flavylium-core'] = ('Flavylium core', m)

# Silica: the SiO4 tetrahedron every silicate is built from. A structural depiction of a
# mineral compound, which is what silica is — not a molecule, and never an element tile.
m = Mol('silica-tetrahedron')
si = (0.0, 0.0)
m.label(si, 'Si')
for dx, dy in ((0, -L * 1.1), (-L * 0.95, L * 0.55), (L * 0.95, L * 0.55), (L * 0.42, -L * 0.28)):
    o = (si[0] + dx, si[1] + dy)
    m.bond(si, o); m.label(o, 'O')
M['silica-tetrahedron'] = ('Silica', m)


# Sinigrin: allyl glucosinolate — the compound that becomes the mustard bite once the leaf
# is damaged. Clears the last card that showed no chemistry at all.
m = Mol('sinigrin')
cg = (0.0, 0.0)
sulf = (L * 2.37, L * 0.5)                            # where the thioglucoside sulfur sits
c1 = glucopyranose(m, cg, sulf, rot=0)
m.bond(c1, sulf); m.label(sulf, 'S')
cc_ = (sulf[0] + L * 0.87, sulf[1] - L * 0.5)         # the central carbon
m.bond(sulf, cc_)
# The allyl side chain.
a1 = (cc_[0] + L * 0.5, cc_[1] + L * 0.87)
m.bond(cc_, a1)
a2 = (a1[0] + L * 0.87, a1[1] + L * 0.5); m.bond(a1, a2)
a3 = (a2[0] + L * 0.87, a2[1] - L * 0.5); m.bond(a2, a3, 2)
# The oxime sulfate: C=N-O-SO3.
n = (cc_[0], cc_[1] - L)
m.bond(cc_, n, 2); m.label(n, 'N')
o1 = (n[0] + L * 0.87, n[1] - L * 0.5); m.bond(n, o1); m.label(o1, 'O')
sx = (o1[0] + L * 0.87, o1[1] + L * 0.5); m.bond(o1, sx); m.label(sx, 'S')
for dx, dy, lab in ((L * 0.87, -L * 0.5, 'O'), (L * 0.87, L * 0.5, 'O'), (0, L, 'O-')):
    q = (sx[0] + dx, sx[1] + dy)
    m.bond(sx, q, 2 if lab == 'O' else 1); m.label(q, lab)
M['sinigrin'] = ('Sinigrin', m)

# Lactucin: the guaianolide that makes chicory and prickly lettuce bitter. Two cards name it
# and a third names lactucopicrin, which is lactucin's hydroxyphenylacetate ester.
#
# Connectivity is read off the published SMILES rather than recalled:
#   CC1=C2[C@@H]([C@H]3OC(=O)C(=C)[C@@H]3[C@@H](O)C1)C(CO)=CC2=O
# which walks a seven-membered carbocycle carrying a fused cyclopentenone on one edge and a
# fused gamma-butyrolactone on another - the 5-7-5 that defines a guaianolide. Stereocentres
# are dropped: this plate states the skeleton, and a wedge/hash pattern is unreadable at the
# size it renders.
def guaianolide(name):
    """The lactucin skeleton, shared by lactucin and its ester lactucopicrin.

    Returns the molecule plus the C8 vertex and the seven-ring centre, so the caller can
    decide what hangs off C8 - a bare hydroxyl, or the hydroxyphenylacetate that makes
    lactucopicrin. Building the ester as a second copy of these thirty lines is how the two
    would drift apart.
    """
    c7 = (0.0, 0.0)
    H = ringn(*c7, 7, rot=90)      # a2, a3, a4, a5, a11, a12, a14 in SMILES order
    m = Mol(name)
    m.ring(H)
    # Both fused rings are built before any substituent, so substituent placement can see
    # every ring atom and avoid all of them.
    P, cp = fused(m, H[1], H[2], 5, c7)     # cyclopentenone: P[2]=a15, P[3]=a18, P[4]=a19
    Lc, cl = fused(m, H[3], H[4], 5, c7)    # lactone: Lc[2]=a9, Lc[3]=a7, Lc[4]=a6
    occupied = list(H) + list(P) + list(Lc)

    m.bond(H[0], H[1], 2, c7)                          # the trisubstituted alkene
    m.bond(P[2], P[3], 2, cp)                          # the enone alkene
    m.label(Lc[4], 'O')                                # the lactone oxygen

    def stub(v, centre, order=1, text=None):
        q = away(v, *centre)
        m.bond(v, q, order)
        if text:
            m.label(q, text)
        occupied.append(q)
        return q

    stub(H[0], c7)                                     # C15 methyl, drawn as a bare bond
    stub(P[4], cp, 2, 'O')                             # the cyclopentenone ketone
    stub(Lc[3], cl, 2, 'O')                            # the lactone carbonyl
    stub(Lc[2], cl, 2)                                 # the exocyclic methylene

    # The hydroxymethyl. Its oxygen is placed by `branch`, which measures both continuations
    # instead of assuming one: hard-coding "straight up" put this OH back on top of the ring,
    # the same way the first sinigrin put one on top of a ring carbon.
    ch2 = stub(P[2], cp)
    oh = branch(ch2, (ch2[0] - P[2][0], ch2[1] - P[2][1]), occupied)
    m.bond(ch2, oh); m.label(oh, 'OH')
    occupied.append(oh)
    return m, H[5], c7, occupied


# Lactucin: the guaianolide that makes chicory and prickly lettuce bitter. Two cards name it
# and a third names lactucopicrin, which is lactucin's hydroxyphenylacetate ester.
#
# Connectivity is read off the published SMILES rather than recalled:
#   CC1=C2[C@@H]([C@H]3OC(=O)C(=C)[C@@H]3[C@@H](O)C1)C(CO)=CC2=O
# which walks a seven-membered carbocycle carrying a fused cyclopentenone on one edge and a
# fused gamma-butyrolactone on another - the 5-7-5 that defines a guaianolide. Stereocentres
# are dropped: this plate states the skeleton, and a wedge/hash pattern is unreadable at the
# size it renders.
m, c8, c7, occupied = guaianolide('lactucin')
o8 = away(c8, *c7); m.bond(c8, o8); m.label(o8, 'OH')
M['lactucin'] = ('Lactucin', m)

# Lactucopicrin: lactucin esterified at C8 with 4-hydroxyphenylacetic acid. Same skeleton,
# one arm - which is why it shares the builder rather than being redrawn.
m, c8, c7, occupied = guaianolide('lactucopicrin')
o8 = away(c8, *c7); m.bond(c8, o8); m.label(o8, 'O')
step = (o8[0] - c8[0], o8[1] - c8[1])
acyl = branch(o8, step, occupied); m.bond(o8, acyl); occupied.append(acyl)
ket = branch(acyl, (acyl[0] - o8[0], acyl[1] - o8[1]), occupied)
m.bond(acyl, ket, 2); m.label(ket, 'O'); occupied.append(ket)
# The benzylic CH2 must TURN. Continuing straight made acyl, CH2 and the ring collinear,
# which erases the vertex: a skeletal formula shows a carbon as a bend, so a straight run
# drew this phenylacetate as a benzoate - one carbon short, and a different ester.
mth = branch(acyl, (acyl[0] - o8[0], acyl[1] - o8[1]), occupied)
m.bond(acyl, mth); occupied.append(mth)
astart = out(mth, (mth[0] + (mth[0] - acyl[0]), mth[1] + (mth[1] - acyl[1])))
cb = out(astart, (astart[0] + (astart[0] - mth[0]), astart[1] + (astart[1] - mth[1])))
B = ring6(*cb)
near = min(range(6), key=lambda i: (B[i][0] - mth[0]) ** 2 + (B[i][1] - mth[1]) ** 2)
m.bond(mth, B[near])
m.ring(B, aromatic_from=(0, 2, 4), centre=cb)
para = B[(near + 3) % 6]
poh = away(para, *cb); m.bond(para, poh); m.label(poh, 'OH')      # the 4-hydroxyl
M['lactucopicrin'] = ('Lactucopicrin', m)

# Betalain core: betalamic acid. Every betalain - the red betacyanins and the yellow
# betaxanthins alike - is this molecule condensed through its aldehyde with an amine, so
# drawing it states something true of the whole pigment class. What varies is what the
# aldehyde is joined to, which is exactly why the plate is captioned as a shared core.
#
# From the published SMILES: OC(=O)C1CC(=CC=O)C=C(N1)C(O)=O
cbz = (0.0, 0.0)
R = ring6(*cbz, rot=90)            # R[0]=N1, R[1]=C2, R[2]=C3, R[3]=C4, R[4]=C5, R[5]=C6
m = Mol('betalain-core')
m.ring(R)
m.label(R[0], 'NH')
m.bond(R[4], R[5], 2, cbz)                             # C5=C6
carboxyl(m, R[1], cbz)                                 # C2 carboxyl
carboxyl(m, R[5], cbz)                                 # C6 carboxyl
ylid = away(R[3], *cbz); m.bond(R[3], ylid, 2)         # the exocyclic alkene at C4
ald = out(ylid, (ylid[0] - L * 0.87, ylid[1] + L * 0.5))
m.bond(ylid, ald)
ao = out(ald, (ald[0] - L * 0.87, ald[1] + L * 0.5))
m.bond(ald, ao, 2); m.label(ao, 'O')                   # the aldehyde every betalain joins through
M['betalain-core'] = ('Betalain core', m)

# Arctiin is NOT here, and it was drawn before being dropped. The dibenzylbutyrolactone
# skeleton came out perfectly legible - but arctiin is arctigenin 4'-O-GLUCOSIDE, and adding
# the pyranose with its four hydroxyls and hydroxymethyl roughly doubles the ink on an
# already four-ring molecule. Shipping the aglycone under the name "Arctiin" is the same
# error as letting lactucopicrin borrow lactucin's plate: a drawing captioned with the name
# of a different compound. Burdock keeps the pending plate, which says nothing untrue.

# Catechin core: flavan-3-ol. Every catechin is one - the name IS the skeleton, the same way
# "flavonoid" is - so drawing it states something true of the whole group. Differs from the
# flavonoid core by having a saturated C ring carrying the 3-hydroxyl.
ca = (0.0, 0.0)
A = ring6(*ca)
cc = fuse(A, 0, 1, *ca)
C = ring6(*cc)
m = Mol('catechin-core')
A, C, cc, (o1, c2, c3, c4) = chromene(m)
m.label(o1, 'O')
oh3 = away(c3, *cc); m.bond(c3, oh3); m.label(oh3, 'OH')     # the 3-hydroxyl, on C3
bstart = away(c2, *cc, d=L)
cb = out(bstart, (bstart[0] + (bstart[0] - cc[0]), bstart[1] + (bstart[1] - cc[1])), d=L)
B = ring6(*cb)
near = min(range(6), key=lambda i: (B[i][0] - c2[0]) ** 2 + (B[i][1] - c2[1]) ** 2)
m.bond(c2, B[near])
m.ring(B, aromatic_from=(0, 2, 4), centre=cb)
M['catechin-core'] = ('Catechin core', m)

# Glucosinolate core: the thioglucoside plus sulfonated oxime that every glucosinolate has,
# with the variable side chain drawn as R. Sinigrin above is this core with R = allyl, which
# is exactly the relationship a scaffold is meant to show.
m = Mol('glucosinolate-core')
cg = (0.0, 0.0)
sulf = (L * 2.37, L * 0.5)
c1 = glucopyranose(m, cg, sulf, rot=0)
m.bond(c1, sulf); m.label(sulf, 'S')
cc_ = (sulf[0] + L * 0.87, sulf[1] - L * 0.5)
m.bond(sulf, cc_)
r = (cc_[0] + L * 0.5, cc_[1] + L * 0.87)
m.bond(cc_, r); m.label(r, 'R')                       # the side chain that varies
n = (cc_[0], cc_[1] - L)
m.bond(cc_, n, 2); m.label(n, 'N')
o1 = (n[0] + L * 0.87, n[1] - L * 0.5); m.bond(n, o1); m.label(o1, 'O')
sx = (o1[0] + L * 0.87, o1[1] + L * 0.5); m.bond(o1, sx); m.label(sx, 'S')
for dx, dy, lab in ((L * 0.87, -L * 0.5, 'O'), (L * 0.87, L * 0.5, 'O'), (0, L, 'O-')):
    q = (sx[0] + dx, sx[1] + dy)
    m.bond(sx, q, 2 if lab == 'O' else 1); m.label(q, lab)
M['glucosinolate-core'] = ('Glucosinolate core', m)

# Ellagic acid is NOT here, and it is the one I most wanted: three cards name it. Drawn as
# two benzenes bridged by a pair of lactones, the rings overlapped and the bridges cut
# straight through them. A tetracycle whose rings intersect is not a near miss, it is a
# different picture — and on three cards it would have been the most-seen wrong thing here.

# Resveratrol and lawsone were dropped from the first tranche because both came out wrong -
# overlapping rings in one, the carbonyls on the wrong carbons in the other. Both are back
# above, rebuilt by walking explicit coordinates rather than going through the generic
# fused-ring helper, which is what mis-seated them. That helper sorts a ring's free vertices
# by position, which is fine for a flavonol and wrong for a naphthoquinone.

# ── Emit ──────────────────────────────────────────────────────────────────────
from mol import render
parts = []
for key, (label, m) in M.items():
    vb, body = render(m)
    parts.append(f"""  '{key}': {{
    viewBox: '{vb}',
    art: (
      <>
      {body}
      </>
    ),
  }},""")

header = '''import type { ReactNode } from 'react';

/**
 * Skeletal formulas for the molecules the deck actually names.
 *
 * DO NOT EDIT THIS FILE. It is generated by `npm run build:structures`
 * (`scripts/chemistry/build_structures.py`); a hand-edit is overwritten by the next run.
 *
 * GENERATED GEOMETRY, HAND-CHECKED CHEMISTRY. The coordinates come from a real hexagon
 * lattice because a hand-placed benzene ring is never quite regular and a plate of wonky
 * rings reads as decoration rather than as chemistry. What is NOT generated is which atoms
 * go where: every entry below was checked against a reference before it shipped.
 *
 * A molecule is only listed here when it can be drawn BOTH accurately and legibly at the
 * size the plate renders it, and every entry was read back at that size before it shipped.
 * Rutin (quercetin plus a rutinose disaccharide) and taraxasterol (a pentacyclic
 * triterpene) are deliberately absent: at plate size they become a scribble, and a scribble
 * that claims to be a structure is worse than no structure at all — a reader cannot tell
 * the difference, so it spends the credibility the accurate ones earn. They render as the
 * pending plate instead, which says nothing untrue.
 *
 * Strokes are `currentColor`, so the plate's own violet carries through and there is no
 * colour decision made down here.
 */
export interface StructureArt {
  viewBox: string;
  art: ReactNode;
}

export const STRUCTURES: Record<string, StructureArt> = {
'''
# Anchored to this file, not to the working directory. A repo-relative path here quietly
# wrote a whole stray src/ tree when the script was run from somewhere else, and the real
# structures.tsx kept its previous contents - the same trap as previewing a sprite and
# committing the old PNG.
out_path = pathlib.Path(__file__).resolve().parents[2] / 'src/components/chemistry/structures.tsx'
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(header + '\n'.join(parts) + '\n};\n')
print('wrote', len(M), 'structures')

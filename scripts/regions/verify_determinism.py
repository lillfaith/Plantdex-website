#!/usr/bin/env python3
"""Evidence that the polygon asset is byte-identical across environments (PROPOSAL tooling).
  python3 -I scripts/regions/verify_determinism.py --source <dir>/us_eco_l3 --tol 50 --work <dir>
Builds the asset (1) normally, (2) in subprocesses under PYTHONHASHSEED 1 and 777, (3) in-process with sin/cos/atan2/log/sqrt/asin replaced by
versions that return the neighbouring float (one ulp up, then one ulp down), which is the kind of difference a different libm produces.
Only the per-vertex inverse projection is exposed to libm; the module constants are computed once with the real functions. Prints sha256s.
"""
import argparse, hashlib, math, os, subprocess, sys, types
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import polygon_resolver as PR
from mapping_v2_table import T
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--source', required=True); ap.add_argument('--tol', type=int, default=50); ap.add_argument('--work', required=True); a = ap.parse_args()
    h = lambda b: hashlib.sha256(b).hexdigest()[:16]; res = {}
    base = PR.build(a.source, a.tol, T); res['normal'] = h(base)
    for seed in ('1', '777'):
        out = os.path.join(a.work, f'seed{seed}.bin')
        subprocess.run([sys.executable, '-I', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'polygon_resolver.py'), 'build', '--source', a.source, '--tol', str(a.tol), '--out', out],
                       check=True, env={**os.environ, 'PYTHONHASHSEED': seed}, capture_output=True)
        res[f'PYTHONHASHSEED={seed}'] = h(open(out, 'rb').read())
    real = math
    for label, direction in (('libm +1ulp', math.inf), ('libm -1ulp', -math.inf)):
        shim = types.SimpleNamespace(**{k: getattr(real, k) for k in dir(real) if not k.startswith('_')})
        for fn in ('sin', 'cos', 'atan2', 'log', 'sqrt', 'asin'):
            f = getattr(real, fn); setattr(shim, fn, (lambda f: lambda *x: real.nextafter(f(*x), direction))(f))
        PR.math = shim
        try: res[label] = h(PR.build(a.source, a.tol, T))
        finally: PR.math = real
    for k, v in res.items(): print(f'{k:22s} {v}')
    print('ALL IDENTICAL' if len(set(res.values())) == 1 else 'DIFFERENT')
if __name__ == '__main__': main()

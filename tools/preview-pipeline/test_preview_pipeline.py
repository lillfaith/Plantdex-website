#!/usr/bin/env python3
"""Self-contained positive and negative tests for the preview-only version gates.
Synthetic shapes are TEST FIXTURES ONLY, never claimed as botanical artwork.
"""
from pathlib import Path
import hashlib
import subprocess
import sys
import tempfile
from PIL import Image, ImageDraw

TOOL=Path(__file__).with_name('preview_pipeline.py')

def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def run(*args,expect=True):
    r=subprocess.run([sys.executable,str(TOOL),*map(str,args)],capture_output=True,text=True)
    if (r.returncode == 0) != bool(expect):
        raise AssertionError(f"Unexpected result expected={expect} code={r.returncode}\nCALL {' '.join(map(str,args))}\nOUT {r.stdout}\nERR {r.stderr}")
    return r.stdout if expect else r.stderr

with tempfile.TemporaryDirectory() as td:
    td=Path(td)
    root=td/'card_62_history'
    # Fake colorful image tests only; not a real photo or botanical extraction.
    src=Image.new('RGB',(480,700),(88,80,70))
    d=ImageDraw.Draw(src)
    d.line([(200,620),(213,200)],fill=(80,170,80),width=12)
    for x,y in [(210,210),(175,330),(265,310),(180,440),(245,425)]:
        d.ellipse((x-28,y-20,x+28,y+20),fill=(220,225,220))
        d.line((210,y,x,y),fill=(90,170,90),width=6)
    source=td/'source.jpg';src.save(source)
    back_src=Image.new('RGB',(390,630),(151,90,189))
    back=td/'back.png';back_src.save(back)
    grad=Image.new('RGB',(500,500))
    px=grad.load()
    for y in range(500):
        for x in range(500):
            px[x,y]=(int(100+120*y/499),int(110+45*y/499),int(198-45*y/499))
    gradient=td/'gradient.png';grad.save(gradient)
    original_base_hash=sha(back)
    original_gradient_hash=sha(gradient)

    run('init','--root',root,'--card',62,'--species','Synthetic validation specimen','--photo',source,'--back',back,'--gradient',gradient,'--photo-id','synthetic-test-only')
    run('crop','--root',root,'--parent','S00_source/v0001','--box',40,20,430,660)
    # Stage 01 must be reviewed before a raw cutout can be registered.
    cut=Image.new('RGBA',(390,640),(0,0,0,0))
    draw=ImageDraw.Draw(cut)
    draw.line([(165,590),(170,130)],fill=(35,155,75,255),width=9)
    for x,y in [(169,135),(108,235),(225,260),(135,345),(205,400)]:
        draw.line([(170,y),(x,y)],fill=(35,155,75,255),width=5)
        draw.ellipse((x-19,y-16,x+19,y+16),fill=(230,218,218,255))
    cutfile=td/'cutout.png';cut.save(cutfile)
    run('import-cutout','--root',root,'--parent','S01_crop/v0001','--stage','S02_raw_cutout','--file',cutfile,'--method','adobe-background-removal',expect=False)
    run('review','--root',root,'--version','S01_crop/v0001','--decision','pass','--reviewer','agent','--checks','composition-ok','--note','Synthetic crop visibly includes full stem and head fixtures')
    run('import-cutout','--root',root,'--parent','S01_crop/v0001','--stage','S02_raw_cutout','--file',cutfile,'--method','adobe-background-removal')
    # Invalid flat card cannot enter edited cutout stream.
    fullcard=td/'flat.png';back_src.save(fullcard)
    run('import-cutout','--root',root,'--parent','S02_raw_cutout/v0001','--stage','S03_refined_cutout','--file',fullcard,'--method','manual-mask',expect=False)
    run('import-cutout','--root',root,'--parent','S02_raw_cutout/v0001','--stage','S03_refined_cutout','--file',cutfile,'--method','manual-mask','--note','Test-only duplicate alpha shape')
    run('rotate','--root',root,'--parent','S03_refined_cutout/v0001','--degrees',5,expect=False)
    run('review','--root',root,'--version','S03_refined_cutout/v0001','--decision','pass','--reviewer','agent',
        '--checks','background-clear','anatomy-intact','stems-connected','silhouette-readable',
        '--note','Synthetic fixture inspected on transparent and contrasting backgrounds')
    run('rotate','--root',root,'--parent','S03_refined_cutout/v0001','--degrees',5)
    run('place','--root',root,'--parent','S04_upright/v0001',expect=False)
    run('review','--root',root,'--version','S04_upright/v0001','--decision','pass','--reviewer','agent','--checks','orientation-ok','--note','Synthetic stem remains near upright with no clipping')
    run('place','--root',root,'--parent','S04_upright/v0001')
    run('review','--root',root,'--version','S05_positioned/v0001','--decision','pass','--reviewer','agent','--checks','fits-oval','--note','Synthetic silhouette centered within oval without crop')
    run('gradient','--root',root,'--parent','S05_positioned/v0001')
    run('export-editor','--root',root,'--version','S06_gradient/v0001',expect=False)
    run('assemble','--root',root,'--parent','S06_gradient/v0001',expect=False)
    run('review','--root',root,'--version','S06_gradient/v0001','--decision','pass','--reviewer','agent','--checks','gradient-appearance-ok','--note','No source RGB colors visible; shape intact')
    run('assemble','--root',root,'--parent','S06_gradient/v0001')
    run('approve','--root',root,'--version','S07_card/v0001','--reviewer','agent','--note','Test agent cannot self-approve',expect=False)
    run('verify','--root',root)

    # Branch a new refined version from the same S02 without modifying prior one.
    run('import-cutout','--root',root,'--parent','S02_raw_cutout/v0001','--stage','S03_refined_cutout','--file',cutfile,'--method','manual-photo-edit','--note','Test-only alternative branch')
    run('verify','--root',root)
    assert (root/'history'/'S03_refined_cutout'/'v0001'/'asset.png').exists()
    assert (root/'history'/'S03_refined_cutout'/'v0002'/'asset.png').exists()
    assert sha(back)==original_base_hash
    assert sha(gradient)==original_gradient_hash
    print('PASS: 2 immutable branch versions; unreviewed stages blocked; flat-card import blocked; originals unchanged; exact gradient and assembled card verified; agent cannot owner-approve')

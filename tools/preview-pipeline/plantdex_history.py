#!/usr/bin/env python3
"""PlantDex non-destructive asset versioning and deterministic composition.

Standard library + Pillow. No image-generation calls. Never writes to original files.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import uuid
from PIL import Image, ImageDraw, ImageFont

ROLES = ('main', 'pixel', 'preview')
STAGES = ('source', 'crop', 'cutout', 'refined', 'native_icon', 'render_layer', 'gradient_overlay', 'mask')
FORMAT = 1

def now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for block in iter(lambda:f.read(1024*1024), b''):
            h.update(block)
    return h.hexdigest()

def readj(path, default=None):
    p=Path(path)
    return json.loads(p.read_text()) if p.exists() else default

def writej(path,obj):
    p=Path(path); p.parent.mkdir(parents=True,exist_ok=True)
    temp=p.with_name('.'+p.name+'.tmp-'+uuid.uuid4().hex[:8])
    temp.write_text(json.dumps(obj,indent=2,sort_keys=True)+'\n')
    os.replace(temp,p)

def rootdir(root):
    r=Path(root).expanduser().resolve()
    if not (r/'project.json').is_file():
        raise ValueError(f'Not a PlantDex workspace: {r}')
    return r

def cardpath(root,card,role):
    if role not in ROLES: raise ValueError('Unknown role')
    return root/'cards'/f'{int(card):03d}'/role/'history.json'

def history(root,card,role):
    return readj(cardpath(root,card,role), {'format':FORMAT,'card':int(card),'role':role,'versions':[],'pins':{}})

def getversion(h,version):
    if version in ('latest','preferred','approved'):
        if version=='latest':
            return h['versions'][-1] if h['versions'] else None
        version=h['pins'].get(version)
    return next((v for v in h['versions'] if v['id']==version),None)

def abs_asset(root,v):
    return root/v['path']

def must_version(root,card,role,version):
    h=history(root,card,role); v=getversion(h,version)
    if not v: raise ValueError(f'No {role} version {version} for card {card}')
    p=abs_asset(root,v)
    if not p.exists() or sha(p)!=v['sha256']:
        raise ValueError(f'Asset missing/modified: {p}')
    return v,p

def detect_info(p,role,stage):
    with Image.open(p) as im:
        if im.format != 'PNG' and stage!='source':
            raise ValueError(f'{stage} must be PNG')
        if stage!='source' and role in ('main','preview','pixel') and im.mode not in ('RGBA','LA','P'):
            raise ValueError('Edited assets must have transparency (PNG with alpha)')
        if stage!='source' and 'A' not in im.convert('RGBA').getbands():
            raise ValueError('Expected an RGBA-capable image')
        if role=='pixel' and stage=='native_icon':
            if im.size!=(24,24) or im.mode!='RGBA':
                raise ValueError('Pixel production icons MUST be 24x24 RGBA')
            a=im.getchannel('A')
            if not (a.getextrema()[0]==0 and a.getextrema()[1]>0):
                raise ValueError('Pixel icon missing real transparent background')
        if role in ('main','preview') and stage in ('cutout','refined','mask'):
            if im.mode!='RGBA': raise ValueError('Cutouts/masks must be RGBA PNG')
            lo,hi=im.getchannel('A').getextrema()
            if lo != 0 or hi == 0: raise ValueError('Cutout must have visible subject and transparent background')
        return {'size':list(im.size),'mode':im.mode,'format':im.format}

def add_asset(root,card,role,file,stage,parent=None,release_tag=None,note='',method='photo_processing',species=None):
    file=Path(file).resolve(); root=rootdir(root)
    if role not in ROLES or stage not in STAGES: raise ValueError('Unknown role or stage')
    if not file.is_file(): raise ValueError(f'Missing file {file}')
    if method in ('full_card_generation','generated_card'):
        raise ValueError('Full card generation is prohibited')
    if role=='pixel' and 'generate' in method.lower():
        raise ValueError('Pixel icons cannot be generated illustrations')
    info=detect_info(file,role,stage)
    h=history(root,card,role)
    if parent and not getversion(h,parent): raise ValueError('Parent is not a version in this role')
    seq=len(h['versions'])+1; version=f'v{seq:04d}'; digest=sha(file)
    locked=readj(root/'project.json')['originals']
    if digest in {v['sha256'] for v in locked.values()}:
        raise ValueError('PROHIBITED: a locked card template or gradient cannot be imported as botanical artwork')
    ext=file.suffix.lower()
    rel=Path('cards')/f'{int(card):03d}'/role/'versions'/version/(f'{stage}{ext}')
    target=root/rel; target.parent.mkdir(parents=True,exist_ok=False)
    shutil.copy2(file,target)
    os.chmod(target,0o444)  # immutable by convention; sha validation catches later tampering
    rec={'id':version,'parent':parent,'stage':stage,'path':str(rel),'sha256':digest,
         'release_tag':release_tag,'created_utc':now(),'note':note,'method':method,'properties':info}
    h['versions'].append(rec)
    if species:
        species_map=readj(root/'species.json',{})
        species_map[str(int(card))]=species
        writej(root/'species.json',species_map)
    writej(cardpath(root,card,role),h)
    return rec

def init(args):
    root=Path(args.root).expanduser().resolve()
    if (root/'project.json').exists(): raise ValueError('Workspace already initialized')
    root.mkdir(parents=True,exist_ok=True)
    originals={}
    for k,f in [('front',args.front),('back',args.back),('gradient',args.gradient)]:
        p=Path(f).resolve()
        if not p.is_file(): raise ValueError(f'Missing {p}')
        with Image.open(p) as im:
            size=list(im.size)
        rel=Path('immutable')/(k+p.suffix.lower())
        dest=root/rel; dest.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(p,dest); os.chmod(dest,0o444)
        originals[k]={'path':str(rel),'sha256':sha(dest),'size':size}
    if originals['front']['size']!=[390,630] or originals['back']['size']!=[390,630]:
        raise ValueError('Expected the original 390x630 card templates')
    project={'format':FORMAT,'created_utc':now(),'originals':originals,'policy':{'no_card_in_image_generation':True,'no_overwrites':True,'required_icon_dimensions':[24,24]}}
    writej(root/'project.json',project)
    print(f'Created {root}')

def verify_orig(root):
    project=readj(root/'project.json')
    for name,v in project['originals'].items():
        p=root/v['path']
        if not p.is_file() or sha(p)!=v['sha256']:
            raise ValueError(f'IMMUTABLE {name} missing or modified')
    return project

def importcmd(args):
    rec=add_asset(Path(args.root),args.card,args.role,args.file,args.stage,args.parent,args.tag,args.note,args.method,args.species)
    print(f'Imported card {args.card} {args.role} {rec["id"]} [{rec["stage"]}] {rec["sha256"][:12]}')

def histcmd(args):
    r=rootdir(args.root);h=history(r,args.card,args.role)
    print(f'CARD {args.card} / {args.role} / pins={h["pins"]}')
    for v in h['versions']:
        print(f' {v["id"]} parent={v["parent"] or "-"} stage={v["stage"]:16s} tag={v["release_tag"] or "-":8s} sha={v["sha256"][:12]} {v["note"]}')

def pincmd(args):
    r=rootdir(args.root);h=history(r,args.card,args.role)
    v=getversion(h,args.version)
    if not v: raise ValueError('Unknown version')
    if v['stage']=='source': raise ValueError('Cannot pin raw source as finished artwork')
    must_version(r,args.card,args.role,v['id'])
    if args.label=='approved' and v['stage'] not in ('refined','cutout','native_icon'):
        raise ValueError('Only cleaned cutouts or native icons may be approved')
    h['pins'][args.label]=v['id']
    writej(cardpath(r,args.card,args.role),h)
    print(f'card {args.card} {args.role}: {args.label} -> {v["id"]}')

def begin(args):
    root=rootdir(args.root)
    v,p=must_version(root,args.card,args.role,args.version)
    if v['stage'] not in ('source','crop','cutout','refined','native_icon','mask'):
        raise ValueError('Begin edits from a botanical photo or asset only; never from a card mockup')
    job_id='job-'+uuid.uuid4().hex[:12]
    folder=root/'work'/job_id; folder.mkdir(parents=True)
    dest=folder/('input'+p.suffix); shutil.copy2(p,dest)
    job={'created_utc':now(),'workspace':str(root),'card':int(args.card),'role':args.role,
         'parent_id':v['id'],'parent_sha256':v['sha256'],'input_path':str(dest),'note':args.note,
         'allowed_input':'ISOLATED_ASSET_ONLY','status':'waiting_for_edited_asset'}
    writej(folder/'EDIT_JOB.json',job)
    print('WORK ORDER:',folder/'EDIT_JOB.json')
    print('EDIT INPUT ONLY:',dest)
    print('Edit the isolated input asset. NEVER submit a card or template to image generation.')

def commit(args):
    job=readj(args.job)
    if not job: raise ValueError('Job file missing')
    root=rootdir(job['workspace'])
    v,p=must_version(root,job['card'],job['role'],job['parent_id'])
    if v['sha256']!=job['parent_sha256']: raise ValueError('Parent version mismatch')
    if sha(job['input_path'])!=v['sha256']:
        raise ValueError('Edit job input was modified. Edit a separate OUTPUT file instead.')
    output=Path(args.output).resolve()
    if output==Path(job['input_path']).resolve(): raise ValueError('Do not overwrite the edit input')
    if args.stage=='source':raise ValueError('Cannot commit a source as edited output')
    rec=add_asset(root,job['card'],job['role'],output,args.stage,parent=v['id'],note=args.note,method=args.method)
    job['status']='committed';job['output_version']=rec['id'];writej(args.job,job)
    print(f'Committed NEW immutable {job["role"]} version {rec["id"]}, parent={v["id"]}')

def resolve(args):
    r=rootdir(args.root);v,p=must_version(r,args.card,args.role,args.version)
    print(json.dumps({'card':args.card,'role':args.role,'version':v,'absolute_path':str(p)},indent=2))

def crop_alpha(im):
    if im.mode!='RGBA': im=im.convert('RGBA')
    box=im.getchannel('A').getbbox()
    if not box: raise ValueError('Empty transparent image')
    return im.crop(box)

def overlay_plant(im,size,anchor):
    """Place alpha-isolated cutout into a rectangle, retaining proportions."""
    x0,y0,w,h=anchor
    cropped=crop_alpha(im)
    sw,sh=cropped.size
    factor=min(w/sw,h/sh)
    tw,th=max(1,round(sw*factor)),max(1,round(sh*factor))
    res=cropped.resize((tw,th),Image.Resampling.LANCZOS)
    out=Image.new('RGBA',size,(0,0,0,0))
    x=x0+round((w-tw)/2);y=y0+h-th
    out.alpha_composite(res,(x,y))
    return out

def exact_preview_mask(im,orig_gradient,card_size,placement):
    x0,y0,w,h=placement
    cropped=crop_alpha(im)
    sw,sh=cropped.size
    f=min(w/sw,h/sh)
    tw,th=max(1,round(sw*f)),max(1,round(sh*f))
    # alpha never sourced from a generated gradient. RGB never sourced from a generated plant.
    alpha=cropped.getchannel('A').resize((tw,th),Image.Resampling.LANCZOS)
    # Mapping is exact, deterministic and documented: supplied gradient scaled to this box.
    gradient=orig_gradient.convert('RGB').resize((w,h),Image.Resampling.BILINEAR)
    left=(w-tw)//2;top=(h-th)//2
    raw=Image.new('RGBA',(tw,th))
    raw.paste(gradient.crop((left,top,left+tw,top+th)),(0,0))
    raw.putalpha(alpha)
    out=Image.new('RGBA',card_size,(0,0,0,0))
    out.alpha_composite(raw,(x0+left,y0+top))
    return out

def render(args):
    root=rootdir(args.root); project=verify_orig(root)
    selections={}
    for role,requested in [('main',args.main),('pixel',args.pixel),('preview',args.preview)]:
        v,p=must_version(root,args.card,role,requested)
        expected={'main':('cutout','refined'),'pixel':('native_icon',),'preview':('cutout','refined')}
        if v['stage'] not in expected[role]:
            raise ValueError(f'{role} version stage {v["stage"]} invalid for assembly')
        selections[role]=(v,p)
    def orig(k): return Image.open(root/project['originals'][k]['path']).convert('RGBA')
    front=orig('front');back=orig('back');gradient=orig('gradient')
    # These coordinates are DEFAULTS ONLY. Update project layout for pixel-perfect art direction.
    default_layout={'main_rect':[34,80,322,250], 'pixel_square':[263,378,87,84], 'pixel_display':69,
                    'preview_rect':[144,202,102,235]}
    layout=readj(args.layout,default_layout) if args.layout else readj(root/'cards'/f'{int(args.card):03d}'/'layout.json',
                         readj(root/'layout.json',default_layout))
    if args.pixel_display is not None:
        layout['pixel_display']=args.pixel_display
    im=Image.open(selections['main'][1]).convert('RGBA')
    main_overlay=overlay_plant(im,front.size,layout['main_rect'])
    px=Image.open(selections['pixel'][1]); detect_info(selections['pixel'][1],'pixel','native_icon')
    d=int(layout['pixel_display']);x,y,w,h=layout['pixel_square']
    if d>min(w,h): raise ValueError('Pixel display exceeds icon square')
    pix_res=px.resize((d,d),Image.Resampling.NEAREST)
    pixel_overlay=Image.new('RGBA',front.size,(0,0,0,0))
    pixel_overlay.alpha_composite(pix_res,(x+(w-d)//2,y+(h-d)//2))
    img=Image.open(selections['preview'][1]).convert('RGBA')
    preview_overlay=exact_preview_mask(img,gradient,back.size,layout['preview_rect'])
    # Because each overlay starts transparent, no base pixel outside artwork alpha can change.
    front.alpha_composite(main_overlay);front.alpha_composite(pixel_overlay)
    back.alpha_composite(preview_overlay)
    rid='build-'+uuid.uuid4().hex[:12]
    out=root/'builds'/f'{int(args.card):03d}'/rid;out.mkdir(parents=True)
    artifacts={'front.png':front,'back.png':back,'main_overlay.png':main_overlay,
               'pixel_overlay.png':pixel_overlay,'preview_overlay.png':preview_overlay}
    for name,im in artifacts.items(): im.save(out/name)
    snapshot={'card':int(args.card),'id':rid,'created_utc':now(),'status':'review_draft',
              'exact_base_hashes':{k:v['sha256'] for k,v in project['originals'].items()},
              'versions':{role:selections[role][0]['id'] for role in ROLES},
              'source_hashes':{role:selections[role][0]['sha256'] for role in ROLES},
              'layout':layout,'output_hashes':{name:sha(out/name) for name in artifacts},
              'note':args.note,'botanical_visual_approval':False}
    writej(out/'BUILD_MANIFEST.json',snapshot)
    verify_orig(root)
    print('Assembled non-destructively:',out)
    print('Review only; no automated proof of botanical correctness.')

def verifycmd(args):
    root=rootdir(args.root);verify_orig(root)
    count=0
    for path in sorted((root/'cards').glob('*/*/history.json')):
        h=readj(path)
        for v in h['versions']:
            if not (root/v['path']).is_file() or sha(root/v['path'])!=v['sha256']:
                raise ValueError(f'CORRUPTED VERSION: {path} / {v["id"]}')
            count+=1
    builds=0
    for path in (root/'builds').glob('*/*/BUILD_MANIFEST.json'):
        snap=readj(path)
        for name,digest in snap['output_hashes'].items():
            p=path.parent/name
            if sha(p)!=digest: raise ValueError(f'CORRUPTED BUILD: {p}')
        builds+=1
    print(f'PASS: 3 immutable originals, {count} asset versions, {builds} build snapshots')

def statuscmd(args):
    root=rootdir(args.root)
    report={'workspace':str(root),'generated_utc':now(),'cards':{}}
    for path in sorted((root/'cards').glob('*/*/history.json')):
        h=readj(path); card=h['card'];role=h['role']
        report['cards'].setdefault(str(card),{})[role]={
            'version_count':len(h['versions']),
            'pins':h['pins'],
            'latest':h['versions'][-1]['id'] if h['versions'] else None,
            'preferred_path':next((v['path'] for v in h['versions'] if v['id']==h['pins'].get('preferred')),None),
            'preferred_sha256':next((v['sha256'] for v in h['versions'] if v['id']==h['pins'].get('preferred')),None)}
    if args.output:
        writej(args.output,report)
        print('Wrote:',args.output)
    else:
        print(json.dumps(report,indent=2))

def gallery(args):
    root=rootdir(args.root); h=history(root,args.card,args.role)
    if not h['versions']: raise ValueError('No versions to show')
    tile_w,tile_h=265,320; cols=min(4,len(h['versions'])); rows=(len(h['versions'])+cols-1)//cols
    board=Image.new('RGB',(tile_w*cols,tile_h*rows),(241,239,246))
    draw=ImageDraw.Draw(board)
    for i,v in enumerate(h['versions']):
        xx=(i%cols)*tile_w; yy=(i//cols)*tile_h
        draw.rounded_rectangle((xx+6,yy+6,xx+tile_w-7,yy+tile_h-7),radius=10,fill=(253,252,255))
        p=root/v['path']; im=Image.open(p).convert('RGBA')
        disp=im.copy();disp.thumbnail((tile_w-30,240),Image.Resampling.LANCZOS)
        bg=Image.new('RGBA',disp.size,(131,89,165,255));bg.alpha_composite(disp)
        board.paste(bg.convert('RGB'),(xx+(tile_w-disp.width)//2,yy+18+(235-disp.height)//2))
        flags=''
        if h['pins'].get('preferred')==v['id']:flags+=' PREFERRED'
        if h['pins'].get('approved')==v['id']:flags+=' APPROVED'
        draw.text((xx+15,yy+264),f'{v["id"]}  {v["stage"]}{flags}',fill=(36,29,44))
        draw.text((xx+15,yy+284),f'{v["release_tag"] or ""}   {v["sha256"][:11]}',fill=(103,84,118))
    out=Path(args.output) if args.output else root/'reviews'/f'{args.card:03d}_{args.role}_history.png'
    out.parent.mkdir(parents=True,exist_ok=True);board.save(out)
    print('Wrote history gallery:',out)

def main():
    a=argparse.ArgumentParser(description=__doc__)
    sub=a.add_subparsers(dest='cmd',required=True)
    def addroot(p):p.add_argument('--root',required=True)
    p=sub.add_parser('init');addroot(p)
    for k in ('front','back','gradient'):p.add_argument('--'+k,required=True)
    p.set_defaults(func=init)
    p=sub.add_parser('import');addroot(p)
    p.add_argument('--card',type=int,required=True);p.add_argument('--role',choices=ROLES,required=True)
    p.add_argument('--stage',choices=STAGES,required=True);p.add_argument('--file',required=True)
    p.add_argument('--parent');p.add_argument('--tag');p.add_argument('--note',default='')
    p.add_argument('--method',default='photo_processing');p.add_argument('--species')
    p.set_defaults(func=importcmd)
    p=sub.add_parser('history');addroot(p);p.add_argument('--card',type=int,required=True);p.add_argument('--role',choices=ROLES,required=True);p.set_defaults(func=histcmd)
    p=sub.add_parser('pin');addroot(p);p.add_argument('--card',type=int,required=True);p.add_argument('--role',choices=ROLES,required=True)
    p.add_argument('--version',required=True);p.add_argument('--label',choices=['preferred','approved'],default='preferred');p.set_defaults(func=pincmd)
    p=sub.add_parser('begin-edit');addroot(p);p.add_argument('--card',type=int,required=True)
    p.add_argument('--role',choices=ROLES,required=True);p.add_argument('--version',default='preferred')
    p.add_argument('--note',default='');p.set_defaults(func=begin)
    p=sub.add_parser('commit-edit');p.add_argument('--job',required=True);p.add_argument('--output',required=True)
    p.add_argument('--stage',choices=STAGES,required=True);p.add_argument('--note',default='')
    p.add_argument('--method',default='manual_edit');p.set_defaults(func=commit)
    p=sub.add_parser('resolve');addroot(p);p.add_argument('--card',type=int,required=True)
    p.add_argument('--role',choices=ROLES,required=True);p.add_argument('--version',default='preferred');p.set_defaults(func=resolve)
    p=sub.add_parser('assemble');addroot(p);p.add_argument('--card',type=int,required=True)
    for role in ROLES:p.add_argument('--'+role,default='preferred')
    p.add_argument('--note',default='');p.add_argument('--layout',help='Per-build JSON layout override; copied into immutable build manifest')
    p.add_argument('--pixel-display',type=int,help='Display size ONLY; native icon remains 24x24')
    p.set_defaults(func=render)
    p=sub.add_parser('gallery');addroot(p);p.add_argument('--card',type=int,required=True);p.add_argument('--role',choices=ROLES,required=True);p.add_argument('--output');p.set_defaults(func=gallery)
    p=sub.add_parser('status');addroot(p);p.add_argument('--output');p.set_defaults(func=statuscmd)
    p=sub.add_parser('verify');addroot(p);p.set_defaults(func=verifycmd)
    args=a.parse_args()
    try:args.func(args)
    except (ValueError,FileNotFoundError) as e:
        print('ERROR:',e,file=sys.stderr);sys.exit(2)

if __name__=='__main__': main()

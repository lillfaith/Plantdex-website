// Derived crops of the CC0 dandelion photographs, so a WRONG-answer picture cannot also be a
// valid example of the feature being asked for (a dandelion leaf, a seed puff, a flower).
// A crop keeps the parent's iNaturalist photo id and licence; the box is recorded in
// boss-images.ts. Run: node scripts/build_boss_crops.mjs   (needs the parent WebP files)
import sharp from 'sharp';

// Percent boxes of the parent image: x, y, width, height.
export const CROPS = {
  'd-flower-crop': { of: 'd-flower-open', box: [6, 2, 74, 72] },
  'd-flowers-crop': { of: 'd-flowers-stalks', box: [46, 24, 40, 40] },
  'd-rosette-crop': { of: 'd-rosette-leaf', box: [28, 37, 72, 63] },
  'd-rosette-alt-crop': { of: 'd-rosette-alt', box: [0, 0, 82, 100] },
};

if (process.argv[1].endsWith('build_boss_crops.mjs')) {
  for (const [id, { of, box }] of Object.entries(CROPS)) {
    const src = `public/boss-form/${of}.webp`;
    const { width, height } = await sharp(src).metadata();
    const left = Math.round((box[0] / 100) * width);
    const top = Math.round((box[1] / 100) * height);
    const w = Math.min(Math.round((box[2] / 100) * width), width - left);
    const h = Math.min(Math.round((box[3] / 100) * height), height - top);
    await sharp(src).extract({ left, top, width: w, height: h }).webp({ quality: 82 }).toFile(`public/boss-form/${id}.webp`);
    console.log(id, `${w}x${h}`);
  }
}

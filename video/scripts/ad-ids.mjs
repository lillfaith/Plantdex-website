import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ADS_DIR = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'ads');
export const ADS = readdirSync(ADS_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ file: f, spec: JSON.parse(readFileSync(join(ADS_DIR, f), 'utf8')) }));
export const ADS_IDS = ADS.map((a) => a.spec.id);

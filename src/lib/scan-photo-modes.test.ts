import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { channelForPhotos, collectAllowed } from './scan-flow';
import { MAX_OBSERVATION_PHOTOS, MIN_CAPTURE_PHOTOS, MIN_OBSERVATION_PHOTOS, minPhotosFor } from './scans';

const photos = readFileSync('src/components/scan/ObservationPhotos.tsx', 'utf8');
const panel = readFileSync('src/components/scan/ScanPanel.tsx', 'utf8');

describe('what the scan screen asks for follows the identification mode, and the words, counter and button agree', () => {
  it('the rule: one in-app camera photograph collects; anything imported identifies only and keeps the floor of two', () => {
    expect(MIN_CAPTURE_PHOTOS).toBe(1);
    expect(MIN_OBSERVATION_PHOTOS).toBe(2);
    expect(MAX_OBSERVATION_PHOTOS).toBe(3);
    expect(minPhotosFor('collect')).toBe(1);
    expect(minPhotosFor('lookup')).toBe(2);
    expect(minPhotosFor('unspecified')).toBe(2);
    // With the camera pilot off (the default build) nothing is classified, which is today's behaviour: two photos, never a collect.
    expect(channelForPhotos([{ source: 'camera' }])).toBe('unspecified');
    expect(collectAllowed('lookup')).toBe(false);
    expect(collectAllowed('collect')).toBe(true);
  });

  it('the counter, the slots and the button all read the same minimum', () => {
    expect(photos).toMatch(/minPhotosFor\(channel\)/);
    expect(photos).toMatch(/const ready = count >= minimum/);
    expect(panel).toMatch(/photoMinimum = minPhotosFor\(channelForPhotos\(photos\)\)/);
    expect(panel).toMatch(/canIdentify = photos\.length >= photoMinimum/);
  });

  it('says each mode in its own words: camera = one photo, library = identification only and two photos, no pilot = two or three', () => {
    expect(photos).toMatch(/Take <span[^>]*>one photo<\/span> with the camera/);
    expect(photos).toMatch(/A library photo can/);
    expect(photos).toMatch(/not collect it/);
    expect(photos).toMatch(/2 or 3 photos of the same plant/);
    expect(photos).toMatch(/1 camera photo needed/);
    expect(photos).toMatch(/photos required/);
  });
});

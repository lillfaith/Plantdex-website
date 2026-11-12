import { describe, expect, it, vi } from 'vitest';
import { detectChannel, haptic, nativeCall, vibrationPattern } from './haptics';

describe('detectChannel', () => {
  it('finds nothing in a bare environment — which is iOS Safari', () => {
    expect(detectChannel({})).toBe('none');
  });

  it('uses the Vibration API when the browser has one', () => {
    expect(detectChannel({ vibrate: () => true })).toBe('vibrate');
  });

  // The ordering IS the forward compatibility: inside a native shell the real Taptic
  // Engine answers, and the same call sites degrade on the web.
  it('prefers a native bridge over the Vibration API', () => {
    expect(detectChannel({ vibrate: () => true, nativeHaptics: {} })).toBe('native');
  });

  it('is silent under reduced motion, whatever the device offers', () => {
    expect(detectChannel({ vibrate: () => true, reducedMotion: true })).toBe('none');
    expect(detectChannel({ nativeHaptics: {}, reducedMotion: true })).toBe('none');
  });

  // `'vibrate' in navigator` is false on iOS; a non-function must not be called.
  it('ignores a vibrate property that is not callable', () => {
    expect(detectChannel({ vibrate: true })).toBe('none');
    expect(detectChannel({ vibrate: undefined })).toBe('none');
  });
});

describe('patterns', () => {
  it('keeps every pulse short enough to read as a tick', () => {
    for (const kind of ['tap', 'success'] as const) {
      for (const ms of vibrationPattern(kind)) expect(ms).toBeLessThanOrEqual(50);
    }
  });

  it('makes success two pulses and tap one', () => {
    expect(vibrationPattern('tap')).toHaveLength(1);
    expect(vibrationPattern('success')).toHaveLength(3); // pulse, gap, pulse
  });

  it('maps each kind onto the native plugin vocabulary', () => {
    expect(nativeCall('tap').method).toBe('impact');
    expect(nativeCall('success').method).toBe('notification');
  });
});

describe('haptic', () => {
  it('calls the Vibration API with the pattern', () => {
    const vibrate = vi.fn(() => true);
    expect(haptic('success', { vibrate })).toBe('vibrate');
    expect(vibrate).toHaveBeenCalledWith([12, 44, 12]);
  });

  it('calls the native bridge with its own argument shape', () => {
    const impact = vi.fn();
    expect(haptic('tap', { nativeHaptics: { impact } })).toBe('native');
    expect(impact).toHaveBeenCalledWith({ style: 'LIGHT' });
  });

  it('does nothing, and reports nothing, where there is no haptic engine', () => {
    expect(haptic('tap', {})).toBe('none');
  });

  it('fires nothing under reduced motion', () => {
    const vibrate = vi.fn(() => true);
    expect(haptic('tap', { vibrate, reducedMotion: true })).toBe('none');
    expect(vibrate).not.toHaveBeenCalled();
  });

  // A decorative buzz must never be able to break the dialog reporting a discovery.
  it('swallows a throwing implementation', () => {
    const boom = () => {
      throw new Error('platform policy');
    };
    expect(() => haptic('tap', { vibrate: boom })).not.toThrow();
    expect(haptic('tap', { vibrate: boom })).toBe('none');
  });

  it('survives a native bridge missing the method it needs', () => {
    expect(haptic('success', { nativeHaptics: { impact: () => {} } })).toBe('none');
  });
});

// The point of the whole module, asserted as source text so it cannot regress into a
// bare navigator.vibrate call at the call sites.
describe('no assumption of iOS support', () => {
  it('routes every call site through this module', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const full = `${dir}/${entry}`;
        return statSync(full).isDirectory()
          ? walk(full)
          : /\.tsx?$/.test(entry) && !entry.includes('.test.')
            ? [full]
            : [];
      });
    const offenders = walk('src')
      .filter((file) => !file.endsWith('src/lib/haptics.ts'))
      // Comments stripped: the components that route THROUGH this module legitimately
      // name the API they are avoiding, in order to say why.
      .filter((file) => {
        const source = readFileSync(file, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, '');
        return /navigator\s*\.\s*vibrate/.test(source);
      });
    expect(offenders).toEqual([]);
  });
});

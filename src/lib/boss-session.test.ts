import { beforeEach, describe, expect, it } from 'vitest';
import { clearPassedThisSession, notePassed, passedThisSession } from './boss-session';

beforeEach(() => clearPassedThisSession());

describe('what this visit has seen passed', () => {
  it('starts empty and remembers a passed round', () => {
    expect(passedThisSession('on', 'taraxacum-officinale').size).toBe(0);
    notePassed('on', 'taraxacum-officinale', 'part-spotter');
    expect([...passedThisSession('on', 'taraxacum-officinale')]).toEqual(['part-spotter']);
  });

  it('keeps preview and server verdicts apart, so a simulated pass can never read as a real one', () => {
    notePassed('preview', 'taraxacum-officinale', 'compare');
    expect(passedThisSession('on', 'taraxacum-officinale').size).toBe(0);
    expect(passedThisSession('preview', 'taraxacum-officinale').has('compare')).toBe(true);
  });

  it('keeps plants apart', () => {
    notePassed('on', 'a', 'part-spotter');
    expect(passedThisSession('on', 'b').size).toBe(0);
  });

  it('hands out a copy, so a caller cannot change the memory by editing what it was given', () => {
    notePassed('on', 'a', 'part-spotter');
    (passedThisSession('on', 'a') as Set<string>).add('boss-trial');
    expect(passedThisSession('on', 'a').has('boss-trial')).toBe(false);
  });
});

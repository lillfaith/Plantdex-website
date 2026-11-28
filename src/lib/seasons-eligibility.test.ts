import { describe, expect, it } from 'vitest';
import { PRINTED_CARDS } from './deck';
import { cameraCollectingAvailable } from '@/components/quests/SeasonsGuide';
import { matchScientificName } from './plant-match';

describe('Seasons only calls a card "To find" when a camera photograph of its own plant can actually unlock it', () => {
  it('every printed card is collectable by camera today (so no row renders as "Not yet")', () => {
    const blocked = PRINTED_CARDS.filter((herb) => !cameraCollectingAvailable(herb)).map((herb) => herb.id);
    expect(blocked).toEqual([]);
  });

  it('Goldenrod is collectable by camera through its own name and its curated equivalent, and says so truthfully for the rest', () => {
    // The old genus-wide override is gone; the card accepts S. canadensis and the curated S. gigantea. Other goldenrods
    // (S. altissima is the one providers return most often) are "related", never an unlock, and the scanner says that at scan time.
    expect(matchScientificName('Solidago canadensis').eligibility).toBe('exact');
    expect(matchScientificName('Solidago gigantea').eligibility).toBe('curatedEquivalent');
    expect(matchScientificName('Solidago altissima').confirmable).toBe(false);
  });

  it('a card whose own name could not resolve would be reported unavailable (the mechanism is live, not decorative)', () => {
    expect(cameraCollectingAvailable({ id: 'solidago-canadensis', scientificName: 'Solidago altissima' })).toBe(false);
    expect(cameraCollectingAvailable({ id: 'not-a-card', scientificName: 'Solidago canadensis' })).toBe(false);
  });
});

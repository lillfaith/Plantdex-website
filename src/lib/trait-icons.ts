import type { IconName } from '@/components/icons/PlantdexIcon';

/**
 * Which icon, if any, is drawn beside an identification trait row.
 *
 * This lives in `src/lib` rather than inside the section component for one reason: the bugs
 * it has had were bugs of ORDER, and order is only testable if a test can import the real
 * rule list. A test that restates the patterns beside the component proves nothing, because
 * it cannot go wrong in the same way the component did.
 *
 * ORDER IS THE WHOLE SPECIFICATION. Three defects came out of getting it wrong:
 *
 *  1. A trait that DENIES a part must not be drawn with that part. "Sheaths, not leaves"
 *     (horsetail) and "Nearly leafless look" (chicory) both matched the leaf pattern and
 *     were illustrated with a leaf, contradicting the sentence beside them. They now fall
 *     through to no icon at all, which is what 58 other traits already do.
 *  2. Fruit before flower, because `head` appears in the flower pattern and "Seed head" /
 *     "Rusty seed heads" are fruiting structures. No trait that should read as a flower
 *     carries a fruit token, so the genuine flower heads are unaffected.
 *  3. Root before stem, because `node` is in the stem pattern, which drew "Roots at the
 *     nodes" as a stem while "Creeping and rooting" was drawn as a root.
 *
 * Every icon here is decorative: the trait label beside it says the same thing in words.
 * That is why falling through to none is always a safe answer and a wrong icon never is.
 */
export const TRAIT_ICON_RULES: { match: RegExp; icon?: IconName }[] = [
  { match: /leafless|not leaves/i },
  { match: /fruit|berr|acorn|hip|samara|seed|pod|capsule|bur|cone/i, icon: 'fruit' },
  { match: /root|bulb|rhizome/i, icon: 'root' },
  { match: /leaf|leaves|leaflet|rosette|foliage|frond/i, icon: 'leaves' },
  { match: /flower|bloom|petal|head|umbel|catkin|corona/i, icon: 'flower' },
  { match: /stem|stalk|cane|twig|node|runner|vine|shoot/i, icon: 'stem' },
  { match: /bark|woody|tree|shrub/i, icon: 'bark' },
];

export function iconForTrait(trait: string): IconName | undefined {
  // A rule may match and still supply no icon — that is how the denial guard works.
  return TRAIT_ICON_RULES.find((entry) => entry.match.test(trait))?.icon;
}

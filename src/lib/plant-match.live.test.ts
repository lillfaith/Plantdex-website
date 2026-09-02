import { describe, expect, it } from 'vitest';
import { HERBS } from './deck';
import { matchScientificName, outcomeFor } from './plant-match';

/**
 * THE FULL 45-CARD LIVE SURVEY.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REAL PROVIDER OUTPUT, VERBATIM. Every one of the deck's 45 cards was photographed and sent
 * to the live identification service; these are the ranked names and scores that came back.
 *
 * This file exists because the matcher's hand-written tests were all green while the feature
 * failed on the commonest plant in the deck. Names I invent prove nothing about names a
 * provider emits, so the evidence is data rather than reasoning, and it is checked rather
 * than described.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IT PINS. Two things, and the second matters more than the first:
 *
 *   1. Every card resolves to ITSELF. Not "something plausible" — the exact card whose
 *      photograph was sent is offered, and is confirmable.
 *   2. Related species in the same genus stay UNCONFIRMABLE. Six of these responses put a
 *      different species top — Mentha arvensis over M. canadensis, Fragaria vesca over
 *      F. virginiana — and in every one of them the wrong species must remain something a
 *      player cannot log as the card. That restraint is what makes the first guarantee
 *      worth anything.
 */

const LIVE_SURVEY: Record<string, [string, number][]> = {
'taraxacum-officinale':[['Taraxacum campylodes',.454],['Taraxacum sect. Taraxacum',.221],['Taraxacum pubescens',.023],['Taraxacum erythrospermum',.020],['Taraxacum mattmarkense',.017]],
'urtica-dioica':[['Urtica dioica',.925],['Urtica membranacea',.004],['Urtica morifolia',.003],['Urtica urens',.002],['Urtica gracilis',.001]],
'achillea-millefolium':[['Achillea millefolium',.432],['Achillea nobilis',.192],['Achillea odorata',.113],['Achillea macrophylla',.055],['Achillea ligustica',.039]],
'plantago-major':[['Plantago major',.795],['Plantago rugelii',.056],['Plantago australis',.027],['Plantago asiatica',.007],['Plantago virginica',.005]],
'trifolium-pratense':[['Trifolium pratense',.775],['Trifolium medium',.127],['Trifolium alpestre',.015],['Trifolium fragiferum',.009],['Trifolium rubens',.008]],
'acer-spp':[['Acer circinatum',.212],['Acer rubrum',.160],['Acer ukurunduense',.096],['Acer barbinerve',.075],['Torminalis glaberrima',.033]],
'rubus-spp':[['Rubus occidentalis',.381],['Rubus fruticosus',.148],['Rubus ulmifolius',.055],['Rubus argutus',.019],['Rubus armeniacus',.018]],
'rhus-spp':[['Rhus typhina',.518],['Rhus glabra',.426],['Rhus coriaria',.014],['Sorbus americana',.002],['Sorbus aucuparia',.001]],
'sambucus-spp':[['Sambucus canadensis',.449],['Sambucus nigra',.251],['Sambucus ebulus',.187],['Sorbus americana',.008],['Sambucus racemosa',.002]],
'rosa-spp':[['Rosa rubiginosa',.311],['Rosa virginiana',.157],['Rosa woodsii',.074],['Rosa canina',.048],['Rosa carolina',.039]],
'salix-spp':[['Salix triandra',.127],['Salix viminalis',.047],['Salix eriocephala',.044],['Helianthus strumosus',.015],['Eucalyptus globulus',.015]],
'pinus-spp':[['Pinus mugo',.216],['Pinus cembra',.202],['Cedrus deodara',.071],['Pinus strobus',.068],['Pinus nigra',.058]],
'morus-spp':[['Morus nigra',.486],['Morus alba',.365],['Morus indica',.032],['Acer tataricum',.008],['Morus rubra',.008]],
'quercus-spp':[['Quercus robur',.646],['Quercus alba',.095],['Quercus petraea',.092],['Quercus pubescens',.019],['Quercus frainetto',.015]],
'rumex-obtusifolius':[['Rumex obtusifolius',.452],['Rumex × acutus',.330],['Rumex sanguineus',.045],['Rumex patientia',.020],['Rumex crispus',.013]],
'solidago-canadensis':[['Solidago canadensis',.640],['Solidago gigantea',.157],['Solidago chilensis',.052],['Solidago rugosa',.051],['Solidago altissima',.034]],
'ambrosia-artemisiifolia':[['Ambrosia artemisiifolia',.860],['Ambrosia maritima',.037],['Ambrosia arborescens',.008],['Ambrosia psilostachya',.007],['Ambrosia acanthicarpa',.003]],
'chenopodium-album':[['Chenopodium album',.528],['Chenopodium ficifolium',.192],['Chenopodium quinoa',.123],['Chenopodium berlandieri',.041],['Atriplex patula',.024]],
'portulaca-oleracea':[['Portulaca oleracea',.751],['Portulaca umbraticola',.044],['Portulaca trituberculata',.029],['Portulaca granulatostellulata',.008],['Portulaca quadrifida',.006]],
'alliaria-petiolata':[['Alliaria petiolata',.980],['Lunaria rediviva',.003],['Diplotaxis erucoides',.002]],
'oxalis-stricta':[['Oxalis dillenii',.359],['Oxalis stricta',.313],['Oxalis corniculata',.147],['Oxalis exilis',.014],['Oxalis pes-caprae',.004]],
'lamium-purpureum':[['Lamium purpureum',.818],['Lamium hybridum',.140],['Lamium maculatum',.007],['Lamium amplexicaule',.004]],
'viola-sororia':[['Viola riviniana',.243],['Viola sororia',.149],['Viola canina',.099],['Viola adunca',.041],['Viola mirabilis',.036]],
'stellaria-media':[['Stellaria media',.738],['Stellaria alsine',.041],['Stellaria neglecta',.004],['Cerastium diffusum',.004],['Stellaria graminea',.003]],
'galium-aparine':[['Galium aparine',.428],['Galium verrucosum',.401],['Galium sylvaticum',.049],['Galium odoratum',.037],['Galium tricornutum',.008]],
'glechoma-hederacea':[['Glechoma hederacea',.708],['Glechoma hirsuta',.198],['Glechoma longituba',.005],['Nepeta × faassenii',.004],['Glechoma grandis',.003]],
'rumex-acetosella':[['Rumex acetosella',.578],['Rumex acetosa',.106],['Rumex thyrsoides',.026],['Atriplex prostrata',.017],['Paspalum paniculatum',.010]],
'cichorium-intybus':[['Cichorium intybus',.750],['Cichorium endivia',.215],['Cichorium pumilum',.007],['Cichorium spinosum',.006],['Stephanomeria diegensis',.001]],
'arctium-lappa':[['Arctium tomentosum',.537],['Arctium minus',.175],['Arctium lappa',.064],['Arctium × nothum',.018],['Arctium nemorosum',.011]],
'mentha-canadensis':[['Mentha arvensis',.714],['Mentha canadensis',.212],['Mentha × verticillata',.010],['Mentha × gracilis',.006],['Lycopus uniflorus',.005]],
'nepeta-cataria':[['Nepeta cataria',.855],['Salvia verticillata',.004],['Marrubium vulgare',.003],['Melissa officinalis',.002],['Nepeta azurea',.002]],
'capsella-bursa-pastoris':[['Capsella bursa-pastoris',.597],['Capsella rubella',.024],['Lepidium hirtum',.009],['Noccaea caerulescens',.009],['Camelina microcarpa',.008]],
'prunella-vulgaris':[['Prunella vulgaris',.757],['Prunella grandiflora',.018],['Prunella hyssopifolia',.009],['Salvia officinalis',.004],['Salvia dorrii',.003]],
'verbascum-thapsus':[['Verbascum densiflorum',.379],['Verbascum thapsus',.379],['Verbascum pulverulentum',.030],['Verbascum phlomoides',.030],['Verbascum giganteum',.019]],
'equisetum-arvense':[['Equisetum pratense',.555],['Equisetum arvense',.292],['Equisetum fluviatile',.050],['Equisetum sylvaticum',.020],['Equisetum palustre',.011]],
'allium-vineale':[['Allium vineale',.223],['Allium sativum',.060],['Allium schoenoprasum',.054],['Allium rotundum',.023],['Allium scorodoprasum',.022]],
'fragaria-virginiana':[['Fragaria vesca',.704],['Fragaria viridis',.073],['Fragaria × ananassa',.065],['Fragaria virginiana',.029],['Fragaria chiloensis',.003]],
'hypericum-perforatum':[['Hypericum perforatum',.260],['Hypericum perfoliatum',.209],['Hypericum maculatum',.078],['Hypericum hirsutum',.042],['Hypericum hyssopifolium',.027]],
'impatiens-capensis':[['Impatiens capensis',.942],['Impatiens pallida',.002],['Impatiens aurella',.002]],
'melissa-officinalis':[['Melissa officinalis',.969],['Ballota nigra',.007],['Teucrium hircanicum',.004],['Marrubium vulgare',.002],['Mentha × rotundifolia',.001]],
'monarda-fistulosa':[['Monarda fistulosa',.929],['Monarda media',.012],['Monarda clinopodia',.008],['Monarda didyma',.006],['Monarda bradburyana',.002]],
'geranium-maculatum':[['Geranium maculatum',.928],['Geranium sylvaticum',.016],['Geranium pratense',.005],['Geranium rivulare',.002],['Geranium sibiricum',.002]],
'lonicera-japonica':[['Lonicera japonica',.671],['Lonicera caprifolium',.076],['Lonicera tatarica',.044],['Lonicera maackii',.037],['Lonicera acuminata',.026]],
'passiflora-incarnata':[['Passiflora incarnata',.851],['Passiflora edulis',.024],['Passiflora cincinnata',.010],['Passiflora foetida',.008],['Passiflora amethystina',.003]],
'lactuca-serriola':[['Lactuca serriola',.925],['Lactuca virosa',.040],['Lactuca sativa',.005],['Lactuca saligna',.004],['Lactuca indica',.002]],
};

describe('every card, against the live provider', () => {
  it('covers all 45 cards', () => {
    // If a card is ever added to the deck this fails until it has been surveyed too — the
    // point of the file is completeness, and a partial survey silently stops being one.
    expect(Object.keys(LIVE_SURVEY).length).toBe(HERBS.length);
    for (const herb of HERBS) {
      expect(LIVE_SURVEY[herb.id], `${herb.id} has never been surveyed live`).toBeDefined();
    }
  });

  it('offers the right card for every single one, and lets it be confirmed', () => {
    /*
     * THE HEADLINE GUARANTEE. Photograph any card in the deck and its own card comes back as
     * something you can log. Zero cards report "not one of the 45".
     */
    for (const [herbId, results] of Object.entries(LIVE_SURVEY)) {
      const candidates = results.map(([scientificName, score]) => ({
        scientificName,
        score,
        match: matchScientificName(scientificName),
      }));
      const own = candidates.find((c) => c.match.herbId === herbId && c.match.confirmable);
      expect(own, `${herbId}: its own card was not offered as confirmable`).toBeDefined();
      expect(outcomeFor(candidates), `${herbId} reported no match at all`).not.toBe('noMatch');
    }
  });

  it('keeps a different species unconfirmable even when the provider ranks it first', () => {
    /*
     * The other half. In each of these the provider's TOP answer is a genuinely different
     * species from the card, and every one must stay unloggable as that card — checked
     * against POWO, which treats each as distinct rather than as a synonym. Mentha
     * canadensis in particular is a separate species from M. arvensis (different chromosome
     * counts, amphidiploid origin), so it gets no synonym entry however tempting the 0.714
     * looks next to the card's own 0.212.
     */
    const distinctSpeciesRankedFirst = [
      'Mentha arvensis',
      'Fragaria vesca',
      'Arctium tomentosum',
      'Equisetum pratense',
      'Viola riviniana',
      'Oxalis dillenii',
    ];
    for (const name of distinctSpeciesRankedFirst) {
      const match = matchScientificName(name);
      expect(match.kind, name).toBe('sameGenus');
      expect(match.confirmable, `${name} must not be loggable as the deck's card`).toBe(false);
    }
  });

  it('resolves every genus-level card through its genus', () => {
    // Nine cards are genus-level ("Quercus spp."). A provider returns a SPECIES, so these are
    // the likeliest place for a mismatch — and all nine resolve, including Oak.
    const genusCards = HERBS.filter((h) => /\bspp\.?$/i.test(h.scientificName)).map((h) => h.id);
    expect(genusCards.length).toBe(9);
    for (const herbId of genusCards) {
      const top = LIVE_SURVEY[herbId]![0]!;
      const match = matchScientificName(top[0]);
      expect(match.herbId, `${herbId}: "${top[0]}" did not resolve to the genus card`).toBe(herbId);
      expect(match.kind).toBe('genusCard');
      expect(match.confirmable).toBe(true);
    }
  });

  it('records how many reach "matched" rather than "uncertain"', () => {
    /*
     * A snapshot, not a target. 33 of 45 clear the 0.35 bar; the other 12 still offer the
     * right card and still let it be confirmed — they just say "not sure" first, which is
     * the honest thing to say when the provider spread its confidence across four congeners.
     * Pinned so a scoring change has to be deliberate.
     */
    const counts = { matched: 0, uncertain: 0, relatedOnly: 0, noMatch: 0 };
    for (const results of Object.values(LIVE_SURVEY)) {
      const candidates = results.map(([scientificName, score]) => ({
        scientificName,
        score,
        match: matchScientificName(scientificName),
      }));
      counts[outcomeFor(candidates)] += 1;
    }
    /*
     * relatedOnly is 0 here and that is a claim, not a blank: every one of the 45 card-art
     * photographs put the card's OWN species somewhere in the provider's five, so none of
     * them fell through to "a relative, but not this one". Field photographs do — a violet
     * came back as five Viola species with no V. sororia among them, which is the report
     * that made the outcome exist. Studio art is the easy case; this number moving is how
     * that difference would show up here.
     */
    expect(counts).toEqual({ matched: 33, uncertain: 12, relatedOnly: 0, noMatch: 0 });
  });
});

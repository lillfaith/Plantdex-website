import type { AdSpec } from './lib/spec';
import wildPlantAppeared from '../ads/wild-plant-appeared.json';
import wildPlantAppearedV2 from '../ads/wild-plant-appeared-v2.json';
import wildPlantAppearedV3 from '../ads/wild-plant-appeared-v3.json';
import ownedNotDiscovered from '../ads/owned-not-discovered.json';

/** Every ad spec in `ads/`. Add a JSON file there and list it here to get a composition. */
export const ADS: AdSpec[] = [wildPlantAppeared as AdSpec, wildPlantAppearedV2 as AdSpec, wildPlantAppearedV3 as AdSpec, ownedNotDiscovered as AdSpec];

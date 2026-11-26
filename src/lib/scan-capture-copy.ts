/**
 * Words for each capture state. Functional wording, labelled for owner review (D7).
 *
 * RULES THE TEST PINS: no state's copy says or implies that a capture shows where a plant was or
 * that anybody found it; `denied` says the choice is changed in browser settings (this code never
 * asks twice); every non-working state points at the fail-safe (library photo = identification
 * only), never at a route to a card.
 */
import type { CaptureState } from './scan-capture';

export interface CaptureStateCopy {
  message: string;
  /** Whether the "open the camera" button makes sense in this state. */
  canOpen: boolean;
}

export function captureStateCopy(state: CaptureState): CaptureStateCopy {
  switch (state) {
    case 'not-asked':
      return {
        message:
          'Plantdex will ask your browser for camera access. The camera stays on this page only, nothing is saved by opening it, and no location is read.',
        canOpen: true,
      };
    case 'prompting':
      return { message: 'Waiting for your browser’s camera permission prompt…', canOpen: false };
    case 'granted':
      return { message: 'Camera ready. Frame one plant and take the photo.', canOpen: false };
    case 'capturing':
      return { message: 'Taking the photo…', canOpen: false };
    case 'captured':
      return {
        message: 'Photo added. Open the camera again for another angle, or identify now.',
        canOpen: true,
      };
    case 'denied':
      return {
        message:
          'Camera access is blocked. To use it, change the camera permission for this site in your browser settings; Plantdex will not ask again. You can still identify from a library photo.',
        canOpen: false,
      };
    case 'no-device':
      return { message: 'No camera was found on this device. You can still identify from a library photo.', canOpen: true };
    case 'in-use':
      return {
        message: 'The camera is being used by another app. Close it and try again, or identify from a library photo.',
        canOpen: true,
      };
    case 'insecure-context':
      return {
        message: 'The camera only works on a secure (https) page. You can still identify from a library photo.',
        canOpen: false,
      };
    case 'unsupported':
      return { message: 'This browser cannot open a camera from a page. You can still identify from a library photo.', canOpen: false };
    case 'error':
      return { message: 'The camera could not be started. You can try again or identify from a library photo.', canOpen: true };
  }
}

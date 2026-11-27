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

/**
 * Why a camera photo cannot collect right now, said truthfully. This used to be one sentence
 * ("The camera session could not be started") for every cause, including a dropped connection
 * and an expired session, so "try the camera again" was advice that could not work.
 * Every variant ends at what the player can actually do, and none implies a route to a card
 * that bypasses the camera: a second photo only LOOKS the plant up.
 */
export type CaptureUnavailable =
  | 'signed_out'
  | 'too_many_open_sessions'
  | 'daily_session_limit'
  | 'network'
  | 'not-deployed'
  | 'not_signed_in'
  | 'expired';

export function captureUnavailableMessage(why: CaptureUnavailable): string {
  switch (why) {
    case 'signed_out':
    case 'not_signed_in':
      return 'Sign in to collect a plant from a camera photo. Signed out, a photo can only look a plant up: add another photo of the same plant, or sign in and try again.';
    case 'too_many_open_sessions':
      return 'Earlier camera tries are still open and clear within about ten minutes. You can add another photo of the same plant to look it up now, or open the camera again in a few minutes to collect.';
    case 'daily_session_limit':
      return 'You have reached today’s limit of camera collections. Add another photo of the same plant to look it up, or try the camera again tomorrow.';
    case 'network':
      return 'Plantdex could not reach the server to prepare the camera. Check your connection, then open the camera and take the photo again to collect, or add another photo of the same plant to look it up.';
    case 'not-deployed':
      return 'Collecting from the camera is not available here yet. Add another photo of the same plant to look it up.';
    case 'expired':
    default:
      return 'This camera capture has timed out. Open the camera and take the photo again to collect, or add another photo of the same plant to look it up.';
  }
}

import { UnitCropConfig } from './unitCropRegistry';

/**
 * Translates coordinates from the original image (natural) to the displayed preview.
 */
export function toDisplayCoords(
  naturalX: number,
  naturalY: number,
  naturalWidth: number,
  naturalHeight: number,
  displayWidth: number,
  displayHeight: number
) {
  return {
    x: (naturalX / naturalWidth) * displayWidth,
    y: (naturalY / naturalHeight) * displayHeight
  };
}

/**
 * Translates coordinates from the displayed preview back to the original image (natural).
 */
export function toNaturalCoords(
  displayX: number,
  displayY: number,
  displayWidth: number,
  displayHeight: number,
  naturalWidth: number,
  naturalHeight: number
) {
  return {
    x: (displayX / displayWidth) * naturalWidth,
    y: (displayY / displayHeight) * naturalHeight
  };
}

/**
 * Translates coordinates from the original image (natural) to local crop coordinates.
 */
export function toLocalCropCoords(
  naturalX: number,
  naturalY: number,
  crop: UnitCropConfig
) {
  return {
    x: naturalX - crop.x,
    y: naturalY - crop.y
  };
}

/**
 * Translates coordinates from local crop space to display space.
 */
export function cropToDisplayCoords(
  localX: number,
  localY: number,
  cropWidth: number,
  cropHeight: number,
  displayWidth: number,
  displayHeight: number
) {
  return {
    x: (localX / cropWidth) * displayWidth,
    y: (localY / cropHeight) * displayHeight
  };
}

import { UnitCropConfig } from './unitCropRegistry';

/**
 * Crops a specific unit from a full floorplan image using an offscreen canvas.
 * Handles resolution-safe scaling by comparing config source dimensions with actual natural dimensions.
 */
export async function cropUnitImage(
  imageSource: string | HTMLImageElement | HTMLCanvasElement,
  crop: UnitCropConfig
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImage = (img: HTMLImageElement | HTMLCanvasElement) => {
      const naturalWidth = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
      const naturalHeight = img instanceof HTMLImageElement ? img.naturalHeight : img.height;

      // Calculate scale factors between config source and actual image pixels
      const scaleX = naturalWidth / crop.sourceImageWidth;
      const scaleY = naturalHeight / crop.sourceImageHeight;

      // Scale crop coordinates to actual image pixels
      const scaledX = crop.x * scaleX;
      const scaledY = crop.y * scaleY;
      const scaledWidth = crop.width * scaleX;
      const scaledHeight = crop.height * scaleY;

      const canvas = document.createElement("canvas");
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply polygon mask if provided
      if (crop.polygonMask && crop.polygonMask.length > 0) {
        ctx.beginPath();
        crop.polygonMask.forEach((point, index) => {
          // Translate natural point to local crop space
          const localX = (point.x * scaleX) - scaledX;
          const localY = (point.y * scaleY) - scaledY;
          
          if (index === 0) ctx.moveTo(localX, localY);
          else ctx.lineTo(localX, localY);
        });
        ctx.closePath();
        ctx.clip();
      }

      // Draw the cropped portion from the natural image
      ctx.drawImage(
        img,
        scaledX,
        scaledY,
        scaledWidth,
        scaledHeight,
        0,
        0,
        scaledWidth,
        scaledHeight
      );

      resolve(canvas.toDataURL());
    };

    if (typeof imageSource === 'string') {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => processImage(img);
      img.onerror = () => reject(new Error("Failed to load image for cropping"));
      img.src = imageSource;
    } else {
      processImage(imageSource);
    }
  });
}

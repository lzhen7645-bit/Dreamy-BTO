export type UnitCropConfig = {
  unitId: string;
  blockId?: string;
  sourceImageWidth: number;
  sourceImageHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  focusPoint?: { x: number; y: number };
  polygonMask?: { x: number; y: number }[];
};

export const unitCropRegistry: Record<string, UnitCropConfig> = {
  "112": { 
    unitId: "112", 
    sourceImageWidth: 1000,
    sourceImageHeight: 1000,
    x: 240, 
    y: 110, 
    width: 310, 
    height: 220,
    focusPoint: { x: 395, y: 220 }
  },
  "114": { 
    unitId: "114", 
    sourceImageWidth: 1000,
    sourceImageHeight: 1000,
    x: 560, 
    y: 90, 
    width: 300, 
    height: 240,
    focusPoint: { x: 710, y: 210 }
  },
  "121": { 
    unitId: "121", 
    sourceImageWidth: 1000,
    sourceImageHeight: 1000,
    x: 100, 
    y: 300, 
    width: 350, 
    height: 250,
    focusPoint: { x: 275, y: 425 }
  }
};

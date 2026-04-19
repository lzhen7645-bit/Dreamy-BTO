export enum FlatType {
  FLEXI_2_ROOM = "2-Room Flexi",
  ROOM_4 = "4-Room",
}

export type FloorLevel = "Low (1-9)" | "Mid (10-19)" | "High (20-30)" | "Very High (30+)" | "No Preference";

export interface UserPreferences {
  flatType: FlatType;
  floorPreference: FloorLevel;
  noiseSensitivity: {
    playground: boolean;
    road: boolean;
    mscp: boolean; // Multi-storey car park
  };
  sunshinePreference: {
    avoidAfternoonSun: boolean;
    morningSun: boolean;
  };
  proximity: {
    mrt: boolean;
    schools: boolean;
    amenities: boolean;
  };
  viewPreference: "unblocked" | "garden" | "no-preference";
  liftWaitingTime: "important" | "none";
  otherNotes: string;
  priorities: {
    noise: number; // 1-5
    sunshine: number; // 1-5
    proximity: number; // 1-5
    view: number; // 1-5
    lift: number; // 1-5
  };
}

export interface BTOUnit {
  block: string;
  unitNumber: string;
  floor: number;
  type: FlatType;
  facing: string; // e.g., "North", "South-West"
  pros: string[];
  cons: string[];
  score: number;
  reasoning: string;
  detailedAnalysis: {
    noise: string;
    sunshine: string;
    proximity: string;
    view: string;
    lift: string;
  };
  grades: {
    noise: number; // 0-100
    sunshine: number; // 0-100
    proximity: number; // 0-100
    view: number; // 0-100
    lift: number; // 0-100
  };
  floorPlanPage: number; // The page number in the PDF where this unit's layout is shown
  buildingOrientationDegrees: number; // Degrees clockwise from North that the floor plan's "up" direction points (from page 9 site plan)
  windowFacingDegrees?: number; // Absolute compass degrees W1 window wall faces (0=N, 90=E, 180=S, 270=W). From page 9.
}

export interface AnalysisResult {
  topSuggestions: BTOUnit[];
  projectOverview: string;
}

import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, UserPreferences, BTOUnit } from "../types";

const BTO_UNIT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    block: { type: Type.STRING },
    unitNumber: { type: Type.STRING },
    floor: { type: Type.NUMBER },
    type: { type: Type.STRING },
    facing: { type: Type.STRING },
    pros: { type: Type.ARRAY, items: { type: Type.STRING } },
    cons: { type: Type.ARRAY, items: { type: Type.STRING } },
    score: { type: Type.NUMBER },
    reasoning: { type: Type.STRING },
    detailedAnalysis: {
      type: Type.OBJECT,
      properties: {
        noise: { type: Type.STRING },
        sunshine: { type: Type.STRING },
        proximity: { type: Type.STRING },
        view: { type: Type.STRING },
        lift: { type: Type.STRING }
      },
      required: ["noise", "sunshine", "proximity", "view", "lift"]
    },
    grades: {
      type: Type.OBJECT,
      properties: {
        noise: { type: Type.NUMBER },
        sunshine: { type: Type.NUMBER },
        proximity: { type: Type.NUMBER },
        view: { type: Type.NUMBER },
        lift: { type: Type.NUMBER }
      },
      required: ["noise", "sunshine", "proximity", "view", "lift"]
    },
    floorPlanPage: { type: Type.NUMBER }
  },
  required: ["block", "unitNumber", "floor", "type", "facing", "pros", "cons", "score", "reasoning", "detailedAnalysis", "grades", "floorPlanPage"]
};

const ANALYSIS_RESULT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    topSuggestions: {
      type: Type.ARRAY,
      items: BTO_UNIT_SCHEMA
    },
    projectOverview: { type: Type.STRING }
  },
  required: ["topSuggestions", "projectOverview"]
};

function cleanJson(text: string): string {
  // Remove markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return cleaned;
}

export async function analyzeBTOPDF(
  pdfBase64: string,
  preferences: UserPreferences
): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = "gemini-1.5-flash";
  
  const prompt = `
    You are an expert Singapore HDB BTO consultant. 
    I have provided a BTO project brochure PDF. 
    Analyze the provided BTO project brochure PDF. 
    Pay close attention to:
    - The Site Plan (usually page 9) to identify block locations relative to roads, playgrounds, and amenities.
    - The Unit Distribution tables (usually pages 10-11) to find available floors and unit types.
    - The Floor Plans (usually pages 12-23) to determine unit facings (North, South, East, West) and internal layouts.

    Suggest the best 6 units for a user with these preferences and priorities (1-5, where 5 is highest):
    - Flat Type: ${preferences.flatType}
    - Floor Preference: ${preferences.floorPreference}
    - Noise Sensitivity: Playground (${preferences.noiseSensitivity.playground}), Road (${preferences.noiseSensitivity.road}), Car Park/MSCP (${preferences.noiseSensitivity.mscp}). Priority: ${preferences.priorities.noise}
    - Sunshine Preference: Avoid Afternoon Sun (${preferences.sunshinePreference.avoidAfternoonSun}), Prefer Morning Sun (${preferences.sunshinePreference.morningSun}). Priority: ${preferences.priorities.sunshine}
    - Proximity: Near MRT (${preferences.proximity.mrt}), Near Schools (${preferences.proximity.schools}), Near Amenities (${preferences.proximity.amenities}). Priority: ${preferences.priorities.proximity}
    - View Preference: ${preferences.viewPreference}. Priority: ${preferences.priorities.view}
    - Lift Waiting Time: ${preferences.liftWaitingTime === 'important' ? 'Important' : 'Not a priority'}. Priority: ${preferences.priorities.lift}
    - Additional Notes: ${preferences.otherNotes}

    IMPORTANT: 
    1. Focus on specific "Unit Numbers" (e.g., 111, 105) as the primary identifier.
    2. For "facing", use standard directions like "North", "South", "East", "West", "North-East", etc.
    3. Ensure the "floor" matches the user's floor preference range.
    4. Provide a detailed analysis for each unit across noise, sunshine, proximity, view, and lift perspectives.
    5. For "sunshine" analysis, specifically review the layout in the PDF:
       - Identify window locations and bedroom locations.
       - Analyze how the sun will enter specific rooms (e.g., "Master Bedroom windows face West, expect strong afternoon sun").
       - Mention the "worst month" for sunshine intensity.
       - Estimate the impact on room temperature and aircon usage.
    6. Assign a grade (0-100) for each perspective based on how well it meets the user's preference and priority.
    7. Identify the exact page number in the PDF where the floor plan for this unit type is shown (usually between pages 12-23).
    
    Return the result in JSON format matching this structure:
    {
      "topSuggestions": [
        {
          "block": "string",
          "unitNumber": "string",
          "floor": number,
          "type": "string",
          "facing": "string",
          "pros": ["string"],
          "cons": ["string"],
          "score": number,
          "reasoning": "string",
          "detailedAnalysis": {
            "noise": "string",
            "sunshine": "string",
            "proximity": "string",
            "view": "string",
            "lift": "string"
          },
          "grades": {
            "noise": number,
            "sunshine": number,
            "proximity": number,
            "view": number,
            "lift": number
          },
          "floorPlanPage": number
        }
      ],
      "projectOverview": "string"
    }
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: ANALYSIS_RESULT_SCHEMA,
    },
  });

  const text = cleanJson(response.text || "{}");
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", text);
    throw e;
  }
}

export async function analyzeSpecificUnit(
  pdfBase64: string,
  preferences: UserPreferences,
  block: string,
  unitNumber: string,
  floor: number
): Promise<BTOUnit> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = "gemini-3.1-pro-preview";

  const prompt = `
    Analyze this specific BTO unit: Block ${block}, Unit ${unitNumber}, Floor ${floor}.
    Based on the provided PDF brochure and these user preferences/priorities:
    - Noise Priority: ${preferences.priorities.noise}
    - Sunshine Priority: ${preferences.priorities.sunshine}
    - Proximity Priority: ${preferences.priorities.proximity}
    - View Priority: ${preferences.priorities.view}
    - Lift Priority: ${preferences.priorities.lift}

    Provide a detailed analysis and grades (0-100) for each perspective.
    For "sunshine" analysis, specifically review the layout in the PDF:
    - Identify window locations and bedroom locations.
    - Analyze how the sun will enter specific rooms.
    - Mention the "worst month" for sunshine intensity.
    - Estimate the impact on room temperature and aircon usage.
    Identify the floor plan page number.

    Return ONLY the BTOUnit object in JSON format:
    {
      "block": "${block}",
      "unitNumber": "${unitNumber}",
      "floor": ${floor},
      "type": "string",
      "facing": "string",
      "pros": ["string"],
      "cons": ["string"],
      "score": number,
      "reasoning": "string",
      "detailedAnalysis": {
        "noise": "string",
        "sunshine": "string",
        "proximity": "string",
        "view": "string",
        "lift": "string"
      },
      "grades": {
        "noise": number,
        "sunshine": number,
        "proximity": number,
        "view": number,
        "lift": number
      },
      "floorPlanPage": number
    }
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: BTO_UNIT_SCHEMA,
    },
  });

  const text = cleanJson(response.text || "{}");
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", text);
    throw e;
  }
}

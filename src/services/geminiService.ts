import Anthropic from "@anthropic-ai/sdk";
import { AnalysisResult, UserPreferences, BTOUnit } from "../types";

const BTO_UNIT_SCHEMA = {
  type: "object",
  properties: {
    block: { type: "string" },
    unitNumber: { type: "string" },
    floor: { type: "number" },
    type: { type: "string" },
    facing: { type: "string" },
    pros: { type: "array", items: { type: "string" } },
    cons: { type: "array", items: { type: "string" } },
    score: { type: "number" },
    reasoning: { type: "string" },
    detailedAnalysis: {
      type: "object",
      properties: {
        noise: { type: "string" },
        sunshine: { type: "string" },
        proximity: { type: "string" },
        view: { type: "string" },
        lift: { type: "string" },
      },
      required: ["noise", "sunshine", "proximity", "view", "lift"],
    },
    grades: {
      type: "object",
      properties: {
        noise: { type: "number" },
        sunshine: { type: "number" },
        proximity: { type: "number" },
        view: { type: "number" },
        lift: { type: "number" },
      },
      required: ["noise", "sunshine", "proximity", "view", "lift"],
    },
    floorPlanPage: { type: "number" },
    buildingOrientationDegrees: { type: "number" },
  },
  required: [
    "block",
    "unitNumber",
    "floor",
    "type",
    "facing",
    "pros",
    "cons",
    "score",
    "reasoning",
    "detailedAnalysis",
    "grades",
    "floorPlanPage",
    "buildingOrientationDegrees",
  ],
};

function createClient(): Anthropic {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY_DREAMYBTO,
    dangerouslyAllowBrowser: true,
  });
}

export async function analyzeBTOPDF(
  pdfBase64: string,
  preferences: UserPreferences
): Promise<AnalysisResult> {
  const client = createClient();

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
    8. For "buildingOrientationDegrees": Look at the Site Plan on page 9, which includes a North arrow. Determine how many degrees clockwise from true North the floor plan's "up" direction points. For example: if the top of the floor plan faces North, set 0. If it faces East, set 90. If it faces South-West, set 225. This is critical for accurate sun direction rendering.

    Use the output_analysis tool to return your structured analysis with exactly 6 top unit suggestions.
  `;

  const response = await client.beta.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8096,
    betas: ["pdfs-2024-09-25"],
    tools: [
      {
        name: "output_analysis",
        description:
          "Output the structured BTO analysis result with top 6 unit suggestions",
        input_schema: {
          type: "object",
          properties: {
            topSuggestions: {
              type: "array",
              items: BTO_UNIT_SCHEMA,
            },
            projectOverview: { type: "string" },
          },
          required: ["topSuggestions", "projectOverview"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "output_analysis" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
            cache_control: { type: "ephemeral" },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("No structured output from Claude. The model may have hit its output token limit — try a smaller PDF.");
  }
  return toolUse.input as unknown as AnalysisResult;
}

export async function analyzeSpecificUnit(
  pdfBase64: string,
  preferences: UserPreferences,
  block: string,
  unitNumber: string,
  floor: number
): Promise<BTOUnit> {
  const client = createClient();

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
    For "buildingOrientationDegrees": Look at the Site Plan on page 9, which includes a North arrow. Determine how many degrees clockwise from true North the floor plan's "up" direction points (0 = top faces North, 90 = top faces East, 180 = top faces South, 270 = top faces West).

    Use the output_unit tool to return your structured analysis.
  `;

  const response = await client.beta.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    betas: ["pdfs-2024-09-25"],
    tools: [
      {
        name: "output_unit",
        description: "Output the structured BTO unit analysis",
        input_schema: BTO_UNIT_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "output_unit" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
            cache_control: { type: "ephemeral" },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("No structured output from Claude. The model may have hit its output token limit — try a smaller PDF.");
  }
  return toolUse.input as unknown as BTOUnit;
}

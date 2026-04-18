# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Does

Dreamy BTO is a Singapore HDB BTO flat selection assistant. Users upload a BTO project brochure PDF, set their preferences (flat type, noise sensitivity, sunshine preference, floor level, proximity to amenities, view, lift wait time), and the app uses the Gemini AI API to analyze the PDF and recommend the top 6 units. It also renders a sunshine analysis overlay on the unit's floor plan, showing sun direction at different times and months.

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Run dev server at http://localhost:3000
npm run build      # Production build
npm run lint       # Type-check with tsc --noEmit (no separate lint tool)
npm run preview    # Preview production build
```

## Environment Setup

Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY_DREAMYBTO`. The Vite config injects it at build time via `process.env.ANTHROPIC_API_KEY_DREAMYBTO` — it is a client-side key baked into the bundle. For GitHub Pages deployment, the secret must be named `ANTHROPIC_API_KEY_DREAMYBTO` in repository settings.

## Architecture

**Single-page app flow** (`src/App.tsx`): Multi-step wizard — `upload → preferences → priorities → analyzing → results`. All state lives in App; no external state manager.

**AI layer** (`src/services/geminiService.ts`):
- `analyzeBTOPDF(pdfBase64, preferences)` — sends the full PDF as base64 inline data to `gemini-3.1-pro-preview` with a structured JSON schema (`ANALYSIS_RESULT_SCHEMA`), returns `AnalysisResult` (6 top units + project overview).
- `analyzeSpecificUnit(pdfBase64, preferences, block, unit, floor)` — analyzes a single user-specified unit on demand (used for "compare" and "sunshine search" features).

**Sunshine analysis pipeline** (`src/components/SunshineMonitor.tsx` → `src/components/SunAnalysis/`):
1. `SunshineMonitor` loads the BTO PDF with `pdfjs-dist`, renders the relevant floor plan page to a canvas, and extracts a DataURL image.
2. `SunAnalysis` takes that image, crops it to the specific unit using `UnitCropper.ts` + `unitCropRegistry.ts`, then renders `SunOverlay` which draws a sun direction arrow over the floor plan.
3. Sun position math is in `sunMath.ts` using the `suncalc` library. Singapore coordinates are hardcoded. Time is computed in UTC offset from SGT (UTC+8).

**Unit crop registry** (`src/components/SunAnalysis/unitCropRegistry.ts`): A hardcoded map of `unitId → UnitCropConfig` (pixel crop coordinates at 1000×1000 source resolution). Currently only units 112, 114, 121 are calibrated. New units need entries here. `CropCalibrationPanel` provides a UI to dial in crop coordinates interactively.

**Key types** (`src/types.ts`): `UserPreferences`, `BTOUnit` (with `grades` 0-100 per dimension), `AnalysisResult`.

**Styling**: Tailwind CSS v4 via `@tailwindcss/vite` plugin (no `tailwind.config.js`). Uses `clsx` + `tailwind-merge` via a local `cn()` helper defined inline in `App.tsx`.

**Vite config**: `base` is set to `/Dreamy-BTO/` for GitHub Pages deployment. The `@` alias resolves to the repo root.

## Key Constraints

- The Gemini model name `gemini-3.1-pro-preview` is used in both service functions — update both if changing models.
- PDF is passed as base64 inline data directly to Gemini (not via File API), so large PDFs may hit token limits.
- The `unitCropRegistry` is the only place that knows how to isolate individual units from a floor plan page — any new BTO project will need new crop entries calibrated via `CropCalibrationPanel`.

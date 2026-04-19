# Window Facing Accuracy — Design Spec
_Date: 2026-04-19_

## Problem

The sunshine overlay shows the sun in the wrong position and the compass labels are wrong. Three root causes:

1. **`facing` text is AI-guessed incorrectly** — the AI was trying to read compass direction from pages 12-23, which are schematic layouts with no compass reference.
2. **Compass labels in the overlay are static** — N/S/E/W are hardcoded at fixed positions in `SunOverlay.tsx` regardless of `buildingOrientationDegrees`, making the compass wrong whenever the building isn't North-up.
3. **No window wall indicator** — the sun beam points at the unit centre with no indication of where the W1 window actually is, so you can't tell if the sun hits the window or a solid wall.

---

## Key Constraint

- **Page 9 only** is the authoritative compass reference. It contains the North arrow and each block's physical footprint in real geographic orientation.
- **Pages 12-23** show schematic floor plan layouts only — no compass information. They are used solely for internal room layout (noise/sunshine text analysis), not for direction.
- **`windowFacingDegrees` is per unit, not per block.** Units on opposite sides of the same block corridor face different directions (roughly 180° apart). The AI must identify each unit's position within the block footprint on page 9 to determine its specific window wall direction.

---

## Approved Approach (Approach C)

Keep `buildingOrientationDegrees` for floor-plan-relative sun placement. Add `windowFacingDegrees` as an absolute compass degree. Fix compass labels to rotate with building orientation. Draw a window wall indicator on the unit crop.

---

## Section 1: Data Model

### `types.ts`
Add one new required field to `BTOUnit`:

```ts
windowFacingDegrees: number; // Absolute compass degrees the W1 window wall faces (0=N, 90=E, 180=S, 270=W). From page 9.
```

Existing fields unchanged:
- `facing: string` — kept for human-readable text in the "Professional Insight" paragraph
- `buildingOrientationDegrees: number` — kept for rotating the sun position relative to the floor plan image

### `BTO_UNIT_SCHEMA` (geminiService.ts)
Add `windowFacingDegrees: { type: "number" }` to properties and required array.

---

## Section 2: AI Prompt Changes

Both `analyzeBTOPDF` and `analyzeSpecificUnit` prompts are updated.

### Remove
The "left=West, right=East" instruction (was based on pages 12-23 which carry no compass information).

### Add: `windowFacingDegrees` instruction
> "For `windowFacingDegrees`: Go to page 9 (site plan). Find the block footprint. Identify where the specific unit sits within that block — which side of the corridor it is on. The W1 window is on the longer wall, opposite the corridor/entrance side. Using the North arrow on page 9, measure the compass degrees (0–359, clockwise from North) that the W1 window wall of that specific unit faces. 0=North, 90=East, 180=South, 270=West. Non-cardinal angles (e.g. 30°, 210°) are valid. Units on opposite sides of the same block corridor will have values roughly 180° apart."

### Update: `facing` instruction
> "For `facing`: Derive as a human-readable compass direction from `windowFacingDegrees` (e.g. 30° → 'North-East', 270° → 'West'). This is the direction the W1 window wall faces."

### Update: `buildingOrientationDegrees` instruction (unchanged in substance)
> "For `buildingOrientationDegrees`: From the North arrow on page 9, determine how many degrees clockwise from North the floor plan image's 'up' direction points. 0=top faces North, 90=top faces East, 180=top faces South, 270=top faces West."

---

## Section 3: Visual Overlay Changes

### File: `SunOverlay.tsx`

**New prop**: `windowFacingDegrees: number`

**Change 1 — Rotate compass labels**

Compute each compass point's position on a circular path around the overlay, rotated by `buildingOrientationDegrees`:

```ts
// Each label is placed on a circle at the correct compass angle relative to the floor plan
const compassPoints = [
  { label: 'N', degree: 0 },
  { label: 'E', degree: 90 },
  { label: 'S', degree: 180 },
  { label: 'W', degree: 270 },
];

// For each point:
const rotated = (point.degree - buildingOrientationDegrees + 360) % 360;
const vector = azimuthToVector(rotated);
// Place label at edge of overlay using vector
```

Labels sit on a circular path so they never overlap at any rotation angle.

**Change 2 — Window wall indicator**

Compute the window wall's direction relative to the floor plan image:
```ts
const windowRelativeDegrees = (windowFacingDegrees - buildingOrientationDegrees + 360) % 360;
```

Draw a thick amber/gold line segment on the edge of the unit crop box in that direction, centered on the focus point. This makes it visually obvious which wall has the window.

**No change** to the sun position math — `adjustedAzimuth = (azimuth - buildingOrientationDegrees + 360) % 360` is already correct.

### Prop chain: `windowFacingDegrees` threading

```
BTOUnit.windowFacingDegrees
  → App.tsx  (selectedUnitForSun.windowFacingDegrees)
    → SunshineMonitor (new prop: windowFacingDegrees)
      → SunAnalysis (new prop: windowFacingDegrees)
        → SunOverlay (new prop: windowFacingDegrees)
```

---

## Section 4: Edge Cases

| Case | Behaviour |
|---|---|
| `windowFacingDegrees` missing / AI fails to return it | Default to `buildingOrientationDegrees` (assume window faces same as floor plan "up"). Suppress window wall indicator rather than draw it in wrong place. |
| Units on opposite sides of corridor, same block | Each unit has its own `windowFacingDegrees` (~180° apart). No cross-unit validation needed. |
| Compass label overlap | Labels placed on circular path — no edge overlap at any rotation angle. |
| Non-cardinal angles (e.g. 30°, 210°) | Fully supported — all math is in degrees 0–359. |

---

## Files Changed

| File | Change |
|---|---|
| `src/types.ts` | Add `windowFacingDegrees: number` to `BTOUnit` |
| `src/services/geminiService.ts` | Schema + prompt updates (both functions) |
| `src/components/SunAnalysis/SunOverlay.tsx` | Rotating compass labels + window wall indicator |
| `src/components/SunAnalysis/SunAnalysis.tsx` | Pass `windowFacingDegrees` prop to `SunOverlay` |
| `src/components/SunshineMonitor.tsx` | Accept + pass `windowFacingDegrees` prop |
| `src/App.tsx` | Pass `selectedUnitForSun.windowFacingDegrees` to `SunshineMonitor` |

import SunCalc from "suncalc";

export interface SunPosition {
  azimuth: number; // in degrees
  altitude: number; // in degrees
}

/**
 * Calculates sun position for a given date, latitude, and longitude.
 * Converts SunCalc's azimuth (radians from South) to compass degrees (radians from North).
 */
export const calculateSunPosition = (
  date: Date,
  latitude: number,
  longitude: number
): SunPosition => {
  const position = SunCalc.getPosition(date, latitude, longitude);
  
  // SunCalc azimuth is radians from South, clockwise (West is positive)
  // We want radians from North, clockwise
  // SunCalc: 0 is South, PI/2 is West, -PI/2 is East, PI is North
  // Compass: 0 is North, PI/2 is East, PI is South, 3PI/2 is West
  const azimuthDegrees = (position.azimuth * 180) / Math.PI + 180;
  const altitudeDegrees = (position.altitude * 180) / Math.PI;

  return {
    azimuth: azimuthDegrees,
    altitude: altitudeDegrees,
  };
};

/**
 * Converts azimuth angle to x, y coordinates for vector projection.
 */
export const azimuthToVector = (azimuthDegrees: number) => {
  // Azimuth 0 is North (up), 90 is East (right)
  // In standard math: 0 is right, 90 is up
  // So we adjust: angle = 90 - azimuth
  const angleRad = ((90 - azimuthDegrees) * Math.PI) / 180;
  return {
    x: Math.cos(angleRad),
    y: -Math.sin(angleRad), // Negative because Y increases downwards in SVG/Canvas
  };
};

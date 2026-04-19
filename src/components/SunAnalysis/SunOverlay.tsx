import React from 'react';
import { azimuthToVector } from './sunMath';

interface SunOverlayProps {
  azimuth: number;
  altitude: number;
  width: number;
  height: number;
  buildingOrientation: number;
  windowFacingDegrees?: number;
  focusPoint?: { x: number; y: number };
}

export const SunOverlay: React.FC<SunOverlayProps> = ({
  azimuth,
  altitude,
  width,
  height,
  buildingOrientation,
  windowFacingDegrees,
  focusPoint
}) => {
  const targetX = focusPoint?.x ?? width / 2;
  const targetY = focusPoint?.y ?? height / 2;

  const radius = Math.min(width, height) * 0.45;

  // Sun position — adjusted relative to floor plan orientation
  const adjustedAzimuth = (azimuth - buildingOrientation + 360) % 360;
  const sunVector = azimuthToVector(adjustedAzimuth);
  const sunX = targetX + sunVector.x * (radius + 60);
  const sunY = targetY + sunVector.y * (radius + 60);

  // Sunlight beam polygon
  const beamAngle = 0.4;
  const beamLength = Math.max(width, height) * 3;
  const toTargetAngle = Math.atan2(targetY - sunY, targetX - sunX);
  const p1x = sunX + Math.cos(toTargetAngle - beamAngle) * beamLength;
  const p1y = sunY + Math.sin(toTargetAngle - beamAngle) * beamLength;
  const p2x = sunX + Math.cos(toTargetAngle + beamAngle) * beamLength;
  const p2y = sunY + Math.sin(toTargetAngle + beamAngle) * beamLength;
  const points = `${sunX},${sunY} ${p1x},${p1y} ${p2x},${p2y}`;

  // Window wall indicator — W1 window direction relative to floor plan image
  const windowRelativeDegrees = (windowFacingDegrees - buildingOrientation + 360) % 360;
  const windowVec = azimuthToVector(windowRelativeDegrees);
  const windowMarkerX = targetX + windowVec.x * radius * 0.85;
  const windowMarkerY = targetY + windowVec.y * radius * 0.85;
  const perpX = -windowVec.y;
  const perpY = windowVec.x;
  const markerHalfLen = 28;
  const wx1 = windowMarkerX + perpX * markerHalfLen;
  const wy1 = windowMarkerY + perpY * markerHalfLen;
  const wx2 = windowMarkerX - perpX * markerHalfLen;
  const wy2 = windowMarkerY - perpY * markerHalfLen;

  // Compass labels — rotated to reflect real-world directions
  const compassPoints = [
    { label: 'N', degree: 0 },
    { label: 'E', degree: 90 },
    { label: 'S', degree: 180 },
    { label: 'W', degree: 270 },
  ];
  const compassRadius = Math.min(width, height) * 0.47;

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 overflow-visible"
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sunlightGradient" gradientUnits="userSpaceOnUse" x1={sunX} y1={sunY} x2={targetX} y2={targetY}>
          <stop offset="0%" stopColor="#d4a373" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#d4a373" stopOpacity="0" />
        </linearGradient>
        <filter id="sunGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Sunlight Polygon */}
      {altitude > 0 && (
        <polygon
          points={points}
          fill="url(#sunlightGradient)"
          className="transition-all duration-700 ease-in-out"
          style={{ transformOrigin: `${sunX}px ${sunY}px` }}
        />
      )}

      {/* Sun Icon */}
      {altitude > 0 && (
        <g
          transform={`translate(${sunX}, ${sunY})`}
          className="transition-all duration-700 ease-in-out"
        >
          <circle r="22" fill="#d4a373" opacity="0.15" filter="url(#sunGlow)" />
          <circle r="14" fill="#d4a373" opacity="0.2" />
          <circle r="8" fill="#d4a373" className="shadow-sm" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
            <line
              key={angle}
              x1="0" y1="0"
              x2={16 * Math.cos(angle * Math.PI / 180)}
              y2={16 * Math.sin(angle * Math.PI / 180)}
              stroke="#d4a373"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.5"
            />
          ))}
        </g>
      )}

      {/* Window Wall Indicator (W1) */}
      {windowFacingDegrees !== undefined && (
        <>
          <line
            x1={wx1} y1={wy1}
            x2={wx2} y2={wy2}
            stroke="#d4a373"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.85"
            className="transition-all duration-700 ease-in-out"
          />
          <text
            x={windowMarkerX + windowVec.x * 18}
            y={windowMarkerY + windowVec.y * 18}
            fill="#d4a373"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            opacity="0.9"
            letterSpacing="0.05em"
          >
            W1
          </text>
        </>
      )}

      {/* Compass Labels — rotated to match real-world directions */}
      <g opacity="0.4">
        {compassPoints.map(({ label, degree }) => {
          const rotated = (degree - buildingOrientation + 360) % 360;
          const vec = azimuthToVector(rotated);
          const cx = width / 2 + vec.x * compassRadius;
          const cy = height / 2 + vec.y * compassRadius;
          return (
            <text
              key={label}
              x={cx}
              y={cy}
              fill="#5a5a40"
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
              letterSpacing="0.1em"
            >
              {label}
            </text>
          );
        })}
      </g>
    </svg>
  );
};

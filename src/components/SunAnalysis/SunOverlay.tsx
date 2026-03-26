import React from 'react';
import { azimuthToVector } from './sunMath';

interface SunOverlayProps {
  azimuth: number;
  altitude: number;
  width: number;
  height: number;
  buildingOrientation: number;
  focusPoint?: { x: number; y: number }; // Local coordinates relative to the current view
}

export const SunOverlay: React.FC<SunOverlayProps> = ({ 
  azimuth, 
  altitude, 
  width, 
  height,
  buildingOrientation,
  focusPoint
}) => {
  // Target the focus point if provided, otherwise the center
  const targetX = focusPoint?.x ?? width / 2;
  const targetY = focusPoint?.y ?? height / 2;
  
  const radius = Math.min(width, height) * 0.45;
  
  // Adjust azimuth based on building orientation
  const adjustedAzimuth = (azimuth - buildingOrientation + 360) % 360;
  
  // Calculate sun icon position relative to the target
  const sunVector = azimuthToVector(adjustedAzimuth);
  const sunX = targetX + sunVector.x * (radius + 60);
  const sunY = targetY + sunVector.y * (radius + 60);

  // Calculate sunlight polygon
  // The sun is at (sunX, sunY). The light projects from the sun towards the target.
  const beamAngle = 0.4; // width of the beam in radians
  const beamLength = Math.max(width, height) * 3; // Long enough to cover the unit
  
  // Direction from sun to target
  const toTargetAngle = Math.atan2(targetY - sunY, targetX - sunX);
  
  const p1x = sunX + Math.cos(toTargetAngle - beamAngle) * beamLength;
  const p1y = sunY + Math.sin(toTargetAngle - beamAngle) * beamLength;
  const p2x = sunX + Math.cos(toTargetAngle + beamAngle) * beamLength;
  const p2y = sunY + Math.sin(toTargetAngle + beamAngle) * beamLength;

  const points = `${sunX},${sunY} ${p1x},${p1y} ${p2x},${p2y}`;

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
          {/* Outer Glow */}
          <circle r="22" fill="#d4a373" opacity="0.15" filter="url(#sunGlow)" />
          <circle r="14" fill="#d4a373" opacity="0.2" />
          
          {/* Core */}
          <circle r="8" fill="#d4a373" className="shadow-sm" />
          
          {/* Rays */}
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

      {/* Compass Indicators */}
      <g opacity="0.4">
        <text x={width / 2} y={24} fill="#5a5a40" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="0.1em">N</text>
        <text x={width / 2} y={height - 12} fill="#5a5a40" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="0.1em">S</text>
        <text x={width - 18} y={height / 2} fill="#5a5a40" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="0.1em">E</text>
        <text x={18} y={height / 2} fill="#5a5a40" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="0.1em">W</text>
      </g>
    </svg>
  );
};

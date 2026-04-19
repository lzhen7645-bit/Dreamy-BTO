import React, { useState, useMemo, useEffect, useRef } from 'react';
import { calculateSunPosition } from './sunMath';
import { SunOverlay } from './SunOverlay';
import { SunControls } from './SunControls';
import { Info, Bug, Settings, X } from 'lucide-react';
import { unitCropRegistry, UnitCropConfig } from './unitCropRegistry';
import { cropUnitImage } from './UnitCropper';
import { CropCalibrationPanel } from './CropCalibrationPanel';
import { toDisplayCoords } from './cropCoordinateUtils';

interface SunAnalysisProps {
  latitude: number;
  longitude: number;
  floorPlanImage?: string; // URL or DataURL
  unitId: string;
  buildingOrientation: number; // degrees relative to north
  windowFacingDegrees?: number;
  unitFacing?: string;
  children?: React.ReactNode; // Allow passing custom content like a canvas
}

export const SunAnalysis: React.FC<SunAnalysisProps> = ({
  latitude,
  longitude,
  floorPlanImage,
  unitId,
  buildingOrientation,
  windowFacingDegrees,
  unitFacing = "North",
  children
}) => {
  const [month, setMonth] = useState(2); // Default to March
  const [timeMode, setTimeMode] = useState<'morning' | 'afternoon'>('afternoon');
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [localCropConfig, setLocalCropConfig] = useState<UnitCropConfig | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null);

  // Use registry config or local override from calibration
  const cropConfig = useMemo(() => {
    if (localCropConfig && localCropConfig.unitId === unitId) return localCropConfig;
    return unitCropRegistry[unitId] || null;
  }, [unitId, localCropConfig]);

  // Recalculate sun position when month or timeMode changes
  const sunData = useMemo(() => {
    const year = new Date().getFullYear();
    const day = 21; // Use 21st of each month
    const hour = timeMode === 'morning' ? 9 : 15; // 9 AM or 3 PM in Singapore Time (SGT)
    
    // Singapore is UTC+8. To get 9 AM SGT, we need 1 AM UTC.
    // To get 3 PM SGT (15:00), we need 7 AM UTC.
    const utcHour = hour - 8;
    const date = new Date(Date.UTC(year, month, day, utcHour));
    
    return calculateSunPosition(date, latitude, longitude);
  }, [month, timeMode, latitude, longitude]);

  // Handle cropping when image or unitId changes
  useEffect(() => {
    const performCrop = async () => {
      if (!floorPlanImage || !cropConfig) {
        setCroppedImage(null);
        return;
      }

      try {
        const cropped = await cropUnitImage(floorPlanImage, cropConfig);
        setCroppedImage(cropped);
      } catch (err) {
        console.error("Cropping failed:", err);
        setCroppedImage(null);
      }
    };

    performCrop();
  }, [floorPlanImage, cropConfig]);

  // Handle container resize to keep SVG overlay in sync
  useEffect(() => {
    const updateDimensions = () => {
      const target = debugMode ? imageRef.current : containerRef.current;
      if (target) {
        setDimensions({
          width: target.clientWidth,
          height: target.clientHeight,
        });
      }
    };

    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);
    if (imageRef.current) observer.observe(imageRef.current);

    updateDimensions();
    return () => observer.disconnect();
  }, [croppedImage, debugMode, floorPlanImage]);

  // Calculate the effective focus point for the sun overlay
  const effectiveFocusPoint = useMemo(() => {
    if (!cropConfig || dimensions.width === 0) return undefined;

    const focus = cropConfig.focusPoint || { 
      x: cropConfig.x + cropConfig.width / 2, 
      y: cropConfig.y + cropConfig.height / 2 
    };

    if (debugMode) {
      // Scale from source coordinates to rendered coordinates
      const scaleX = dimensions.width / cropConfig.sourceImageWidth;
      const scaleY = dimensions.height / cropConfig.sourceImageHeight;
      
      return {
        x: focus.x * scaleX,
        y: focus.y * scaleY
      };
    } else {
      // In cropped mode, the focus point is relative to the crop area
      const relXRatio = (focus.x - cropConfig.x) / cropConfig.width;
      const relYRatio = (focus.y - cropConfig.y) / cropConfig.height;
      
      return {
        x: relXRatio * dimensions.width,
        y: relYRatio * dimensions.height
      };
    }
  }, [cropConfig, debugMode, dimensions]);

  // Automatically enter calibration mode if no crop config exists
  useEffect(() => {
    if (!cropConfig && !calibrationMode) {
      setCalibrationMode(true);
    }
  }, [cropConfig, calibrationMode]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
  };

  return (
    <div className="overflow-hidden">
      {/* Top Section */}
      <div className="pb-8 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-medium text-gray-900">Unit {unitId} Analysis</h2>
          <p className="text-sm text-gray-500 italic font-serif mt-1">
            Solar exposure visualization and structural impact assessment
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCalibrationMode(!calibrationMode)}
            className={`p-2.5 rounded-full transition-all ${calibrationMode ? 'bg-[#5a5a40] text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title="Open Calibration Tool"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setDebugMode(!debugMode)}
            className={`p-2.5 rounded-full transition-all ${debugMode ? 'bg-[#d4a373] text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            title="Toggle Debug View"
          >
            <Bug className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="py-10 space-y-10">
        {calibrationMode && floorPlanImage ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-serif font-medium text-gray-900">Unit Calibration Tool</h3>
              {cropConfig && (
                <button 
                  onClick={() => setCalibrationMode(false)}
                  className="text-sm font-bold text-[#d4a373] hover:underline"
                >
                  Exit Calibration
                </button>
              )}
            </div>
            <CropCalibrationPanel 
              unitId={unitId}
              floorPlanImage={floorPlanImage}
              initialConfig={cropConfig || undefined}
              onConfigChange={setLocalCropConfig}
            />
          </div>
        ) : (
          <>
            {/* Main Floorplan Section */}
            <div 
              ref={containerRef}
              className="relative bg-[#fdfcf9] rounded-2xl p-6 flex items-center justify-center overflow-hidden w-full aspect-[16/9] border border-gray-100 shadow-sm"
            >
              {!cropConfig && !debugMode ? (
                <div className="text-center p-12 max-w-md">
                  <Info className="w-16 h-16 text-[#d4a373]/30 mx-auto mb-6" />
                  <p className="text-xl font-serif text-gray-800 mb-3">Calibration Required</p>
                  <p className="text-sm text-gray-500 leading-relaxed mb-8">
                    Crop data has not been established for Unit {unitId}. Please use the calibration tool to define the unit boundaries.
                  </p>
                  <button 
                    onClick={() => setCalibrationMode(true)}
                    className="px-10 py-3.5 bg-[#5a5a40] text-white rounded-full text-sm font-medium hover:bg-[#4a4a30] transition-all shadow-md hover:shadow-lg"
                  >
                    Start Calibration
                  </button>
                  <div className="mt-12 opacity-20 grayscale blur-[3px]">
                    {floorPlanImage ? (
                      <img 
                        src={floorPlanImage} 
                        alt="Full Plan Fallback" 
                        className="max-h-[180px] object-contain" 
                        onLoad={onImageLoad}
                      />
                    ) : children}
                  </div>
                </div>
              ) : (
                <>
                  {debugMode ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {floorPlanImage ? (
                        <img 
                          ref={imageRef}
                          src={floorPlanImage} 
                          alt="Debug Plan" 
                          className="max-w-full max-h-full object-contain" 
                          onLoad={onImageLoad}
                        />
                      ) : children}
                      {cropConfig && dimensions.width > 0 && cropConfig.sourceImageWidth > 0 && cropConfig.sourceImageHeight > 0 && (
                        <div 
                          className="absolute border-2 border-[#d4a373] bg-[#d4a373]/5 pointer-events-none"
                          style={{
                            left: `${(cropConfig.x / cropConfig.sourceImageWidth) * dimensions.width}px`,
                            top: `${(cropConfig.y / cropConfig.sourceImageHeight) * dimensions.height}px`,
                            width: `${(cropConfig.width / cropConfig.sourceImageWidth) * dimensions.width}px`,
                            height: `${(cropConfig.height / cropConfig.sourceImageHeight) * dimensions.height}px`,
                          }}
                        >
                          <span className="absolute -top-7 left-0 bg-[#d4a373] text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap font-medium shadow-sm">
                            UNIT {unitId} BOUNDARY
                          </span>
                          {cropConfig.focusPoint && (
                            <div 
                              className="absolute w-3 h-3 bg-[#5a5a40] rounded-full -translate-x-1/2 -translate-y-1/2 z-20 border-2 border-white shadow-md"
                              style={{
                                left: `${((cropConfig.focusPoint.x - cropConfig.x) / cropConfig.width) * 100}%`,
                                top: `${((cropConfig.focusPoint.y - cropConfig.y) / cropConfig.height) * 100}%`,
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    croppedImage && (
                      <img 
                        ref={imageRef}
                        src={croppedImage} 
                        alt={`Unit ${unitId} Cropped`} 
                        className="max-w-full max-h-full object-contain shadow-2xl rounded-xl transition-all duration-500"
                        onLoad={onImageLoad}
                      />
                    )
                  )}

                  {/* SVG Overlay */}
                  {(croppedImage || debugMode) && dimensions.width > 0 && (
                    <div 
                      className="absolute pointer-events-none overflow-visible"
                      style={{
                        width: `${dimensions.width}px`,
                        height: `${dimensions.height}px`,
                      }}
                    >
                      <SunOverlay
                        azimuth={sunData.azimuth}
                        altitude={sunData.altitude}
                        width={dimensions.width}
                        height={dimensions.height}
                        buildingOrientation={buildingOrientation}
                        windowFacingDegrees={windowFacingDegrees}
                        focusPoint={effectiveFocusPoint}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Interactive Controls */}
            <SunControls 
              month={month} 
              setMonth={setMonth} 
              timeMode={timeMode} 
              setTimeMode={setTimeMode} 
            />

            {/* AI Analysis Section */}
            <div className="bg-[#fcfaf5] p-10 rounded-3xl border border-[#d4a373]/10 shadow-sm">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-[#d4a373]/10 rounded-2xl flex items-center justify-center shrink-0">
                  <Info className="w-6 h-6 text-[#d4a373]" />
                </div>
                <div className="space-y-4">
                  <h4 className="text-xl font-serif font-medium text-gray-900">
                    Professional Insight
                  </h4>
                  <p className="text-base text-gray-600 leading-relaxed font-serif italic">
                    {getAnalysisText(unitFacing, timeMode === 'afternoon')}
                  </p>
                  <div className="pt-6 grid grid-cols-2 gap-12 border-t border-gray-100">
                    <div>
                      <span className="text-[11px] font-bold text-[#5a5a40] uppercase tracking-widest">Peak Exposure</span>
                      <p className="text-lg font-serif text-gray-900 mt-1">{getWorstMonth(unitFacing)}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-[#5a5a40] uppercase tracking-widest">Thermal Variance</span>
                      <p className="text-lg font-serif text-gray-900 mt-1">+2°C to +5°C</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Helper functions for analysis
const getWorstMonth = (facing: string) => {
  if (facing.includes('West')) return "June - August";
  if (facing.includes('East')) return "December - February";
  if (facing === 'North') return "June";
  if (facing === 'South') return "December";
  return "June/December";
};

const getAnalysisText = (facing: string, isAfternoon: boolean) => {
  const isWest = facing.includes('West');
  const isEast = facing.includes('East');
  const worstMonth = getWorstMonth(facing);
  
  if (isAfternoon && isWest) {
    return `Direct afternoon sun detected for Unit structure. During ${worstMonth}, the sun angle is most direct, potentially increasing room temperature by 3-5°C. Aircon usage will likely increase by 40% to maintain comfort.`;
  } else if (!isAfternoon && isEast) {
    return `Strong morning sun detected for Unit structure. During ${worstMonth}, bedrooms will brighten early. Natural light is excellent, but may require blackout curtains for late sleepers.`;
  } else if (isAfternoon && (facing === 'North' || facing === 'South')) {
    return `Moderate afternoon brightness for Unit structure. Depending on the month (${worstMonth}), you may get some seasonal direct sun. Generally comfortable with good ambient light.`;
  } else {
    return "Comfortable ambient brightness for Unit structure. No direct harsh glare detected at this time.";
  }
};

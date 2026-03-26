import React, { useState, useEffect, useRef } from 'react';
import { UnitCropConfig } from './unitCropRegistry';
import { toNaturalCoords, toDisplayCoords } from './cropCoordinateUtils';
import { Copy, Check, Move, Target, Square } from 'lucide-react';

interface CropCalibrationPanelProps {
  unitId: string;
  floorPlanImage: string;
  initialConfig?: UnitCropConfig;
  onConfigChange: (config: UnitCropConfig) => void;
}

export const CropCalibrationPanel: React.FC<CropCalibrationPanelProps> = ({
  unitId,
  floorPlanImage,
  initialConfig,
  onConfigChange
}) => {
  const [config, setConfig] = useState<UnitCropConfig>(initialConfig || {
    unitId,
    sourceImageWidth: 1000,
    sourceImageHeight: 1000,
    x: 100,
    y: 100,
    width: 300,
    height: 200,
    focusPoint: { x: 250, y: 200 }
  });

  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState<'crop' | 'focus' | null>(null);
  const [copied, setCopied] = useState(false);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setDisplaySize({ width: img.clientWidth, height: img.clientHeight });
    
    // Update config with real natural dimensions if they were unknown
    setConfig(prev => ({
      ...prev,
      sourceImageWidth: img.naturalWidth,
      sourceImageHeight: img.naturalHeight
    }));
  };

  const handleMouseDown = (type: 'crop' | 'focus') => {
    setIsDragging(type);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current || naturalSize.width === 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const natural = toNaturalCoords(
      x, y, 
      displaySize.width, displaySize.height, 
      naturalSize.width, naturalSize.height
    );

    if (isDragging === 'crop') {
      setConfig(prev => ({
        ...prev,
        x: Math.max(0, Math.min(natural.x, naturalSize.width - prev.width)),
        y: Math.max(0, Math.min(natural.y, naturalSize.height - prev.height))
      }));
    } else if (isDragging === 'focus') {
      setConfig(prev => ({
        ...prev,
        focusPoint: {
          x: Math.max(0, Math.min(natural.x, naturalSize.width)),
          y: Math.max(0, Math.min(natural.y, naturalSize.height))
        }
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
    onConfigChange(config);
  };

  const updateField = (field: keyof UnitCropConfig, value: number) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const updateFocus = (field: 'x' | 'y', value: number) => {
    const newConfig = {
      ...config,
      focusPoint: { ...config.focusPoint!, [field]: value }
    };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const copyToClipboard = () => {
    const output = `"${config.unitId}": ${JSON.stringify(config, null, 2)}`;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayCrop = toDisplayCoords(
    config.x, config.y, 
    naturalSize.width, naturalSize.height, 
    displaySize.width, displaySize.height
  );

  const displayCropSize = toDisplayCoords(
    config.width, config.height, 
    naturalSize.width, naturalSize.height, 
    displaySize.width, displaySize.height
  );

  const displayFocus = config.focusPoint ? toDisplayCoords(
    config.focusPoint.x, config.focusPoint.y, 
    naturalSize.width, naturalSize.height, 
    displaySize.width, displaySize.height
  ) : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-8">
        {/* Calibration Guidelines - Moved to Top */}
        <div className="bg-[#fdfcf9] p-8 rounded-3xl border border-[#d4a373]/10 shadow-sm">
          <h4 className="text-xs font-bold text-[#5a5a40] mb-3 uppercase tracking-widest flex items-center gap-2">
            <Target className="w-4 h-4" /> Calibration Protocol
          </h4>
          <p className="text-sm text-gray-600 leading-relaxed font-serif italic">
            Adjust the boundary box to encompass the structural perimeter. Position the focus point at the primary aperture or living center for accurate solar projection.
          </p>
        </div>

        {/* Calibration View */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-bold text-[#5a5a40] uppercase tracking-[0.2em]">Visual Alignment</span>
            <span className="text-[10px] font-bold text-[#5a5a40] uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-gray-100">
              {naturalSize.width} × {naturalSize.height} PX
            </span>
          </div>
          
          <div 
            ref={containerRef}
            className="relative bg-[#fdfcf9] rounded-3xl overflow-hidden cursor-crosshair select-none border border-gray-100 shadow-xl min-h-[500px]"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img 
              ref={imgRef}
              src={floorPlanImage} 
              alt="Calibration" 
              className="w-full h-auto block"
              onLoad={handleImageLoad}
            />
            
            {/* Crop Box */}
            {naturalSize.width > 0 && (
              <div 
                className="absolute border-2 border-[#d4a373] bg-[#d4a373]/10 cursor-move shadow-[0_0_0_1px_rgba(255,255,255,0.5)]"
                style={{
                  left: displayCrop.x,
                  top: displayCrop.y,
                  width: displayCropSize.x,
                  height: displayCropSize.y
                }}
                onMouseDown={() => handleMouseDown('crop')}
              >
                <div className="absolute -top-7 left-0 bg-[#d4a373] text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1.5 font-bold shadow-md">
                  <Move className="w-3 h-3" /> Unit {config.unitId} Boundary
                </div>
              </div>
            )}

            {/* Focus Point */}
            {naturalSize.width > 0 && displayFocus && (
              <div 
                className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center cursor-pointer z-20"
                style={{
                  left: displayFocus.x,
                  top: displayFocus.y
                }}
                onMouseDown={() => handleMouseDown('focus')}
              >
                <div className="w-4 h-4 bg-[#5a5a40] rounded-full border-2 border-white shadow-xl animate-pulse" />
                <div className="absolute -top-7 bg-[#5a5a40] text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1.5 whitespace-nowrap font-bold shadow-md">
                  <Target className="w-3 h-3" /> Sun Focus
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Export Action */}
        <div className="flex justify-center pt-4">
          <button 
            onClick={copyToClipboard}
            className="w-full max-w-md bg-[#5a5a40] text-white rounded-full py-5 text-sm font-bold flex items-center justify-center gap-3 hover:bg-[#4a4a30] transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? 'Configuration Copied' : 'Export Parameters'}
          </button>
        </div>
      </div>
    </div>
  );
};

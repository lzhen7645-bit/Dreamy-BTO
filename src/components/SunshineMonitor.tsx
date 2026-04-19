import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { FlatType } from '../types';
import * as pdfjs from 'pdfjs-dist';
import { SunAnalysis } from './SunAnalysis/SunAnalysis';

// Initialize PDF.js worker using Vite's ?url suffix for the local worker file
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface SunshineMonitorProps {
  unitFacing: string; // e.g., "North", "South-West", "West"
  unitId: string;
  flatType: FlatType;
  pdfData: string; // Base64 PDF data
  pageNumber: number;
  buildingOrientationDegrees?: number;
  windowFacingDegrees?: number;
}

export const SunshineMonitor: React.FC<SunshineMonitorProps> = ({
  unitFacing,
  unitId,
  flatType,
  pdfData,
  pageNumber,
  buildingOrientationDegrees = 0,
  windowFacingDegrees,
}) => {
  const [loading, setLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [floorPlanImageUrl, setFloorPlanImageUrl] = useState<string | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Effect to load the PDF document
  useEffect(() => {
    let loadingTask: any = null;
    let isCancelled = false;

    const loadDocument = async () => {
      if (!pdfData) return;
      try {
        const binaryString = atob(pdfData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        loadingTask = pdfjs.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(pdf);
        }
      } catch (error: any) {
        if (!isCancelled) {
          console.error("PDF Load Error:", error);
        }
      }
    };

    loadDocument();

    return () => {
      isCancelled = true;
      if (loadingTask) {
        loadingTask.destroy();
      }
      setPdfDoc(null);
    };
  }, [pdfData]);

  // Effect to render the specific page
  useEffect(() => {
    let renderTask: any = null;
    let isCancelled = false;

    const renderPdfPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;
      setLoading(true);
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;
        
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        // Use a higher scale for better floor plan visibility
        const viewport = page.getViewport({ scale: 2.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        renderTask = page.render(renderContext);
        await renderTask.promise;
        
        if (!isCancelled) {
          // Capture the canvas as a data URL for cropping in SunAnalysis
          setFloorPlanImageUrl(canvas.toDataURL());
        }
      } catch (error: any) {
        if (isCancelled || error.name === 'RenderingCancelledException' || error.message?.includes('destroyed')) {
          return;
        }
        console.error("PDF Render Error:", error);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    renderPdfPage();

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNumber]);

  return (
    <SunAnalysis
      latitude={1.3521}
      longitude={103.8198}
      buildingOrientation={buildingOrientationDegrees}
      windowFacingDegrees={windowFacingDegrees}
      unitFacing={unitFacing}
      unitId={unitId}
      floorPlanImage={floorPlanImageUrl}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-20">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-3" />
            <p className="text-sm font-bold text-gray-600">Loading Floor Plan...</p>
          </div>
        )}
        <canvas ref={canvasRef} className="max-w-full h-auto object-contain shadow-lg rounded-lg" />
      </div>
    </SunAnalysis>
  );
};

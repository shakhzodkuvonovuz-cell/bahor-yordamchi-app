import { useState, useRef, useCallback, useEffect } from "react";
import { X, Download, ExternalLink, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface ImageLightboxProps {
  imageUrl: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ imageUrl, alt = "Image", onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastPinchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const lastTapTime = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 5;

  // Reset on image change
  useEffect(() => {
    if (imageUrl) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [imageUrl]);

  // Calculate distance between two touch points
  const getDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate center between two touch points
  const getCenter = (touches: React.TouchList) => {
    if (touches.length < 2) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      lastPinchDistance.current = getDistance(e.touches);
      lastTouchCenter.current = getCenter(e.touches);
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan start (only when zoomed in)
      setIsDragging(true);
      dragStart.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }

    // Double tap detection
    const now = Date.now();
    if (e.touches.length === 1 && now - lastTapTime.current < 300) {
      // Double tap - toggle zoom
      if (scale > 1) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      } else {
        setScale(2.5);
      }
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
    }
  }, [scale, position]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDistance.current !== null) {
      // Pinch zoom
      const distance = getDistance(e.touches);
      const scaleChange = distance / lastPinchDistance.current;
      
      setScale(prev => {
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * scaleChange));
        return newScale;
      });
      
      lastPinchDistance.current = distance;
      
      // Pan with pinch center
      const center = getCenter(e.touches);
      if (lastTouchCenter.current) {
        setPosition(prev => ({
          x: prev.x + (center.x - lastTouchCenter.current!.x),
          y: prev.y + (center.y - lastTouchCenter.current!.y),
        }));
      }
      lastTouchCenter.current = center;
      
      e.preventDefault();
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Pan
      setPosition({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y,
      });
    }
  }, [isDragging, scale]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    lastPinchDistance.current = null;
    lastTouchCenter.current = null;
    setIsDragging(false);
  }, []);

  // Handle wheel zoom (desktop)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * delta)));
  }, []);

  // Mouse drag for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
  }, [isDragging, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom controls
  const zoomIn = () => setScale(prev => Math.min(MAX_SCALE, prev * 1.5));
  const zoomOut = () => setScale(prev => Math.max(MIN_SCALE, prev / 1.5));
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Download handler
  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "image.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(imageUrl, "_blank");
    }
  };

  return (
    <Dialog open={!!imageUrl} onOpenChange={() => onClose()}>
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none overflow-hidden"
        hideCloseButton
      >
        {/* Screen reader only title */}
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Zoom controls */}
        <div className="absolute top-4 left-4 z-50 flex gap-2">
          <button
            onClick={zoomIn}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={zoomOut}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={resetZoom}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Reset zoom"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <span className="px-3 py-2 rounded-full bg-white/10 text-white text-sm">
            {Math.round(scale * 100)}%
          </span>
        </div>

        {/* Bottom action buttons */}
        <div className="absolute bottom-4 right-4 z-50 flex gap-2">
          <a
            href={imageUrl || ""}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Open in new tab"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
          <button
            onClick={handleDownload}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Download"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>

        {/* Image container with pinch/zoom/pan */}
        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center overflow-hidden touch-none select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt={alt}
              className="max-w-full max-h-full object-contain pointer-events-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging ? "none" : "transform 0.1s ease-out",
              }}
              draggable={false}
            />
          )}
        </div>

        {/* Hint text */}
        <div className="absolute bottom-4 left-4 z-50 text-white/60 text-xs">
          {scale > 1 ? "Drag to pan • Double-tap to reset" : "Pinch or scroll to zoom • Double-tap to zoom in"}
        </div>
      </DialogContent>
    </Dialog>
  );
}

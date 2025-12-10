/**
 * iOS Debug Overlay for diagnosing input zoom/shift issues
 * 
 * ROOT CAUSE DIAGNOSIS:
 * - If visualViewport.scale > 1.0 on focus → iOS auto-zoom (fix: font-size: 16px on focused element)
 * - If scale stays 1.0 but layout jumps → viewport/keyboard/vh bug (fix: use 100dvh, not 100vh)
 * 
 * Only renders in development mode (import.meta.env.DEV)
 */

import { useState, useEffect, useCallback } from "react";

interface DebugState {
  // Viewport info
  scale: number;
  windowWidth: number;
  windowHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  viewportOffsetTop: number;
  documentClientHeight: number;
  
  // Active element info
  activeElementTag: string;
  activeElementClass: string;
  activeElementFontSize: string;
  
  // Meta viewport
  metaViewportContent: string;
  
  // Event log
  lastEvent: string;
}

const initialState: DebugState = {
  scale: 1,
  windowWidth: 0,
  windowHeight: 0,
  viewportWidth: 0,
  viewportHeight: 0,
  viewportOffsetTop: 0,
  documentClientHeight: 0,
  activeElementTag: "none",
  activeElementClass: "",
  activeElementFontSize: "N/A",
  metaViewportContent: "",
  lastEvent: "",
};

export default function IOSDebugOverlay() {
  const [state, setState] = useState<DebugState>(initialState);
  const [isExpanded, setIsExpanded] = useState(true);
  const [eventLog, setEventLog] = useState<string[]>([]);

  const updateDebugInfo = useCallback((eventType?: string) => {
    const vv = window.visualViewport;
    const activeEl = document.activeElement as HTMLElement | null;
    
    // Get computed font size of active element
    let fontSize = "N/A";
    if (activeEl && activeEl !== document.body) {
      try {
        fontSize = getComputedStyle(activeEl).fontSize;
      } catch (e) {
        fontSize = "error";
      }
    }
    
    // Get meta viewport content
    const metaViewport = document.querySelector('meta[name="viewport"]');
    const metaContent = metaViewport?.getAttribute("content") || "not found";
    
    const newState: DebugState = {
      scale: vv?.scale ?? 1,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      viewportWidth: vv?.width ?? 0,
      viewportHeight: vv?.height ?? 0,
      viewportOffsetTop: vv?.offsetTop ?? 0,
      documentClientHeight: document.documentElement.clientHeight,
      activeElementTag: activeEl?.tagName || "none",
      activeElementClass: activeEl?.className?.toString().slice(0, 50) || "",
      activeElementFontSize: fontSize,
      metaViewportContent: metaContent,
      lastEvent: eventType || state.lastEvent,
    };
    
    setState(newState);
    
    // Log to console for detailed debugging
    if (eventType) {
      const logEntry = `${eventType}: scale=${vv?.scale?.toFixed(2)}, el=${activeEl?.tagName}, fontSize=${fontSize}`;
      console.log(`[iOS Debug] ${logEntry}`);
      setEventLog((prev) => [logEntry, ...prev.slice(0, 9)]);
    }
  }, [state.lastEvent]);

  useEffect(() => {
    // Initial update
    updateDebugInfo("init");
    
    // Focus/blur listeners
    const handleFocusIn = (e: FocusEvent) => {
      setTimeout(() => updateDebugInfo("focusin"), 100);
    };
    
    const handleFocusOut = (e: FocusEvent) => {
      setTimeout(() => updateDebugInfo("focusout"), 100);
    };
    
    // Viewport resize listener
    const handleViewportResize = () => {
      updateDebugInfo("vv-resize");
    };
    
    // Window resize listener
    const handleWindowResize = () => {
      updateDebugInfo("win-resize");
    };
    
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    window.visualViewport?.addEventListener("resize", handleViewportResize);
    window.visualViewport?.addEventListener("scroll", handleViewportResize);
    window.addEventListener("resize", handleWindowResize);
    
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
      window.visualViewport?.removeEventListener("scroll", handleViewportResize);
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [updateDebugInfo]);

  // Only render in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  const isZoomed = state.scale > 1.01;
  const isLayoutShifted = state.viewportHeight < state.windowHeight * 0.7 && state.scale <= 1.01;

  return (
    <div
      className="fixed bottom-20 left-2 z-[99999] font-mono text-[10px] leading-tight"
      style={{ pointerEvents: "auto" }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-black/90 text-white px-2 py-1 rounded-t-md border border-white/20"
      >
        {isExpanded ? "📱 Hide Debug" : "📱 iOS Debug"}
      </button>
      
      {isExpanded && (
        <div className="bg-black/90 text-white p-2 rounded-b-md rounded-tr-md border border-white/20 max-w-[280px]">
          {/* Status indicators */}
          <div className="flex gap-2 mb-1 pb-1 border-b border-white/20">
            <span className={isZoomed ? "text-red-400 font-bold" : "text-green-400"}>
              {isZoomed ? "⚠️ ZOOMED" : "✓ No zoom"}
            </span>
            <span className={isLayoutShifted ? "text-yellow-400 font-bold" : "text-green-400"}>
              {isLayoutShifted ? "⚠️ KB shift" : "✓ Stable"}
            </span>
          </div>
          
          {/* Viewport info */}
          <div className="mb-1">
            <div>
              <span className="text-gray-400">vv.scale: </span>
              <span className={state.scale > 1.01 ? "text-red-400 font-bold" : "text-white"}>
                {state.scale.toFixed(3)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">window: </span>
              {state.windowWidth}×{state.windowHeight}
            </div>
            <div>
              <span className="text-gray-400">vv: </span>
              {state.viewportWidth.toFixed(0)}×{state.viewportHeight.toFixed(0)}
            </div>
            <div>
              <span className="text-gray-400">vv.offsetTop: </span>
              {state.viewportOffsetTop.toFixed(0)}
            </div>
            <div>
              <span className="text-gray-400">docClientH: </span>
              {state.documentClientHeight}
            </div>
          </div>
          
          {/* Active element info */}
          <div className="mb-1 pt-1 border-t border-white/20">
            <div>
              <span className="text-gray-400">active: </span>
              &lt;{state.activeElementTag.toLowerCase()}&gt;
            </div>
            <div className="truncate">
              <span className="text-gray-400">class: </span>
              {state.activeElementClass.slice(0, 30) || "none"}
            </div>
            <div>
              <span className="text-gray-400">fontSize: </span>
              <span className={parseFloat(state.activeElementFontSize) < 16 ? "text-red-400 font-bold" : "text-green-400"}>
                {state.activeElementFontSize}
              </span>
              {parseFloat(state.activeElementFontSize) < 16 && (
                <span className="text-red-400 ml-1">← ZOOM TRIGGER!</span>
              )}
            </div>
          </div>
          
          {/* Meta viewport */}
          <div className="mb-1 pt-1 border-t border-white/20 text-[9px]">
            <div className="text-gray-400">viewport meta:</div>
            <div className="truncate">{state.metaViewportContent}</div>
          </div>
          
          {/* Event log */}
          <div className="pt-1 border-t border-white/20">
            <div className="text-gray-400">Recent events:</div>
            {eventLog.slice(0, 4).map((log, i) => (
              <div key={i} className="truncate text-[9px] text-gray-300">
                {log}
              </div>
            ))}
          </div>
          
          {/* Diagnosis */}
          {(isZoomed || isLayoutShifted) && (
            <div className="mt-1 pt-1 border-t border-white/20 text-[9px]">
              <div className="text-yellow-400 font-bold">DIAGNOSIS:</div>
              {isZoomed && (
                <div className="text-red-300">
                  iOS auto-zoom detected. The focused input has font-size &lt; 16px.
                  Fix: ensure .bahor-no-zoom class with font-size: 16px !important.
                </div>
              )}
              {isLayoutShifted && !isZoomed && (
                <div className="text-yellow-300">
                  Keyboard layout shift detected. Using 100vh instead of 100dvh.
                  Fix: use height: 100dvh and avoid fixed 100vh containers.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

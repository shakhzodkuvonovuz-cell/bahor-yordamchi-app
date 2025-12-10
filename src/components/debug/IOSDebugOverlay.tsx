/**
 * iOS Debug Overlay for diagnosing input zoom/shift issues
 * 
 * ROOT CAUSE DIAGNOSIS:
 * - If visualViewport.scale > 1.0 on focus → iOS auto-zoom (fix: font-size: 16px on focused element)
 * - If scale stays 1.0 but layout jumps → viewport/keyboard/vh bug (fix: use 100dvh, not 100vh)
 * 
 * Enable with ?debug=1 query parameter
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
  activeElementId: string;
  activeElementClass: string;
  activeElementFontSize: string;
  activeElementLineHeight: string;
  activeElementTransform: string;
  activeElementZoom: string;
  
  // Ancestor issues
  ancestorWithTransform: string;
  ancestorWithBackdropFilter: string;
  
  // Meta viewport
  metaViewportContent: string;
  metaViewportCount: number;
  
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
  activeElementId: "",
  activeElementClass: "",
  activeElementFontSize: "N/A",
  activeElementLineHeight: "N/A",
  activeElementTransform: "none",
  activeElementZoom: "1",
  ancestorWithTransform: "none",
  ancestorWithBackdropFilter: "none",
  metaViewportContent: "",
  metaViewportCount: 0,
  lastEvent: "",
};

// Check if any ancestor has transform/filter that could affect layout
function findProblematicAncestor(el: HTMLElement | null): { transform: string; backdropFilter: string } {
  let current = el?.parentElement;
  let transform = "none";
  let backdropFilter = "none";
  
  while (current && current !== document.body) {
    try {
      const style = getComputedStyle(current);
      if (style.transform !== "none" && transform === "none") {
        transform = `${current.tagName}.${current.className.split(" ")[0] || "?"}`;
      }
      const webkitBackdrop = (style as unknown as Record<string, string>)["webkitBackdropFilter"] || "none";
      if ((style.backdropFilter !== "none" || webkitBackdrop !== "none") && backdropFilter === "none") {
        backdropFilter = `${current.tagName}.${current.className.split(" ")[0] || "?"}`;
      }
    } catch (e) {
      // Skip
    }
    current = current.parentElement;
  }
  
  return { transform, backdropFilter };
}

export default function IOSDebugOverlay() {
  const [state, setState] = useState<DebugState>(initialState);
  const [isExpanded, setIsExpanded] = useState(true);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);

  // Check for ?debug=1 query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsEnabled(params.get("debug") === "1");
  }, []);

  const updateDebugInfo = useCallback((eventType?: string) => {
    const vv = window.visualViewport;
    const activeEl = document.activeElement as HTMLElement | null;
    
    // Get computed styles of active element
    let fontSize = "N/A";
    let lineHeight = "N/A";
    let transform = "none";
    let zoom = "1";
    
    if (activeEl && activeEl !== document.body) {
      try {
        const style = getComputedStyle(activeEl);
        fontSize = style.fontSize;
        lineHeight = style.lineHeight;
        transform = style.transform;
        zoom = (style as any).zoom || "1";
      } catch (e) {
        fontSize = "error";
      }
    }
    
    // Find problematic ancestors
    const ancestors = findProblematicAncestor(activeEl);
    
    // Get ALL meta viewport tags
    const metaViewports = document.querySelectorAll('meta[name="viewport"]');
    const metaContent = metaViewports[0]?.getAttribute("content") || "not found";
    
    const newState: DebugState = {
      scale: vv?.scale ?? 1,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      viewportWidth: vv?.width ?? 0,
      viewportHeight: vv?.height ?? 0,
      viewportOffsetTop: vv?.offsetTop ?? 0,
      documentClientHeight: document.documentElement.clientHeight,
      activeElementTag: activeEl?.tagName || "none",
      activeElementId: activeEl?.id || "",
      activeElementClass: activeEl?.className?.toString().slice(0, 50) || "",
      activeElementFontSize: fontSize,
      activeElementLineHeight: lineHeight,
      activeElementTransform: transform,
      activeElementZoom: zoom,
      ancestorWithTransform: ancestors.transform,
      ancestorWithBackdropFilter: ancestors.backdropFilter,
      metaViewportContent: metaContent,
      metaViewportCount: metaViewports.length,
      lastEvent: eventType || state.lastEvent,
    };
    
    setState(newState);
    
    // Log to console for detailed debugging
    if (eventType) {
      const logEntry = `${eventType}: scale=${vv?.scale?.toFixed(2)}, el=${activeEl?.tagName}${activeEl?.id ? `#${activeEl.id}` : ""}, fontSize=${fontSize}`;
      console.log(`[iOS Debug] ${logEntry}`);
      setEventLog((prev) => [logEntry, ...prev.slice(0, 9)]);
    }
  }, [state.lastEvent]);

  useEffect(() => {
    if (!isEnabled) return;
    
    // Initial update
    updateDebugInfo("init");
    
    // Focus/blur listeners
    const handleFocusIn = () => {
      setTimeout(() => updateDebugInfo("focusin"), 100);
    };
    
    const handleFocusOut = () => {
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
  }, [updateDebugInfo, isEnabled]);

  // Only render if ?debug=1
  if (!isEnabled) {
    return null;
  }

  const isZoomed = state.scale > 1.01;
  const fontSizeNum = parseFloat(state.activeElementFontSize);
  const isFontTooSmall = !isNaN(fontSizeNum) && fontSizeNum < 16;
  const isLayoutShifted = state.viewportHeight < state.windowHeight * 0.7 && state.scale <= 1.01;
  const hasMultipleViewports = state.metaViewportCount > 1;

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
        <div className="bg-black/90 text-white p-2 rounded-b-md rounded-tr-md border border-white/20 max-w-[300px] max-h-[60vh] overflow-y-auto">
          {/* Status indicators */}
          <div className="flex flex-wrap gap-2 mb-1 pb-1 border-b border-white/20">
            <span className={isZoomed ? "text-red-400 font-bold" : "text-green-400"}>
              {isZoomed ? "⚠️ ZOOMED" : "✓ No zoom"}
            </span>
            <span className={isFontTooSmall ? "text-red-400 font-bold" : "text-green-400"}>
              {isFontTooSmall ? "⚠️ <16px" : "✓ Font OK"}
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
          </div>
          
          {/* Active element info */}
          <div className="mb-1 pt-1 border-t border-white/20">
            <div>
              <span className="text-gray-400">active: </span>
              &lt;{state.activeElementTag.toLowerCase()}{state.activeElementId ? `#${state.activeElementId}` : ""}&gt;
            </div>
            <div className="truncate text-[9px]">
              <span className="text-gray-400">class: </span>
              {state.activeElementClass.slice(0, 40) || "none"}
            </div>
            <div>
              <span className="text-gray-400">fontSize: </span>
              <span className={isFontTooSmall ? "text-red-400 font-bold" : "text-green-400"}>
                {state.activeElementFontSize}
              </span>
              {isFontTooSmall && (
                <span className="text-red-400 ml-1 animate-pulse">← ZOOM TRIGGER!</span>
              )}
            </div>
            <div>
              <span className="text-gray-400">lineHeight: </span>
              {state.activeElementLineHeight}
            </div>
            <div>
              <span className="text-gray-400">transform: </span>
              <span className={state.activeElementTransform !== "none" ? "text-yellow-400" : ""}>
                {state.activeElementTransform === "none" ? "none" : "has transform"}
              </span>
            </div>
          </div>
          
          {/* Ancestor issues */}
          <div className="mb-1 pt-1 border-t border-white/20">
            <div>
              <span className="text-gray-400">ancestor transform: </span>
              <span className={state.ancestorWithTransform !== "none" ? "text-yellow-400" : ""}>
                {state.ancestorWithTransform}
              </span>
            </div>
            <div>
              <span className="text-gray-400">ancestor backdrop: </span>
              <span className={state.ancestorWithBackdropFilter !== "none" ? "text-yellow-400" : ""}>
                {state.ancestorWithBackdropFilter}
              </span>
            </div>
          </div>
          
          {/* Meta viewport */}
          <div className="mb-1 pt-1 border-t border-white/20 text-[9px]">
            <div className="flex gap-2">
              <span className="text-gray-400">viewport tags:</span>
              <span className={hasMultipleViewports ? "text-red-400 font-bold" : "text-green-400"}>
                {state.metaViewportCount}
              </span>
              {hasMultipleViewports && <span className="text-red-400">← DUPLICATE!</span>}
            </div>
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
          {(isZoomed || isLayoutShifted || isFontTooSmall) && (
            <div className="mt-1 pt-1 border-t border-white/20 text-[9px]">
              <div className="text-yellow-400 font-bold">DIAGNOSIS:</div>
              {(isZoomed || isFontTooSmall) && (
                <div className="text-red-300">
                  iOS auto-zoom: focused element has font-size {state.activeElementFontSize} (&lt;16px).
                  The CSS global rule may be overridden. Check for text-sm classes.
                </div>
              )}
              {isLayoutShifted && !isZoomed && (
                <div className="text-yellow-300">
                  Keyboard layout shift detected. Container may use 100vh instead of 100dvh.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

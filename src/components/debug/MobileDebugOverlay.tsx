/**
 * Production-ready Mobile Debug Overlay
 * 
 * Enable via:
 * - URL query: ?debug=1
 * - localStorage: localStorage.setItem('bahor_debug', '1')
 * 
 * ROOT CAUSE DIAGNOSIS:
 * - If visualViewport.scale > 1.01 → iOS auto-zoom (font-size < 16px on focused element)
 * - If scale stays 1.0 but layout jumps → viewport/keyboard/vh bug
 */

import { useState, useEffect, useCallback, useRef } from "react";

interface DebugState {
  // User agent
  userAgent: string;
  isIOS: boolean;
  
  // Window dimensions
  windowWidth: number;
  windowHeight: number;
  
  // Document dimensions
  docClientWidth: number;
  docClientHeight: number;
  
  // Visual viewport
  vvWidth: number;
  vvHeight: number;
  vvScale: number;
  vvOffsetTop: number;
  vvPageTop: number;
  
  // Active element
  activeTag: string;
  activeClass: string;
  activeFontSize: string;
  
  // Meta viewport
  metaViewport: string;
  metaCount: number;
  
  // Zoom detection
  isZoomed: boolean;
}

const initialState: DebugState = {
  userAgent: "",
  isIOS: false,
  windowWidth: 0,
  windowHeight: 0,
  docClientWidth: 0,
  docClientHeight: 0,
  vvWidth: 0,
  vvHeight: 0,
  vvScale: 1,
  vvOffsetTop: 0,
  vvPageTop: 0,
  activeTag: "none",
  activeClass: "",
  activeFontSize: "N/A",
  metaViewport: "",
  metaCount: 0,
  isZoomed: false,
};

export default function MobileDebugOverlay() {
  const [state, setState] = useState<DebugState>(initialState);
  const [isVisible, setIsVisible] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [position, setPosition] = useState({ x: 10, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Check if debug mode is enabled (URL param OR localStorage)
  useEffect(() => {
    const checkEnabled = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlEnabled = urlParams.get("debug") === "1";
      const storageEnabled = localStorage.getItem("bahor_debug") === "1";
      setIsEnabled(urlEnabled || storageEnabled);
    };
    
    checkEnabled();
    
    // Re-check on popstate (URL changes)
    window.addEventListener("popstate", checkEnabled);
    return () => window.removeEventListener("popstate", checkEnabled);
  }, []);

  const addLog = useCallback((entry: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    setEventLog(prev => [`${timestamp} ${entry}`, ...prev.slice(0, 19)]);
  }, []);

  const updateDebugInfo = useCallback((eventType?: string) => {
    const vv = window.visualViewport;
    const activeEl = document.activeElement as HTMLElement | null;
    
    // Get computed font-size of active element
    let fontSize = "N/A";
    if (activeEl && activeEl !== document.body && activeEl !== document.documentElement) {
      try {
        fontSize = getComputedStyle(activeEl).fontSize;
      } catch {
        fontSize = "error";
      }
    }
    
    // Get meta viewport tags
    const metas = document.querySelectorAll('meta[name="viewport"]');
    const metaContent = metas[0]?.getAttribute("content") || "NOT FOUND";
    
    const scale = vv?.scale ?? 1;
    const isZoomed = scale > 1.01;
    
    const newState: DebugState = {
      userAgent: navigator.userAgent.slice(0, 80) + "...",
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      docClientWidth: document.documentElement.clientWidth,
      docClientHeight: document.documentElement.clientHeight,
      vvWidth: vv?.width ?? 0,
      vvHeight: vv?.height ?? 0,
      vvScale: scale,
      vvOffsetTop: vv?.offsetTop ?? 0,
      vvPageTop: vv?.pageTop ?? 0,
      activeTag: activeEl?.tagName || "none",
      activeClass: activeEl?.className?.toString().slice(0, 60) || "",
      activeFontSize: fontSize,
      metaViewport: metaContent,
      metaCount: metas.length,
      isZoomed,
    };
    
    setState(newState);
    
    if (eventType) {
      const fontNum = parseFloat(fontSize);
      const fontWarning = !isNaN(fontNum) && fontNum < 16 ? " ⚠️<16px" : "";
      const zoomWarning = isZoomed ? " ⚠️ZOOMED" : "";
      addLog(`${eventType}: scale=${scale.toFixed(2)}${zoomWarning}, el=${activeEl?.tagName || "?"}${fontWarning}`);
    }
  }, [addLog]);

  useEffect(() => {
    if (!isEnabled) return;
    
    updateDebugInfo("init");
    
    // Event listeners
    const handleFocusIn = () => setTimeout(() => updateDebugInfo("focusin"), 50);
    const handleFocusOut = () => setTimeout(() => updateDebugInfo("focusout"), 50);
    const handleVVResize = () => updateDebugInfo("vv-resize");
    const handleVVScroll = () => updateDebugInfo("vv-scroll");
    const handleResize = () => updateDebugInfo("resize");
    const handleOrientation = () => updateDebugInfo("orientation");
    
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    window.visualViewport?.addEventListener("resize", handleVVResize);
    window.visualViewport?.addEventListener("scroll", handleVVScroll);
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientation);
    
    // Periodic update
    const interval = setInterval(() => updateDebugInfo(), 1000);
    
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      window.visualViewport?.removeEventListener("resize", handleVVResize);
      window.visualViewport?.removeEventListener("scroll", handleVVScroll);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientation);
      clearInterval(interval);
    };
  }, [isEnabled, updateDebugInfo]);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 200, e.clientX - dragStart.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragStart.current.y));
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  if (!isEnabled) return null;

  const fontNum = parseFloat(state.activeFontSize);
  const isFontSmall = !isNaN(fontNum) && fontNum < 16;

  return (
    <div
      ref={overlayRef}
      className="fixed z-[99999] font-mono text-[10px] leading-tight select-none touch-none"
      style={{ 
        left: position.x, 
        top: position.y,
        pointerEvents: "auto",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-black/95 text-white px-2 py-1 rounded-t-md border border-white/30 text-[11px] font-bold"
        style={{ pointerEvents: "auto" }}
      >
        {isVisible ? "📱 Hide Debug" : "📱 Show Debug"}
      </button>

      {isVisible && (
        <div 
          className="bg-black/95 text-white p-2 rounded-b-md rounded-tr-md border border-white/30 max-w-[280px] max-h-[55vh] overflow-y-auto"
          style={{ pointerEvents: "auto" }}
        >
          {/* ZOOM DETECTED Warning */}
          {state.isZoomed && (
            <div className="bg-red-600 text-white px-2 py-1 rounded mb-2 text-center font-bold animate-pulse">
              ⚠️ ZOOM DETECTED ⚠️
            </div>
          )}

          {/* Status Row */}
          <div className="flex flex-wrap gap-1 mb-1 pb-1 border-b border-white/20">
            <span className={state.isZoomed ? "text-red-400 font-bold" : "text-green-400"}>
              {state.isZoomed ? "⚠️ ZOOMED" : "✓ Scale OK"}
            </span>
            <span className={isFontSmall ? "text-red-400 font-bold" : "text-green-400"}>
              {isFontSmall ? "⚠️ <16px" : "✓ Font≥16"}
            </span>
            <span className={state.isIOS ? "text-yellow-400" : "text-gray-400"}>
              {state.isIOS ? "iOS" : "non-iOS"}
            </span>
          </div>

          {/* Viewport Scale */}
          <div className="mb-1">
            <div>
              <span className="text-gray-400">vv.scale: </span>
              <span className={state.vvScale > 1.01 ? "text-red-400 font-bold text-xs" : "text-green-400 font-bold"}>
                {state.vvScale.toFixed(3)}
              </span>
            </div>
          </div>

          {/* Dimensions */}
          <div className="mb-1 text-[9px]">
            <div><span className="text-gray-400">window: </span>{state.windowWidth}×{state.windowHeight}</div>
            <div><span className="text-gray-400">doc.client: </span>{state.docClientWidth}×{state.docClientHeight}</div>
            <div><span className="text-gray-400">vv: </span>{state.vvWidth.toFixed(0)}×{state.vvHeight.toFixed(0)}</div>
            <div><span className="text-gray-400">vv.offsetTop: </span>{state.vvOffsetTop.toFixed(0)}</div>
            <div><span className="text-gray-400">vv.pageTop: </span>{state.vvPageTop.toFixed(0)}</div>
          </div>

          {/* Active Element */}
          <div className="mb-1 pt-1 border-t border-white/20">
            <div>
              <span className="text-gray-400">active: </span>
              &lt;{state.activeTag.toLowerCase()}&gt;
            </div>
            <div className="truncate text-[9px]">
              <span className="text-gray-400">class: </span>
              {state.activeClass.slice(0, 50) || "none"}
            </div>
            <div>
              <span className="text-gray-400">fontSize: </span>
              <span className={isFontSmall ? "text-red-400 font-bold" : "text-green-400"}>
                {state.activeFontSize}
              </span>
              {isFontSmall && <span className="text-red-400 ml-1 animate-pulse">← ZOOM TRIGGER!</span>}
            </div>
          </div>

          {/* Meta Viewport */}
          <div className="mb-1 pt-1 border-t border-white/20 text-[9px]">
            <div className="flex gap-2">
              <span className="text-gray-400">viewport tags:</span>
              <span className={state.metaCount > 1 ? "text-red-400 font-bold" : "text-green-400"}>
                {state.metaCount}
              </span>
              {state.metaCount > 1 && <span className="text-red-400">← DUPLICATE!</span>}
            </div>
            <div className="truncate text-[8px] break-all">{state.metaViewport}</div>
          </div>

          {/* User Agent */}
          <div className="mb-1 pt-1 border-t border-white/20 text-[8px] text-gray-400 truncate">
            {state.userAgent}
          </div>

          {/* Event Log */}
          <div className="pt-1 border-t border-white/20">
            <div className="text-gray-400 text-[9px]">Recent events:</div>
            <div className="max-h-[80px] overflow-y-auto">
              {eventLog.slice(0, 10).map((log, i) => (
                <div 
                  key={i} 
                  className={`truncate text-[8px] ${log.includes("⚠️") ? "text-red-400" : "text-gray-300"}`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Clear localStorage button */}
          <div className="mt-2 pt-1 border-t border-white/20 flex gap-2">
            <button
              onClick={() => {
                localStorage.removeItem("bahor_debug");
                setIsEnabled(false);
              }}
              className="text-[9px] px-2 py-1 bg-red-600/50 hover:bg-red-600 rounded"
            >
              Disable Debug
            </button>
            <button
              onClick={() => setEventLog([])}
              className="text-[9px] px-2 py-1 bg-gray-600/50 hover:bg-gray-600 rounded"
            >
              Clear Log
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

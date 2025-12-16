import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import bahorLogo from "@/assets/bahor-logo.png";

// Version 1: Accurate interlocking trefoil curves (closest to Bahor AI logo)
function LogoV1({ size = 64 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="bahor-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(175 80% 60%)" />
          </linearGradient>
          <filter id="bahor-glow-1">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#bahor-glow-1)" className="origin-center">
          {/* Three interlocking loops forming trefoil knot pattern */}
          <path
            d="M50 20 
               C35 20, 25 35, 30 50 
               C35 65, 50 70, 50 50
               C50 30, 65 35, 70 50
               C75 65, 65 80, 50 80
               C35 80, 25 65, 30 50"
            fill="none"
            stroke="url(#bahor-grad-1)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-logo-draw"
            style={{ strokeDasharray: 400, strokeDashoffset: 0 }}
          />
          {/* Rotating highlight ring */}
          <circle
            cx="50"
            cy="50"
            r="25"
            fill="none"
            stroke="hsl(175 90% 70%)"
            strokeWidth="2"
            strokeDasharray="8 12"
            className="animate-logo-orbit origin-center"
            style={{ transformOrigin: "50px 50px" }}
          />
          {/* Center glow */}
          <circle cx="50" cy="50" r="6" fill="url(#bahor-grad-1)" className="animate-logo-breathe" />
        </g>
      </svg>
    </div>
  );
}

// Version 2: Infinity-style double loop (accurate interlocking curves)
function LogoV2({ size = 64 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="bahor-grad-2" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="hsl(175 70% 45%)" />
            <stop offset="50%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(175 70% 45%)" />
          </linearGradient>
          <filter id="bahor-glow-2">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#bahor-glow-2)">
          {/* First loop - left side */}
          <path
            d="M50 50 C30 30, 15 50, 30 60 C45 70, 50 50, 50 50"
            fill="none"
            stroke="url(#bahor-grad-2)"
            strokeWidth="5"
            strokeLinecap="round"
            className="animate-logo-wave"
          />
          {/* Second loop - right side */}
          <path
            d="M50 50 C70 70, 85 50, 70 40 C55 30, 50 50, 50 50"
            fill="none"
            stroke="url(#bahor-grad-2)"
            strokeWidth="5"
            strokeLinecap="round"
            className="animate-logo-wave"
            style={{ animationDelay: "0.3s" }}
          />
          {/* Third loop - top */}
          <path
            d="M50 50 C30 70, 50 85, 60 70 C70 55, 50 50, 50 50"
            fill="none"
            stroke="url(#bahor-grad-2)"
            strokeWidth="5"
            strokeLinecap="round"
            className="animate-logo-wave"
            style={{ animationDelay: "0.6s" }}
          />
          {/* Fourth loop - bottom */}
          <path
            d="M50 50 C70 30, 50 15, 40 30 C30 45, 50 50, 50 50"
            fill="none"
            stroke="url(#bahor-grad-2)"
            strokeWidth="5"
            strokeLinecap="round"
            className="animate-logo-wave"
            style={{ animationDelay: "0.9s" }}
          />
          {/* Pulsing center */}
          <circle cx="50" cy="50" r="8" fill="url(#bahor-grad-2)" className="animate-logo-core" />
          <circle cx="50" cy="50" r="4" fill="hsl(175 95% 85%)" className="animate-logo-inner-pulse" />
        </g>
      </svg>
    </div>
  );
}

// Version 3: Flowing interlocked petals with Perplexity-style spin
function LogoV3({ size = 64 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="bahor-grad-3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(175 80% 55%)" />
          </linearGradient>
          <filter id="bahor-glow-3">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#bahor-glow-3)" className="animate-logo-smooth-spin origin-center" style={{ transformOrigin: "50px 50px" }}>
          {/* Four interlocking curved petals */}
          {[0, 90, 180, 270].map((angle, i) => (
            <path
              key={i}
              d="M50 50 C50 35, 35 25, 25 35 C15 45, 25 60, 40 55 C45 53, 50 50, 50 50"
              fill="none"
              stroke="url(#bahor-grad-3)"
              strokeWidth="4"
              strokeLinecap="round"
              transform={`rotate(${angle} 50 50)`}
              className="animate-logo-petal-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </g>
        {/* Center dot */}
        <circle cx="50" cy="50" r="6" fill="url(#bahor-grad-3)" className="animate-logo-breathe" />
        <circle cx="50" cy="50" r="3" fill="hsl(175 95% 90%)" />
      </svg>
    </div>
  );
}

// Version 4: Smooth morphing interlocked loops (like Perplexity)
function LogoV4({ size = 64 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="bahor-grad-4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(175 85% 65%)">
              <animate attributeName="stop-color" 
                values="hsl(175 85% 65%);hsl(var(--primary));hsl(175 85% 65%)" 
                dur="3s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="hsl(var(--primary))">
              <animate attributeName="stop-color" 
                values="hsl(var(--primary));hsl(175 85% 65%);hsl(var(--primary))" 
                dur="3s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          <filter id="bahor-glow-4">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#bahor-glow-4)">
          {/* Morphing interlocked shape */}
          <path
            d="M50 20 Q70 20 70 40 Q70 50 50 50 Q30 50 30 60 Q30 80 50 80 Q70 80 70 60 Q70 50 50 50 Q30 50 30 40 Q30 20 50 20"
            fill="none"
            stroke="url(#bahor-grad-4)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-logo-morph"
          />
          {/* Orbiting particle */}
          <circle r="4" fill="hsl(175 95% 80%)" className="animate-logo-particle">
            <animateMotion 
              dur="2.5s" 
              repeatCount="indefinite"
              path="M50 20 Q70 20 70 40 Q70 50 50 50 Q30 50 30 60 Q30 80 50 80 Q70 80 70 60 Q70 50 50 50 Q30 50 30 40 Q30 20 50 20"
            />
          </circle>
          {/* Center glow */}
          <circle cx="50" cy="50" r="8" fill="url(#bahor-grad-4)" className="animate-logo-core" />
          <circle cx="50" cy="50" r="4" fill="hsl(175 95% 90%)" className="animate-logo-inner-pulse" />
        </g>
      </svg>
    </div>
  );
}

// Version 5: Celtic-style interlocking curves with 3D rotation
function LogoV5({ size = 64 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size, perspective: "150px" }}>
      <div 
        className="w-full h-full animate-logo-3d-tilt"
        style={{ transformStyle: "preserve-3d" }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="bahor-grad-5" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="50%" stopColor="hsl(175 90% 65%)" />
              <stop offset="100%" stopColor="hsl(var(--primary))" />
            </linearGradient>
            <filter id="bahor-glow-5">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#bahor-glow-5)">
            {/* Three interlocking Celtic-style loops */}
            <path
              d="M50 15 C25 15, 15 35, 25 50 C35 65, 50 60, 50 50"
              fill="none"
              stroke="url(#bahor-grad-5)"
              strokeWidth="5"
              strokeLinecap="round"
              className="animate-logo-trace"
            />
            <path
              d="M75 30 C90 50, 80 75, 60 75 C40 75, 45 55, 50 50"
              fill="none"
              stroke="url(#bahor-grad-5)"
              strokeWidth="5"
              strokeLinecap="round"
              className="animate-logo-trace"
              style={{ animationDelay: "0.3s" }}
            />
            <path
              d="M25 70 C10 55, 20 30, 40 30 C55 30, 55 45, 50 50"
              fill="none"
              stroke="url(#bahor-grad-5)"
              strokeWidth="5"
              strokeLinecap="round"
              className="animate-logo-trace"
              style={{ animationDelay: "0.6s" }}
            />
            {/* Glowing center knot */}
            <circle cx="50" cy="50" r="10" fill="url(#bahor-grad-5)" className="animate-logo-breathe" />
            <circle cx="50" cy="50" r="5" fill="hsl(175 95% 85%)" className="animate-logo-inner-pulse" />
            {/* Rotating highlight */}
            <circle
              cx="50"
              cy="50"
              r="18"
              fill="none"
              stroke="hsl(175 80% 75%)"
              strokeWidth="1.5"
              strokeDasharray="6 8"
              className="animate-logo-orbit origin-center"
              style={{ transformOrigin: "50px 50px", opacity: 0.6 }}
            />
          </g>
        </svg>
      </div>
    </div>
  );
}

export default function LogoShowcase() {
  const navigate = useNavigate();
  
  const logos = [
    { Component: LogoV1, name: "V1: Trefoil Curves", description: "Interlocking trefoil knot with orbiting highlight ring" },
    { Component: LogoV2, name: "V2: Four-Way Infinity", description: "Four interlocking infinity loops meeting at center" },
    { Component: LogoV3, name: "V3: Flowing Petals", description: "Four curved petals with smooth Perplexity-style spin" },
    { Component: LogoV4, name: "V4: Morphing Loop", description: "Figure-8 style loop with orbiting particle (like Perplexity)" },
    { Component: LogoV5, name: "V5: Celtic Knot 3D", description: "Three interlocking Celtic curves with 3D tilt animation" },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Bahor AI Logo Animations</h1>
            <p className="text-muted-foreground">Choose your favorite thinking indicator</p>
          </div>
        </div>

        {/* Reference: Original Bahor AI Logo */}
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-primary">Reference:</span> Original Bahor AI Logo
            </CardTitle>
            <p className="text-sm text-muted-foreground">The target design to match</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8 flex-wrap">
              {[32, 48, 64, 96].map((size) => (
                <div key={size} className="flex flex-col items-center gap-2">
                  <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4">
                    <img src={bahorLogo} alt="Bahor AI Logo" style={{ width: size, height: size }} className="object-contain" />
                  </div>
                  <span className="text-xs text-muted-foreground">{size}px</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {logos.map(({ Component, name, description }, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{name}</CardTitle>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8 flex-wrap">
                  {/* Size variants */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-20 w-20 flex items-center justify-center bg-muted/30 rounded-lg">
                      <Component size={24} />
                    </div>
                    <span className="text-xs text-muted-foreground">Small (24px)</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-24 w-24 flex items-center justify-center bg-muted/30 rounded-lg">
                      <Component size={40} />
                    </div>
                    <span className="text-xs text-muted-foreground">Medium (40px)</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-32 w-32 flex items-center justify-center bg-muted/30 rounded-lg">
                      <Component size={64} />
                    </div>
                    <span className="text-xs text-muted-foreground">Large (64px)</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-40 w-40 flex items-center justify-center bg-muted/30 rounded-lg">
                      <Component size={96} />
                    </div>
                    <span className="text-xs text-muted-foreground">XLarge (96px)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Side by side comparison */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Side by Side (ThinkBar size - 32px)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-around flex-wrap gap-6 py-4">
              {logos.map(({ Component }, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <Component size={32} />
                  <span className="text-xs text-muted-foreground">V{index + 1}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dark preview */}
        <Card className="mt-8 bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">On Dark Background (48px)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-around flex-wrap gap-6 py-4">
              {logos.map(({ Component }, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <Component size={48} />
                  <span className="text-xs text-zinc-400">V{index + 1}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

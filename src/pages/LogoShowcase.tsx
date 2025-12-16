import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Version 1: Rotating interlocking curves (closest to actual logo)
function LogoV1({ size = 64 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(175 80% 60%)" />
          </linearGradient>
          <filter id="glow1">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow1)" className="animate-logo-rotate origin-center">
          {/* Four interlocking curved shapes */}
          <path
            d="M50 20 C35 20 25 30 25 45 C25 55 30 60 40 60 C45 60 50 55 50 50 C50 45 45 40 40 40 C35 40 35 45 35 50"
            fill="none"
            stroke="url(#grad1)"
            strokeWidth="4"
            strokeLinecap="round"
            className="animate-logo-petal"
          />
          <path
            d="M80 50 C80 35 70 25 55 25 C45 25 40 30 40 40 C40 45 45 50 50 50 C55 50 60 45 60 40 C60 35 55 35 50 35"
            fill="none"
            stroke="url(#grad1)"
            strokeWidth="4"
            strokeLinecap="round"
            className="animate-logo-petal"
            style={{ animationDelay: "0.5s" }}
          />
          <path
            d="M50 80 C65 80 75 70 75 55 C75 45 70 40 60 40 C55 40 50 45 50 50 C50 55 55 60 60 60 C65 60 65 55 65 50"
            fill="none"
            stroke="url(#grad1)"
            strokeWidth="4"
            strokeLinecap="round"
            className="animate-logo-petal"
            style={{ animationDelay: "1s" }}
          />
          <path
            d="M20 50 C20 65 30 75 45 75 C55 75 60 70 60 60 C60 55 55 50 50 50 C45 50 40 55 40 60 C40 65 45 65 50 65"
            fill="none"
            stroke="url(#grad1)"
            strokeWidth="4"
            strokeLinecap="round"
            className="animate-logo-petal"
            style={{ animationDelay: "1.5s" }}
          />
        </g>
        <circle cx="50" cy="50" r="5" fill="url(#grad1)" className="animate-logo-core" />
      </svg>
    </div>
  );
}

// Version 2: Pulsing flower petals
function LogoV2({ size = 64 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <radialGradient id="grad2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(175 90% 70%)" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </radialGradient>
          <filter id="glow2">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow2)" className="origin-center">
          {/* 8 petals that pulse */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <ellipse
              key={i}
              cx="50"
              cy="30"
              rx="8"
              ry="18"
              fill="url(#grad2)"
              transform={`rotate(${angle} 50 50)`}
              className="animate-logo-petal origin-center"
              style={{ 
                animationDelay: `${i * 0.15}s`,
                transformOrigin: "50px 50px"
              }}
            />
          ))}
        </g>
        <circle cx="50" cy="50" r="12" fill="url(#grad2)" className="animate-logo-breathe" />
        <circle cx="50" cy="50" r="6" fill="hsl(175 95% 85%)" className="animate-logo-inner-pulse" />
      </svg>
    </div>
  );
}

// Version 3: Hexagonal neural network
function LogoV3({ size = 64 }: { size?: number }) {
  const outerNodes = [
    { cx: 50, cy: 15 },
    { cx: 80, cy: 32.5 },
    { cx: 80, cy: 67.5 },
    { cx: 50, cy: 85 },
    { cx: 20, cy: 67.5 },
    { cx: 20, cy: 32.5 },
  ];
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(175 70% 50%)" />
          </linearGradient>
          <filter id="glow3">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow3)">
          {/* Inner hexagon */}
          <polygon
            points="50,25 70,37.5 70,62.5 50,75 30,62.5 30,37.5"
            fill="none"
            stroke="url(#grad3)"
            strokeWidth="2"
            className="animate-logo-breathe"
          />
          {/* Connecting spokes */}
          {outerNodes.map((node, i) => (
            <line
              key={`spoke-${i}`}
              x1={node.cx}
              y1={node.cy}
              x2={50}
              y2={50}
              stroke="url(#grad3)"
              strokeWidth="2"
              className="animate-logo-line"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
          {/* Outer hexagon */}
          <polygon
            points="50,15 80,32.5 80,67.5 50,85 20,67.5 20,32.5"
            fill="none"
            stroke="url(#grad3)"
            strokeWidth="2.5"
            className="animate-logo-center-spin origin-center"
            style={{ transformOrigin: "50px 50px" }}
          />
          {/* Nodes */}
          {outerNodes.map((node, i) => (
            <circle
              key={`node-${i}`}
              cx={node.cx}
              cy={node.cy}
              r={5}
              fill="url(#grad3)"
              className="animate-logo-node"
              style={{ animationDelay: `${0.7 + i * 0.1}s` }}
            />
          ))}
          {/* Center node */}
          <circle cx="50" cy="50" r="8" fill="url(#grad3)" className="animate-logo-core" />
          <circle cx="50" cy="50" r="4" fill="hsl(175 95% 85%)" className="animate-logo-inner-pulse" />
        </g>
      </svg>
    </div>
  );
}

// Version 4: Concentric ripple rings with rotating core
function LogoV4({ size = 64 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="50%" stopColor="hsl(175 80% 55%)" />
            <stop offset="100%" stopColor="hsl(180 70% 40%)" />
          </linearGradient>
          <filter id="glow4">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#glow4)">
          {/* Ripple rings */}
          {[38, 30, 22].map((r, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="url(#grad4)"
              strokeWidth={2}
              className="animate-logo-ripple"
              style={{ 
                animationDelay: `${i * 0.4}s`,
                opacity: 1 - i * 0.2
              }}
            />
          ))}
          {/* Rotating inner petals */}
          <g className="animate-logo-center-spin origin-center" style={{ transformOrigin: "50px 50px" }}>
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <ellipse
                key={i}
                cx="50"
                cy="40"
                rx="4"
                ry="10"
                fill="url(#grad4)"
                transform={`rotate(${angle} 50 50)`}
              />
            ))}
          </g>
          {/* Center */}
          <circle cx="50" cy="50" r="8" fill="url(#grad4)" />
          <circle cx="50" cy="50" r="4" fill="hsl(175 95% 85%)" className="animate-logo-inner-pulse" />
        </g>
      </svg>
    </div>
  );
}

// Version 5: 3D rotating crystal/gem
function LogoV5({ size = 64 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size, perspective: "200px" }}>
      <div 
        className="w-full h-full animate-logo-3d-rotate"
        style={{ transformStyle: "preserve-3d" }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="grad5a" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(175 80% 45%)" />
            </linearGradient>
            <linearGradient id="grad5b" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(175 60% 65%)" />
              <stop offset="100%" stopColor="hsl(175 80% 35%)" />
            </linearGradient>
            <filter id="glow5">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#glow5)">
            {/* 3D hexagonal gem */}
            <path d="M50 10 L80 30 L80 70 L50 90 L20 70 L20 30 Z" fill="url(#grad5a)" />
            <path d="M50 10 L80 30 L50 50 L20 30 Z" fill="url(#grad5b)" />
            <path d="M80 30 L80 70 L50 50 Z" fill="hsl(175 70% 30%)" />
            <path d="M20 30 L50 50 L20 70 Z" fill="hsl(175 70% 55%)" />
            {/* Inner facets */}
            <path d="M50 50 L50 90 L80 70 Z" fill="hsl(175 60% 40%)" opacity="0.8" />
            <path d="M50 50 L50 90 L20 70 Z" fill="hsl(175 70% 50%)" opacity="0.8" />
            {/* Inner glow */}
            <circle cx="50" cy="40" r="12" fill="hsl(175 80% 75%)" opacity="0.5" className="animate-logo-inner-glow" />
            <circle cx="50" cy="40" r="6" fill="hsl(175 95% 90%)" className="animate-logo-inner-pulse" />
          </g>
        </svg>
      </div>
    </div>
  );
}

export default function LogoShowcase() {
  const navigate = useNavigate();
  
  const logos = [
    { Component: LogoV1, name: "V1: Interlocking Curves", description: "Rotating curved lines matching the original logo pattern" },
    { Component: LogoV2, name: "V2: Pulsing Flower", description: "8 petals that pulse with glowing center core" },
    { Component: LogoV3, name: "V3: Hexagonal Network", description: "Connected hexagon nodes with rotating outer ring" },
    { Component: LogoV4, name: "V4: Ripple Core", description: "Expanding rings with rotating inner petals" },
    { Component: LogoV5, name: "V5: 3D Crystal", description: "Rotating 3D hexagonal gem with facets" },
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

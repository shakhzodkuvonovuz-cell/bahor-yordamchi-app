import React from 'react';

// ============================================
// VARIANT 1: Floating Gradient Orbs (CSS)
// ============================================
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Large orbs - more visible */}
      <div className="absolute w-[500px] h-[500px] -top-32 -left-32 rounded-full bg-gradient-to-br from-primary/40 via-primary/20 to-transparent blur-3xl animate-[float-slow_20s_ease-in-out_infinite]" />
      <div className="absolute w-[400px] h-[400px] top-1/4 -right-20 rounded-full bg-gradient-to-bl from-accent/35 via-primary/25 to-transparent blur-3xl animate-[float-slow_25s_ease-in-out_infinite_reverse]" />
      <div className="absolute w-[350px] h-[350px] bottom-0 left-1/4 rounded-full bg-gradient-to-tr from-primary/30 via-accent/20 to-transparent blur-3xl animate-[float-slow_18s_ease-in-out_infinite_2s]" />
      <div className="absolute w-[250px] h-[250px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-radial from-primary/25 via-primary/10 to-transparent blur-2xl animate-pulse" />
      
      {/* Small floating particles - more visible */}
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-primary"
          style={{
            width: `${6 + Math.random() * 10}px`,
            height: `${6 + Math.random() * 10}px`,
            left: `${5 + (i * 6.5)}%`,
            top: `${15 + Math.random() * 70}%`,
            animation: `float-slow ${12 + i * 1.5}s ease-in-out infinite ${i * 0.4}s`,
            opacity: 0.4 + Math.random() * 0.3,
            filter: 'blur(1px)',
            boxShadow: '0 0 10px hsl(var(--primary) / 0.5)'
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// VARIANT 2: Neural Network Grid
// ============================================
function NeuralNetwork() {
  const nodes = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: 5 + (i % 5) * 22 + Math.random() * 10,
    y: 10 + Math.floor(i / 5) * 22 + Math.random() * 10,
    size: 3 + Math.random() * 4,
    delay: i * 0.2
  }));

  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg className="w-full h-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        {/* Connecting lines */}
        {nodes.map((node, i) => 
          nodes.slice(i + 1).filter((_, j) => j < 3).map((target, j) => (
            <line
              key={`${i}-${j}`}
              x1={node.x}
              y1={node.y}
              x2={target.x}
              y2={target.y}
              stroke="hsl(var(--primary))"
              strokeWidth="0.15"
              strokeOpacity="0.3"
              className="animate-pulse"
              style={{ animationDelay: `${node.delay}s` }}
            />
          ))
        )}
        
        {/* Nodes */}
        {nodes.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.size}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="0.2"
              className="animate-pulse"
              style={{ animationDelay: `${node.delay}s` }}
            />
            <circle
              cx={node.x}
              cy={node.y}
              r={node.size * 0.4}
              fill="hsl(var(--primary))"
              className="animate-pulse"
              style={{ animationDelay: `${node.delay}s` }}
            />
          </g>
        ))}
      </svg>
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background/60" />
    </div>
  );
}

// ============================================
// VARIANT 3: Wave Mesh Grid
// ============================================
function WaveMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg className="w-full h-full opacity-30" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice">
        {/* Horizontal wave lines */}
        {[...Array(8)].map((_, i) => (
          <path
            key={`h-${i}`}
            d={`M 0 ${10 + i * 7} Q 25 ${8 + i * 7} 50 ${10 + i * 7} T 100 ${10 + i * 7}`}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="0.15"
            className="animate-[wave_8s_ease-in-out_infinite]"
            style={{ 
              animationDelay: `${i * 0.3}s`,
              transformOrigin: 'center'
            }}
          />
        ))}
        
        {/* Vertical lines creating grid */}
        {[...Array(12)].map((_, i) => (
          <line
            key={`v-${i}`}
            x1={8 + i * 8}
            y1="0"
            x2={8 + i * 8}
            y2="60"
            stroke="hsl(var(--primary))"
            strokeWidth="0.1"
            strokeOpacity="0.2"
          />
        ))}
      </svg>
      
      {/* Glowing accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-gradient-radial from-primary/10 via-primary/5 to-transparent blur-3xl" />
    </div>
  );
}

// ============================================
// VARIANT 4: Geometric Constellation
// ============================================
function GeometricConstellation() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Rotating geometric shapes */}
      <div className="absolute top-10 left-10 w-32 h-32 border border-primary/20 rotate-45 animate-[spin_30s_linear_infinite]" />
      <div className="absolute top-20 right-20 w-24 h-24 border border-primary/15 animate-[spin_25s_linear_infinite_reverse]" />
      <div className="absolute bottom-20 left-1/4 w-40 h-40 border border-primary/10 rotate-12 animate-[spin_35s_linear_infinite]" />
      
      {/* Hexagon */}
      <svg className="absolute top-1/3 right-1/4 w-48 h-48 opacity-20 animate-[spin_40s_linear_infinite]" viewBox="0 0 100 100">
        <polygon
          points="50,5 90,25 90,75 50,95 10,75 10,25"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="0.5"
        />
      </svg>
      
      {/* Stars/dots */}
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-primary animate-pulse"
          style={{
            width: `${1 + Math.random() * 3}px`,
            height: `${1 + Math.random() * 3}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            opacity: 0.3 + Math.random() * 0.4
          }}
        />
      ))}
      
      {/* Gradient orbs */}
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-3xl animate-pulse" />
      <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-gradient-to-tr from-accent/10 to-transparent blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  );
}

// ============================================
// Main Component
// ============================================
interface HeroBackgroundProps {
  variant: 1 | 2 | 3 | 4;
}

export function HeroBackground({ variant }: HeroBackgroundProps) {
  return (
    <div className="absolute inset-0 pointer-events-none -z-10">
      {variant === 1 && <FloatingOrbs />}
      {variant === 2 && <NeuralNetwork />}
      {variant === 3 && <WaveMesh />}
      {variant === 4 && <GeometricConstellation />}
    </div>
  );
}
/**
 * Demo page to preview and compare all 5 voice UI concepts
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { 
  VoiceConceptA, 
  VoiceConceptB, 
  VoiceConceptC, 
  VoiceConceptD, 
  VoiceConceptE 
} from "@/components/voice/concepts";

const concepts = [
  {
    id: "A",
    name: "Whisper",
    subtitle: "Ultra-minimal Apple/Siri style",
    colors: ["#FAFAFA", "#00C7B1", "#1A1A1A"],
    description: "Soft breathing circle, ripple waves, whisper-like elegance"
  },
  {
    id: "B", 
    name: "Nebula",
    subtitle: "Futuristic holographic sci-fi",
    colors: ["#0A0A0F", "#00F5E1", "#FF00FF"],
    description: "3D rotating rings, energy particles, HUD interface"
  },
  {
    id: "C",
    name: "Bloom",
    subtitle: "Organic nature-inspired (Bahor = Spring)",
    colors: ["#F0FDF4", "#2DD4A8", "#FCD34D"],
    description: "Floating petals, pollen particles, living aura"
  },
  {
    id: "D",
    name: "Tessellate", 
    subtitle: "Abstract geometric patterns",
    colors: ["#0F0F0F", "#00C7B1", "#FFFFFF"],
    description: "Morphing polygons, sacred geometry, pulsing grids"
  },
  {
    id: "E",
    name: "Pulse",
    subtitle: "Bold neon cyberpunk",
    colors: ["#0D0015", "#FF00AA", "#00FFFF"],
    description: "Aggressive waveforms, glitch effects, techno vibes"
  }
];

export default function VoiceConceptsDemo() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const navigate = useNavigate();

  const renderDemo = () => {
    switch (activeDemo) {
      case "A": return <VoiceConceptA isOpen={true} onClose={() => setActiveDemo(null)} />;
      case "B": return <VoiceConceptB isOpen={true} onClose={() => setActiveDemo(null)} />;
      case "C": return <VoiceConceptC isOpen={true} onClose={() => setActiveDemo(null)} />;
      case "D": return <VoiceConceptD isOpen={true} onClose={() => setActiveDemo(null)} />;
      case "E": return <VoiceConceptE isOpen={true} onClose={() => setActiveDemo(null)} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-white">Voice UI Concepts</h1>
            <p className="text-sm text-white/40">5 radically different designs for Bahor AI</p>
          </div>
        </div>
      </header>

      {/* Concept Cards */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {concepts.map((concept) => (
            <div
              key={concept.id}
              className="group relative bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.05] overflow-hidden hover:border-white/[0.1] transition-all duration-300 cursor-pointer"
              onClick={() => setActiveDemo(concept.id)}
            >
              {/* Color preview bar */}
              <div className="h-2 flex">
                {concept.colors.map((color, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: color }} />
                ))}
              </div>

              <div className="p-6">
                {/* Concept label */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg font-bold text-white/80">
                    {concept.id}
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{concept.name}</h2>
                    <p className="text-xs text-white/40">{concept.subtitle}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-white/50 mb-6 leading-relaxed">
                  {concept.description}
                </p>

                {/* Preview button */}
                <button className="w-full py-3 rounded-xl bg-white/5 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors group-hover:bg-[#00C7B1]/20 group-hover:text-[#00C7B1]">
                  Preview Concept {concept.id}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-16 p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
          <h3 className="text-lg font-semibold text-white mb-4">Concept Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/40 font-medium">Concept</th>
                  <th className="text-left py-3 px-4 text-white/40 font-medium">Visual Style</th>
                  <th className="text-left py-3 px-4 text-white/40 font-medium">Animation</th>
                  <th className="text-left py-3 px-4 text-white/40 font-medium">Best For</th>
                </tr>
              </thead>
              <tbody className="text-white/60">
                <tr className="border-b border-white/5">
                  <td className="py-3 px-4 font-medium text-white">A: Whisper</td>
                  <td className="py-3 px-4">Minimal, clean</td>
                  <td className="py-3 px-4">Breathing, ripples</td>
                  <td className="py-3 px-4">Professional, calm users</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 px-4 font-medium text-white">B: Nebula</td>
                  <td className="py-3 px-4">Sci-fi, futuristic</td>
                  <td className="py-3 px-4">3D rings, particles</td>
                  <td className="py-3 px-4">Tech enthusiasts</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 px-4 font-medium text-white">C: Bloom</td>
                  <td className="py-3 px-4">Organic, natural</td>
                  <td className="py-3 px-4">Petals, pollen</td>
                  <td className="py-3 px-4">Brand identity (Bahor=Spring)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 px-4 font-medium text-white">D: Tessellate</td>
                  <td className="py-3 px-4">Geometric, sacred</td>
                  <td className="py-3 px-4">Morphing patterns</td>
                  <td className="py-3 px-4">Cultural sophistication</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-white">E: Pulse</td>
                  <td className="py-3 px-4">Cyberpunk, bold</td>
                  <td className="py-3 px-4">Waves, glitch</td>
                  <td className="py-3 px-4">Young, tech-savvy</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Active Demo Overlay */}
      {activeDemo && renderDemo()}
    </div>
  );
}

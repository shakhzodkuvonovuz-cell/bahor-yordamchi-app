import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import ModeCard from "@/components/ModeCard";
import { CHAT_MODES } from "@/data/modes";

export default function ModeSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary-glow/10">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bahor AI</h1>
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="p-2 hover:bg-secondary rounded-xl transition-colors"
            aria-label="Sozlamalar"
          >
            <Settings className="w-6 h-6 text-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Bugun nimaga yordam kerak?
          </h2>
          <p className="text-muted-foreground">
            Quyidagi bo'limlardan birini tanlang
          </p>
        </div>

        <div className="space-y-4">
          {CHAT_MODES.map((mode) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              onClick={() => navigate(`/chat/${mode.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

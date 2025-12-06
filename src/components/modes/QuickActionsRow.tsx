import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, FileText, Sparkles } from "lucide-react";

export default function QuickActionsRow() {
  const navigate = useNavigate();

  const actions = [
    { id: "convert", icon: <ArrowLeftRight className="w-4 h-4" />, label: "Convert", route: "/tools/documents" },
    { id: "summarize", icon: <Sparkles className="w-4 h-4" />, label: "Summarize", route: "/chat/general" },
    { id: "pdf", icon: <FileText className="w-4 h-4" />, label: "PDF", route: "/tools/documents" },
  ];

  return (
    <div className="flex gap-2 mb-6">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => navigate(action.route)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-secondary/60 border border-border/40 text-sm font-medium text-foreground hover:bg-secondary hover:border-primary/30 transition-all duration-200 active:scale-[0.97]"
        >
          <span className="text-primary">{action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

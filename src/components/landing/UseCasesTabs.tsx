import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { GraduationCap, Briefcase, Home, Palette } from "lucide-react";

interface UseCasesTabsProps {
  onOpenApp: () => void;
}

export function UseCasesTabs({ onOpenApp }: UseCasesTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      id: "talaba",
      label: "Talaba",
      icon: <GraduationCap className="w-4 h-4" />,
      prompts: [
        "Menga bugungi dars bo'yicha 30 daqiqalik reja tuzib ber.",
        "Mana mavzu — soddalashtirib tushuntir.",
        "IELTS writing'imni tekshir, xatolarni ko'rsat.",
      ],
      outcome: "Natija: tayyor reja / aniq tushuntirish / xatolar tahlili.",
    },
    {
      id: "ish",
      label: "Ish/Biznes",
      icon: <Briefcase className="w-4 h-4" />,
      prompts: [
        "Mijozga professional javob yozib ber.",
        "3 ta marketing g'oya va reja tuz.",
        "Uchrashuvdan keyin xulosa va vazifalar ro'yxati chiqargin.",
      ],
      outcome: "Natija: professional xat / marketing reja / meeting notes.",
    },
    {
      id: "uy",
      label: "Uy/Oila",
      icon: <Home className="w-4 h-4" />,
      prompts: [
        "Haftalik ovqat rejasini tuz.",
        "Bolaga darsni tushuntirib ber (oddiy tilda).",
        "Oilaviy budjetni tartiblab ber.",
      ],
      outcome: "Natija: ovqat rejasi / dars tushuntirish / byudjet tahlili.",
    },
    {
      id: "kontent",
      label: "Kontent",
      icon: <Palette className="w-4 h-4" />,
      prompts: [
        "Instagram post uchun 5 ta sarlavha.",
        "Video uchun skript yoz.",
        "Suzani uslubida rasm prompt yozib ber.",
      ],
      outcome: "Natija: tayyor sarlavhalar / skript / rasm prompt.",
    },
  ];

  return (
    <section id="use-cases" className="py-16 md:py-24 bg-secondary/30">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 text-foreground">
            Kimlar uchun?
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === i
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto">
          <div className="glass-premium rounded-2xl p-6 border border-border/30">
            <div className="space-y-4 mb-6">
              {tabs[activeTab].prompts.map((prompt, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-foreground text-sm">"{prompt}"</p>
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t border-border/30">
              <p className="text-sm text-primary font-medium">{tabs[activeTab].outcome}</p>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <Button onClick={onOpenApp} size="lg" className="h-12 px-8 font-semibold rounded-xl shadow-lg shadow-primary/25">
              Bahor AI'ni ochish
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

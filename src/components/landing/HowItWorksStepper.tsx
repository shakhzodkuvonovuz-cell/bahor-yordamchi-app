import React from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Search, ExternalLink } from "lucide-react";

export function HowItWorksStepper() {
  const ref = useScrollAnimation({ threshold: 0.1 });

  const steps = [
    { number: "1", title: "Savol yozing", desc: "Har qanday savol, til, rejim" },
    { number: "2", title: "Rejim tanlang", desc: "IELTS, kod, biznes va boshqalar" },
    { number: "3", title: "Javob oling", desc: "Kerak bo'lsa web qidiruv bilan" },
    { number: "4", title: "Natijani saqlang", desc: "PDF / Chatga / Fayllarga" },
  ];

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-5xl mx-auto px-6">
        <div
          ref={ref.ref}
          className={`text-center mb-12 transition-all duration-600 ${
            ref.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 text-foreground">
            Bahor AI qanday ishlaydi
          </h2>
          <p className="text-base md:text-lg text-white/65">To'rt oddiy qadamda boshlang</p>
        </div>

        {/* Steps row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`text-center transition-all duration-500 ${
                ref.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="relative mx-auto mb-4 w-14 h-14">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg" />
                <div className="relative w-full h-full rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">{step.number}</span>
                </div>
              </div>
              <h3 className="font-bold text-foreground mb-1">{step.title}</h3>
              <p className="text-xs text-muted-foreground">{step.desc}</p>
              
              {/* Connector line (desktop only) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-[calc(100%+12px)] w-[calc(100%-48px)] h-0.5 bg-border/30" />
              )}
            </div>
          ))}
        </div>

        {/* Mini live demo block */}
        <div
          className={`max-w-xl mx-auto glass-premium rounded-2xl p-5 border border-border/30 transition-all duration-700 ${
            ref.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
          style={{ transitionDelay: "400ms" }}
        >
          <div className="flex gap-3 mb-3">
            {/* User bubble */}
            <div className="flex-1">
              <div className="bg-primary/15 border border-primary/30 rounded-2xl rounded-tl-sm px-4 py-2.5">
                <p className="text-sm text-foreground">Yangi byudjet qonuni haqida yoz</p>
              </div>
            </div>
          </div>
          
          {/* AI response preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Web qidirilmoqda...</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {['lex.uz', 'gazeta.uz', 'kun.uz'].map((s) => (
                <span key={s} className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-0.5">
                  <ExternalLink className="w-2.5 h-2.5" />{s}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              2024-yil 15-dekabrda qabul qilingan yangi byudjet qonuniga ko'ra, ijtimoiy xarajatlar 18% ga oshirildi...
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

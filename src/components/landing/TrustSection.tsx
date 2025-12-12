import React from "react";
import { ExternalLink, Shield, FileText } from "lucide-react";

export function TrustSection() {
  const items = [
    {
      icon: <ExternalLink className="w-5 h-5 text-primary" />,
      title: "Manbalar ko'rsatiladi",
      desc: "Web qidiruv ishlaganda havolalar chiqadi.",
    },
    {
      icon: <Shield className="w-5 h-5 text-primary" />,
      title: "Fayllar himoyalangan",
      desc: "Yuklangan fayllar xavfsiz saqlanadi.",
    },
    {
      icon: <FileText className="w-5 h-5 text-primary" />,
      title: "Natijaga yo'naltirilgan",
      desc: "Reja, vazifa, xulosa va PDF yaratadi.",
    },
  ];

  return (
    <section className="py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-10 text-foreground">
          Xavfsizlik va ishonch
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-4 p-5 glass-premium rounded-xl border border-border/30">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

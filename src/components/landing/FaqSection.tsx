import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export function FaqSection() {
  const ref = useScrollAnimation({ threshold: 0.1 });

  const faqs = [
    {
      q: "Bahor AI ChatGPT bilan bir xilmi?",
      a: "Yo'q. Bahor AI o'zbek auditoriyasi uchun moslangan: o'zbekcha uslub, mahalliy manbalar va natijaga yo'naltirilgan amallar bilan.",
    },
    {
      q: "Nega Bahor AI hozir bepul?",
      a: "Hozir beta. Biz mahsulotni foydalanuvchilar bilan birga yaxshilayapmiz.",
    },
    {
      q: "Rasm yaratish (AI) qanday ishlaydi?",
      a: "O'zbekcha prompt yozasiz, Bahor AI rasm yaratadi. Yuklab olish va ulashish mumkin.",
    },
    {
      q: "Bahor AI web qidiruv ishlatganda manbalar ko'rsatadimi?",
      a: "Ha. Kerak bo'lganda qidiradi va havolalarni ko'rsatadi.",
    },
    {
      q: "Yuklagan fayllarim xavfsizmi?",
      a: "Ha. Fayllar tahlil va natija olish uchun ishlatiladi, himoyalangan tarzda saqlanadi.",
    },
    {
      q: "Doiralar nima va kimlar uchun?",
      a: "Jamoalar uchun: suhbat, fayllar va AI natijalari bitta joyda — reja, vazifa, qaror, xulosa.",
    },
  ];

  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-6">
        <div
          ref={ref.ref}
          className={`text-center mb-12 transition-all duration-600 ${
            ref.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 text-foreground">
            Ko'p beriladigan savollar
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className={`border-0 rounded-xl overflow-hidden glass-premium border border-border/30 transition-all duration-500 ${
                ref.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              <AccordionTrigger className="text-sm font-semibold px-5 py-4 hover:no-underline text-foreground hover:text-primary text-left">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground px-5 pb-4 text-sm">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

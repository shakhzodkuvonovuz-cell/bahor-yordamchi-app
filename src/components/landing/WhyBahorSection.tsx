import React from "react";
import { MessageSquare, ExternalLink, ListTodo } from "lucide-react";

export function WhyBahorSection() {
  const items = [
    {
      icon: <MessageSquare className="w-6 h-6 text-primary" />,
      title: "O'zbekcha tushunadi",
      desc: "Oddiy, tabiiy uslubda.",
    },
    {
      icon: <ExternalLink className="w-6 h-6 text-primary" />,
      title: "Manbali javob beradi",
      desc: "Kerak bo'lsa internetdan qidiradi va havola qo'shadi.",
    },
    {
      icon: <ListTodo className="w-6 h-6 text-primary" />,
      title: "Natijaga yo'naltiradi",
      desc: "Reja, vazifa, xulosa, PDF — bir joyda.",
    },
  ];

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-10 text-foreground">
          Nega Bahor AI?
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                {item.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground max-w-[200px]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

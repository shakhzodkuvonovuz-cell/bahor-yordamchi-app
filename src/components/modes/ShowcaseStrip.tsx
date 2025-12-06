import { useNavigate } from "react-router-dom";
import { MessageCircle, Wrench, Users, GraduationCap, BookOpen } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

interface ShowcaseTile {
  id: string;
  icon: React.ReactNode;
  route: string;
  chips?: string[];
  titleUz: string;
  titleEn: string;
  descUz: string;
  descEn: string;
}

const SHOWCASE_TILES: ShowcaseTile[] = [
  { 
    id: "general", 
    icon: <MessageCircle className="w-7 h-7" />, 
    route: "/chat/general", 
    chips: ["AI", "Chat"],
    titleUz: "Umumiy Chat",
    titleEn: "General Chat",
    descUz: "Har qanday savol",
    descEn: "Any question"
  },
  { 
    id: "tools", 
    icon: <Wrench className="w-7 h-7" />, 
    route: "/tools/documents", 
    chips: ["PDF", "Fayl"],
    titleUz: "Asboblar",
    titleEn: "Tools",
    descUz: "PDF va hujjatlar",
    descEn: "PDF & documents"
  },
  { 
    id: "circles", 
    icon: <Users className="w-7 h-7" />, 
    route: "/circles", 
    chips: ["Guruh", "Natija"],
    titleUz: "Doiralar",
    titleEn: "Circles",
    descUz: "Guruh bilan ishlash",
    descEn: "Group collaboration"
  },
  { 
    id: "ielts", 
    icon: <GraduationCap className="w-7 h-7" />, 
    route: "/chat/ielts", 
    chips: ["Speaking", "Writing"],
    titleUz: "IELTS",
    titleEn: "IELTS",
    descUz: "Ingliz tili tayyorgarlik",
    descEn: "English preparation"
  },
  { 
    id: "homework", 
    icon: <BookOpen className="w-7 h-7" />, 
    route: "/chat/homework", 
    chips: ["Fanlar", "Yordam"],
    titleUz: "Uy vazifasi",
    titleEn: "Homework",
    descUz: "O'qish yordami",
    descEn: "Study help"
  },
];

export default function ShowcaseStrip() {
  const navigate = useNavigate();
  const { language } = useTranslation();

  const isUz = language === 'uz' || language === 'ru';

  return (
    <section className="mb-8">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Bahor AI</h1>
        <p className="text-sm text-muted-foreground mt-1">Chat → Natija</p>
      </div>

      {/* Showcase Tiles - Horizontal Scroll */}
      <div className="overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
        <div className="flex gap-3 snap-x snap-mandatory">
          {SHOWCASE_TILES.map((tile) => (
            <button
              key={tile.id}
              onClick={() => navigate(tile.route)}
              className="snap-start flex-shrink-0 w-40 md:w-48 group"
            >
              <div className="relative h-full rounded-2xl bg-gradient-to-br from-card via-card to-secondary/30 border border-border/50 p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 active:scale-[0.98]">
                {/* Glass overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="relative flex flex-col gap-3">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary transition-colors group-hover:bg-primary/15">
                    {tile.icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-foreground leading-tight">
                    {isUz ? tile.titleUz : tile.titleEn}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-snug">
                    {isUz ? tile.descUz : tile.descEn}
                  </p>

                  {/* Chips */}
                  {tile.chips && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {tile.chips.map((chip) => (
                        <span
                          key={chip}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/80 text-muted-foreground font-medium"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

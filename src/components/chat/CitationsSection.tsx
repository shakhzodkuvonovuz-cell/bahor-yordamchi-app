import { ExternalLink, Globe } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

interface Citation {
  title: string;
  url: string;
}

interface CitationsSectionProps {
  citations: Citation[];
}

export default function CitationsSection({ citations }: CitationsSectionProps) {
  const { t } = useTranslation();
  
  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {t('citations.title') || 'Manbalar'}
        </span>
      </div>
      <div className="space-y-1.5">
        {citations.map((citation, idx) => (
          <a
            key={idx}
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors group"
          >
            <span className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
              {idx + 1}
            </span>
            <img 
              src={`https://www.google.com/s2/favicons?domain=${new URL(citation.url).hostname}&sz=32`}
              alt=""
              className="w-4 h-4 rounded shrink-0"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <span className="truncate flex-1">{citation.title || citation.url}</span>
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}

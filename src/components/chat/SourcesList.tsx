import { memo, useState } from "react";
import { ExternalLink, Globe } from "lucide-react";
import { Citation } from "@/types/chat";
import { InAppBrowserModal } from "./InAppBrowserModal";
import { useTranslation } from "@/i18n/LanguageProvider";

interface SourcesListProps {
  citations: Citation[];
}

// Extract domain from URL
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

// Get favicon URL from domain
function getFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return "";
  }
}

// Validate URL is safe (http/https only)
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

function SourcesListComponent({ citations }: SourcesListProps) {
  const { t } = useTranslation();
  const [selectedUrl, setSelectedUrl] = useState<{ url: string; title: string } | null>(null);

  if (!citations || citations.length === 0) {
    return null;
  }

  // Filter to only valid URLs
  const validCitations = citations.filter((c) => isValidUrl(c.url));
  if (validCitations.length === 0) {
    return null;
  }

  const handleSourceClick = (citation: Citation) => {
    if (isValidUrl(citation.url)) {
      setSelectedUrl({ url: citation.url, title: citation.title });
    }
  };

  return (
    <>
      <div id="sources-section" className="mt-4 pt-3 border-t border-border/30">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("sources")}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {validCitations.map((citation, idx) => (
            <button
              key={`${citation.url}-${idx}`}
              onClick={() => handleSourceClick(citation)}
              className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 hover:bg-secondary/80 border border-border/30 hover:border-border/50 transition-all text-left max-w-[280px]"
            >
              {/* Favicon */}
              <img
                src={citation.favicon || getFaviconUrl(citation.url)}
                alt=""
                className="w-4 h-4 rounded-sm flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              
              <div className="min-w-0 flex-1">
                {/* Title */}
                <p className="text-sm font-medium text-foreground truncate leading-tight">
                  {citation.title || getDomain(citation.url)}
                </p>
                {/* Domain */}
                <p className="text-xs text-muted-foreground truncate">
                  {getDomain(citation.url)}
                </p>
              </div>
              
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* In-App Browser Modal */}
      <InAppBrowserModal
        url={selectedUrl?.url || ""}
        title={selectedUrl?.title}
        open={!!selectedUrl}
        onClose={() => setSelectedUrl(null)}
      />
    </>
  );
}

export const SourcesList = memo(SourcesListComponent);

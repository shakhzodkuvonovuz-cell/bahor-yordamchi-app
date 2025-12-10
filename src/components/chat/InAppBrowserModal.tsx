import { useState, useEffect, memo } from "react";
import { X, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageProvider";

interface InAppBrowserModalProps {
  url: string;
  title?: string;
  open: boolean;
  onClose: () => void;
}

// Extract domain from URL for display
function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function InAppBrowserModalComponent({ url, title, open, onClose }: InAppBrowserModalProps) {
  const { t } = useTranslation();
  const [iframeError, setIframeError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset state when URL changes
  useEffect(() => {
    if (open && url) {
      setIframeError(false);
      setIsLoading(true);
    }
  }, [url, open]);

  const handleOpenExternal = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIframeError(true);
    setIsLoading(false);
  };

  if (!url) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] sm:h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-secondary/30 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {title || getDomain(url)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {getDomain(url)}
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenExternal}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">{t("openExternal")}</span>
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative bg-background overflow-hidden">
          {/* Loading State */}
          {isLoading && !iframeError && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="text-sm">{t("loading")}</span>
              </div>
            </div>
          )}

          {/* Error/Blocked State */}
          {iframeError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-4 text-center px-6 max-w-md">
                <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {t("previewNotAvailable")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("previewBlockedMessage")}
                  </p>
                </div>
                <Button onClick={handleOpenExternal} className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  {t("openInBrowser")}
                </Button>
              </div>
            </div>
          ) : (
            /* Iframe */
            <iframe
              src={url}
              title={title || getDomain(url)}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const InAppBrowserModal = memo(InAppBrowserModalComponent);

import { useState, useEffect } from "react";
import { X, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface InAppBrowserProps {
  url: string | null;
  title?: string;
  onClose: () => void;
}

export function InAppBrowser({ url, title, onClose }: InAppBrowserProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (url) {
      setIsLoading(true);
      setHasError(false);
      
      // Set a timeout for loading - if iframe doesn't load in 8 seconds, show error
      const timeout = setTimeout(() => {
        setIsLoading(false);
        setHasError(true);
      }, 8000);

      return () => clearTimeout(timeout);
    }
  }, [url]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleOpenExternal = () => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      onClose();
    }
  };

  if (!url) return null;

  const displayUrl = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  return (
    <Dialog open={!!url} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-4 py-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <DialogTitle className="text-sm truncate">
                {title || displayUrl}
              </DialogTitle>
              <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                {displayUrl}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={handleOpenExternal}
              >
                <ExternalLink className="h-3 w-3" />
                <span className="hidden sm:inline">Tashqarida ochish</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 relative overflow-hidden">
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
              </div>
            </div>
          )}

          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center space-y-4 p-6">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <RefreshCw className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Sahifa yuklanmadi</p>
                  <p className="text-xs text-muted-foreground">
                    Ba'zi saytlar iframe-da ochilmaydi
                  </p>
                </div>
                <Button onClick={handleOpenExternal} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Tashqarida ochish
                </Button>
              </div>
            </div>
          )}

          <iframe
            src={url}
            className="w-full h-full border-0"
            onLoad={handleIframeLoad}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            referrerPolicy="no-referrer"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

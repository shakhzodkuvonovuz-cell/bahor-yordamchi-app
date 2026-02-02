import { ExternalLink, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface YouTubeResourceProps {
  videoId: string;
  title: string;
  description?: string;
  thumbnail?: string;
  timestamp?: string; // Optional video timestamp reference (e.g., "2:30")
  className?: string;
}

export function YouTubeResource({
  videoId,
  title,
  description,
  thumbnail,
  timestamp,
  className,
}: YouTubeResourceProps) {
  // Convert timestamp like "2:30" to seconds for embed
  const getSecondsFromTimestamp = (ts?: string): number | null => {
    if (!ts) return null;
    const parts = ts.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  };

  const seconds = getSecondsFromTimestamp(timestamp);
  const youtubeUrl = seconds 
    ? `https://www.youtube.com/watch?v=${videoId}&t=${seconds}`
    : `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = seconds
    ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&start=${seconds}`
    : `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden border border-border bg-card shadow-md",
        "transition-shadow hover:shadow-lg",
        "w-full max-w-full", // Full width on mobile
        className
      )}
    >
      {/* Video Embed Container - Responsive */}
      <div className="relative aspect-video bg-muted w-full">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          loading="lazy"
        />
      </div>

      {/* Content - Mobile optimized */}
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {/* Title */}
        <h4 className="font-semibold text-foreground line-clamp-2 leading-tight text-sm sm:text-base">
          {title}
        </h4>

        {/* Timestamp reference */}
        {timestamp && (
          <p className="text-xs text-muted-foreground italic">
            📺 Videoning {timestamp}-daqiqasidan boshlang
          </p>
        )}

        {/* Description */}
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}

        {/* Action Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs sm:text-sm"
          onClick={() => window.open(youtubeUrl, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
          Darslikni ko'rish
        </Button>
      </div>
    </div>
  );
}

// Compact version for inline display
export function YouTubeResourceCompact({
  videoId,
  title,
  thumbnail,
  className,
}: Omit<YouTubeResourceProps, 'description' | 'timestamp'>) {
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const defaultThumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

  return (
    <a
      href={youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2 sm:gap-3 p-2 rounded-lg",
        "border border-border bg-card/50",
        "hover:bg-accent/50 transition-colors group",
        "w-full", // Full width on mobile
        className
      )}
    >
      {/* Thumbnail - Smaller on mobile */}
      <div className="relative w-20 h-12 sm:w-24 sm:h-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
        <img
          src={thumbnail || defaultThumbnail}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
          <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
        </div>
      </div>

      {/* Title */}
      <span className="flex-1 text-xs sm:text-sm font-medium text-foreground line-clamp-2">
        {title}
      </span>

      <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
    </a>
  );
}

export default YouTubeResource;

import { ExternalLink, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface YouTubeResourceProps {
  videoId: string;
  title: string;
  description?: string;
  thumbnail?: string;
  className?: string;
}

export function YouTubeResource({
  videoId,
  title,
  description,
  thumbnail,
  className,
}: YouTubeResourceProps) {
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
  const defaultThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden border border-border bg-card shadow-md",
        "transition-shadow hover:shadow-lg",
        className
      )}
    >
      {/* Video Embed Container */}
      <div className="relative aspect-video bg-muted">
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h4 className="font-semibold text-foreground line-clamp-2 leading-tight">
          {title}
        </h4>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}

        {/* Action Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => window.open(youtubeUrl, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="w-4 h-4" />
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
}: Omit<YouTubeResourceProps, 'description'>) {
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const defaultThumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

  return (
    <a
      href={youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 p-2 rounded-lg",
        "border border-border bg-card/50",
        "hover:bg-accent/50 transition-colors group",
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative w-24 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
        <img
          src={thumbnail || defaultThumbnail}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
          <Play className="w-6 h-6 text-white fill-white" />
        </div>
      </div>

      {/* Title */}
      <span className="flex-1 text-sm font-medium text-foreground line-clamp-2">
        {title}
      </span>

      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </a>
  );
}

export default YouTubeResource;

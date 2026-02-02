import { ExternalLink, Play, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LessonResource } from "@/contexts/LessonContext";

interface ResourceCardProps {
  resource: LessonResource;
  onClick?: () => void;
  className?: string;
}

export function ResourceCard({ resource, onClick, className }: ResourceCardProps) {
  const { type, title, url, thumbnail, description } = resource;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const IconComponent = type === 'youtube' 
    ? Play 
    : type === 'image' 
      ? ImageIcon 
      : LinkIcon;

  const typeLabel = type === 'youtube' 
    ? 'YouTube' 
    : type === 'image' 
      ? "Rasm" 
      : "Havola";

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-xl",
        "bg-card border border-border",
        "hover:bg-accent/50 hover:border-primary/20",
        "transition-all duration-200",
        "text-left group",
        className
      )}
    >
      {/* Thumbnail or Icon */}
      <div className="relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-muted">
        {thumbnail ? (
          <>
            <img 
              src={thumbnail} 
              alt={title}
              className="w-full h-full object-cover"
            />
            {type === 'youtube' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-8 h-8 rounded-full bg-primary/90 flex items-center justify-center">
                  <Play className="w-4 h-4 text-primary-foreground fill-current ml-0.5" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <IconComponent className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {description}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-xs text-muted-foreground">{typeLabel}</span>
          <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </button>
  );
}

export default ResourceCard;

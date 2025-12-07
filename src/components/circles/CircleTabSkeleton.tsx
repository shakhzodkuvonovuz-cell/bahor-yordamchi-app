import { Skeleton } from "@/components/ui/skeleton";

interface CircleTabSkeletonProps {
  type: "files" | "members" | "requests";
}

export function CircleTabSkeleton({ type }: CircleTabSkeletonProps) {
  if (type === "files") {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {/* Upload button skeleton */}
        <Skeleton className="h-10 w-32 rounded-lg" />
        
        {/* File items */}
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/50"
          >
            <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "members") {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-xl bg-card/50 border border-border/50"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "requests") {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-card/50 border border-border/50"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

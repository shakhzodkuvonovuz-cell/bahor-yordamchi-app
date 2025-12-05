import { Skeleton } from "@/components/ui/skeleton";

export function ModesSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8 text-center space-y-2">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>

        <div className="space-y-8">
          {/* Section 1 */}
          <div>
            <Skeleton className="h-5 w-36 mb-4" />
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-shrink-0 w-44">
                  <Skeleton className="h-32 rounded-2xl" />
                </div>
              ))}
            </div>
          </div>

          {/* Section 2 */}
          <div>
            <Skeleton className="h-5 w-40 mb-4" />
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-shrink-0 w-44">
                  <Skeleton className="h-32 rounded-2xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 flex justify-end">
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
        <Skeleton className="w-24 h-24 rounded-2xl mb-6" />
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-5 w-64 mb-8" />
        
        {/* Input skeleton */}
        <div className="w-full max-w-xl">
          <Skeleton className="h-14 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

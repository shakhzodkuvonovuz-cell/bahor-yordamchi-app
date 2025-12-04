import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsProfileSkeleton() {
  return (
    <div className="space-y-4">
      {/* Profile Card Skeleton */}
      <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-premium-sm">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shrink-0" />
          
          {/* Info */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          
          {/* Edit button */}
          <Skeleton className="h-9 w-9 sm:w-24 rounded-lg shrink-0" />
        </div>
      </div>

      {/* Usage Card Skeleton */}
      <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-premium-sm space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

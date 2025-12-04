import { Skeleton } from "@/components/ui/skeleton";

export function ChatListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between px-3 py-3 rounded-xl border border-transparent"
        >
          <div className="flex-1 pr-2 min-w-0">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function ChatMessagesSkeleton() {
  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* User message skeleton */}
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          <Skeleton className="h-16 w-64 rounded-2xl" />
        </div>
      </div>
      {/* Assistant message skeleton */}
      <div className="flex justify-start gap-3">
        <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
        <div className="flex-1 max-w-[80%]">
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
      {/* Another user message */}
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          <Skeleton className="h-12 w-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

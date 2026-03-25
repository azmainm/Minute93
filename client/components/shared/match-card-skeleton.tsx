import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MatchCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2.5">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-9 w-[60px] rounded-md" />
          <div className="flex flex-1 flex-row-reverse items-center gap-2.5">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

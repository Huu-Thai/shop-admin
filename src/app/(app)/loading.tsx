import { Skeleton } from '@/components/ui/feedback';

/** Page skeleton in the dashboard's shape — no layout shift when data arrives. */
export default function Loading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-[164px] rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[136px] rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Skeleton className="h-[400px] rounded-lg xl:col-span-2" />
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    </div>
  );
}

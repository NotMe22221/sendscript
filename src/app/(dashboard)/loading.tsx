import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return <div className="space-y-6"><div><Skeleton className="h-8 w-64" /><Skeleton className="mt-3 h-4 w-96 max-w-full" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-36" />)}</div><Skeleton className="h-[420px]" /></div>;
}

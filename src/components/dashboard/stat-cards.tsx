import { type GlobalStats } from "@/lib/stats/area-risk";

export function StatCards({ stats }: { stats: GlobalStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl border bg-card text-card-foreground shadow flex flex-col p-6">
        <div className="text-sm font-medium text-muted-foreground mb-2">Active Reports</div>
        <div className="text-3xl font-bold">{stats.totalActive}</div>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow flex flex-col p-6">
        <div className="text-sm font-medium text-muted-foreground mb-2">Cleared (Last 7 Days)</div>
        <div className="text-3xl font-bold">{stats.cleared7Days}</div>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow flex flex-col p-6">
        <div className="text-sm font-medium text-muted-foreground mb-2">Avg Resolution Time</div>
        <div className="text-3xl font-bold">{Math.round(stats.avgHoursToResolve)} hours</div>
      </div>
    </div>
  );
}

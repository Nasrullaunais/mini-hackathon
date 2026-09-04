import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getGlobalStats } from "@/lib/stats/area-risk";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stats = await getGlobalStats();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 p-6 py-12">
      <div className="space-y-4 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          DengueWatch
        </h1>
        <p className="text-xl text-muted-foreground">
          Community-driven dengue breeding-site reporting and response. Spot a risk, report it, and help public health teams take action.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto w-full">
        <div className="rounded-xl border bg-card text-card-foreground shadow flex flex-col p-6 text-center">
          <div className="text-3xl font-bold">{stats.totalActive}</div>
          <div className="text-sm text-muted-foreground mt-1">Active Reports</div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow flex flex-col p-6 text-center">
          <div className="text-3xl font-bold">{stats.cleared7Days}</div>
          <div className="text-sm text-muted-foreground mt-1">Cleared (Last 7 Days)</div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow flex flex-col p-6 text-center">
          <div className="text-3xl font-bold">{Math.round(stats.avgHoursToResolve)}h</div>
          <div className="text-sm text-muted-foreground mt-1">Avg Resolution Time</div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full pt-8 border-t">
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold text-lg">Citizens</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Help your community by reporting stagnant water and blocked drains.
          </p>
          <Button asChild className="w-full">
            <Link href="/report">Report a site</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/reports">Browse reports</Link>
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-semibold text-lg">PHI Officers</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Review incoming reports, assign risk levels, and dispatch teams to critical areas.
          </p>
          <Button asChild className="w-full">
            <Link href="/staff">Triage Queue</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/dashboard">View Dashboard</Link>
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
          <h2 className="font-semibold text-lg">Field Crews</h2>
          <p className="text-sm text-muted-foreground mb-2">
            See your dispatched jobs, resolve them on the ground, and close the loop.
          </p>
          <Button asChild className="w-full">
            <Link href="/team">My Team&apos;s Jobs</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

import { getAreaRisks, getTeamWorkloads, getGlobalStats } from "@/lib/stats/area-risk";
import { AreaRiskTable } from "@/components/dashboard/area-risk-table";
import { TeamWorkload } from "@/components/dashboard/team-workload";
import { StatCards } from "@/components/dashboard/stat-cards";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, areaRisks, workloads] = await Promise.all([
    getGlobalStats(),
    getAreaRisks(),
    getTeamWorkloads(),
  ]);

  return (
    <div className="container mx-auto max-w-5xl p-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of active reports, area risk scores, and team workload.
        </p>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-4">Current Status</h2>
        <StatCards stats={stats} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Area Risk Scores</h2>
        <AreaRiskTable areas={areaRisks} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Team Workload</h2>
        <TeamWorkload workloads={workloads} />
      </section>
    </div>
  );
}

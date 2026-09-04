import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { areas, reports, teams, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { TriageQueue, type TriageReport } from "@/components/staff/triage-queue";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const actor = await getCurrentUser();

  if (!actor || actor.role !== "officer") {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Officers only</EmptyTitle>
            <EmptyDescription>
              Sign in with a PHI officer account to see the triage queue.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    );
  }

  const [rows, activeTeams] = await Promise.all([
    db
      .select({ report: reports, areaName: areas.name, reporterName: users.name })
      .from(reports)
      .innerJoin(areas, eq(reports.areaId, areas.id))
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(inArray(reports.status, ["reported", "under_review", "dispatched"]))
      .orderBy(asc(reports.createdAt)),
    db
      .select({ id: teams.id, name: teams.name, type: teams.type })
      .from(teams)
      .where(eq(teams.active, true))
      .orderBy(asc(teams.name)),
  ]);

  const triageReports: TriageReport[] = rows.map(({ report, areaName, reporterName }) => ({
    ...report,
    areaName,
    reporterName,
  }));

  const byStatus = {
    reported: triageReports.filter((r) => r.status === "reported"),
    under_review: triageReports.filter((r) => r.status === "under_review"),
    dispatched: triageReports.filter((r) => r.status === "dispatched"),
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Triage queue</h1>
        <p className="text-muted-foreground text-sm">
          Assess incoming reports, dispatch a team, or reject what isn&apos;t a
          breeding site.
        </p>
      </div>

      <TriageQueue
        reported={byStatus.reported}
        underReview={byStatus.under_review}
        dispatched={byStatus.dispatched}
        teams={activeTeams}
      />
    </main>
  );
}

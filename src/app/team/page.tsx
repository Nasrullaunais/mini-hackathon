import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { areas, reports } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { SITE_TYPE_LABEL } from "@/lib/labels";
import { StatusBadge } from "@/components/reports/status-badge";
import { RiskBadge } from "@/components/reports/risk-badge";
import { ResolveDialog } from "@/components/staff/resolve-dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const actor = await getCurrentUser();

  if (!actor || actor.role !== "crew") {
    return (
      <main className="mx-auto w-full max-w-4xl p-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Field crew only</EmptyTitle>
            <EmptyDescription>
              Sign in with a field crew account to see your dispatched jobs.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    );
  }

  if (!actor.teamId) {
    return (
      <main className="mx-auto w-full max-w-4xl p-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Not assigned to a team</EmptyTitle>
            <EmptyDescription>
              Your account isn&apos;t linked to a field team yet.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    );
  }

  const rows = await db
    .select({ report: reports, areaName: areas.name })
    .from(reports)
    .innerJoin(areas, eq(reports.areaId, areas.id))
    .where(and(eq(reports.assignedTeamId, actor.teamId), eq(reports.status, "dispatched")))
    .orderBy(asc(reports.dispatchedAt));

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your jobs</h1>
        <p className="text-muted-foreground text-sm">
          Reports dispatched to your team. Resolve one once the site has been
          handled.
        </p>
      </div>

      {rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No open jobs</EmptyTitle>
            <EmptyDescription>
              Nothing is currently dispatched to your team.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {rows.map(({ report, areaName }) => (
            <Card key={report.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={report.status} />
                    <RiskBadge riskLevel={report.riskLevel} />
                  </div>
                  <Link
                    href={`/reports/${report.id}`}
                    className="font-medium hover:underline"
                  >
                    {report.addressLine}
                  </Link>
                  <p className="text-muted-foreground text-sm">
                    {SITE_TYPE_LABEL[report.siteType]} · {areaName}
                  </p>
                </div>
                <ResolveDialog reportId={report.id} addressLine={report.addressLine} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

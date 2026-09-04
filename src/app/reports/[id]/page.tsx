import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { db } from "@/db";
import { areas, reportEvents, reports, teams, users } from "@/db/schema";
import { reportIdSchema } from "@/lib/validations/reports";
import {
  ACTION_LABEL,
  RISK_LABEL,
  SITE_TYPE_LABEL,
  TEAM_TYPE_LABEL,
} from "@/lib/labels";
import { StatusBadge } from "@/components/reports/status-badge";
import { RiskBadge } from "@/components/reports/risk-badge";
import { ReportTimeline, type TimelineEntry } from "@/components/reports/report-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = reportIdSchema.safeParse(id);
  if (!parsedId.success) notFound();

  const rows = await db
    .select({
      report: reports,
      areaName: areas.name,
      reporterName: users.name,
      teamName: teams.name,
      teamType: teams.type,
    })
    .from(reports)
    .innerJoin(areas, eq(reports.areaId, areas.id))
    .innerJoin(users, eq(reports.reporterId, users.id))
    .leftJoin(teams, eq(reports.assignedTeamId, teams.id))
    .where(eq(reports.id, parsedId.data))
    .limit(1);

  const row = rows.at(0);
  if (!row) notFound();

  const { report, areaName, reporterName, teamName, teamType } = row;

  const eventRows = await db
    .select({ event: reportEvents, actorName: users.name })
    .from(reportEvents)
    .innerJoin(users, eq(reportEvents.actorId, users.id))
    .where(eq(reportEvents.reportId, report.id))
    .orderBy(asc(reportEvents.createdAt));

  const timeline: TimelineEntry[] = eventRows.map(({ event, actorName }) => ({
    id: event.id,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    note: event.note,
    createdAt: event.createdAt,
    actorName,
  }));

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <Link
        href="/reports"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        Back to reports
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{report.addressLine}</h1>
          <p className="text-muted-foreground text-sm">
            {SITE_TYPE_LABEL[report.siteType]} · {areaName}
          </p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={report.status} />
          <RiskBadge riskLevel={report.riskLevel} />
        </div>
      </div>

      {/* Most reports have no photo; a full aspect-video placeholder for them
          is a big grey nothing, so only reserve that space when there is one. */}
      {report.photoUrl ? (
        <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src={report.photoUrl}
            alt={report.addressLine}
            fill
            className="object-cover"
            sizes="768px"
          />
        </div>
      ) : (
        <div className="bg-muted text-muted-foreground rounded-lg px-4 py-6 text-center text-sm">
          No photo submitted
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{report.description}</p>
          {/* Fixed label column: an even 2-col split strands the value at the
              far side of a 768px card. */}
          <dl className="text-muted-foreground grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2">
            <dt>Reported by</dt>
            <dd className="text-foreground">{reporterName}</dd>
            {report.reportedSeverity && (
              <>
                <dt>Reporter&apos;s guess</dt>
                <dd className="text-foreground">{RISK_LABEL[report.reportedSeverity]}</dd>
              </>
            )}
            {teamName && (
              <>
                <dt>Assigned team</dt>
                <dd className="text-foreground">
                  {teamName}
                  {teamType ? ` (${TEAM_TYPE_LABEL[teamType]})` : ""}
                </dd>
              </>
            )}
            {report.actionTaken && (
              <>
                <dt>Action taken</dt>
                <dd className="text-foreground">{ACTION_LABEL[report.actionTaken]}</dd>
              </>
            )}
            {report.resolutionNotes && (
              <>
                <dt>Resolution notes</dt>
                <dd className="text-foreground">{report.resolutionNotes}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportTimeline events={timeline} />
        </CardContent>
      </Card>
    </main>
  );
}

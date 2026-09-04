import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { areas, reports, teams } from "@/db/schema";
import { reportFilterSchema } from "@/lib/validations/reports";
import { ReportCard, type ReportCardData } from "@/components/reports/report-card";
import { ReportFilters } from "@/components/reports/report-filters";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const filters = reportFilterSchema.parse({
    area: raw.area,
    status: raw.status,
    siteType: raw.siteType,
  });

  const conditions = [
    filters.area ? eq(reports.areaId, filters.area) : undefined,
    filters.status ? eq(reports.status, filters.status) : undefined,
    filters.siteType ? eq(reports.siteType, filters.siteType) : undefined,
  ].filter((condition) => condition !== undefined);

  const [rows, allAreas] = await Promise.all([
    db
      .select({ report: reports, areaName: areas.name, teamName: teams.name })
      .from(reports)
      .innerJoin(areas, eq(reports.areaId, areas.id))
      .leftJoin(teams, eq(reports.assignedTeamId, teams.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reports.createdAt)),
    db.select({ id: areas.id, name: areas.name }).from(areas).orderBy(areas.name),
  ]);

  const reportCards: ReportCardData[] = rows.map(({ report, areaName, teamName }) => ({
    ...report,
    areaName,
    teamName,
  }));

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm">
          Every breeding-site report from the community, and whether it&apos;s been handled.
        </p>
      </div>

      <ReportFilters
        areas={allAreas}
        area={filters.area}
        status={filters.status}
        siteType={filters.siteType}
      />

      {reportCards.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No reports match these filters</EmptyTitle>
            <EmptyDescription>
              Try clearing a filter, or check back later.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reportCards.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </main>
  );
}

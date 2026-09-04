import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { areas, reports, teams } from "@/db/schema";

export type AreaBand = "Danger zone" | "Watch" | "Normal";

export type AreaRiskRow = {
  areaId: string;
  areaName: string;
  district: string;
  active: number;
  cleared: number;
  score: number;
  band: AreaBand;
  hotspot: boolean;
};

function withBand(row: Omit<AreaRiskRow, "band" | "hotspot">): AreaRiskRow {
  let band: AreaBand = "Normal";
  if (row.score >= 8) band = "Danger zone";
  else if (row.score >= 4) band = "Watch";

  return {
    ...row,
    band,
    hotspot: row.active >= 3,
  };
}

export async function getAreaRisks(): Promise<AreaRiskRow[]> {
  const rows = await db
    .select({
      areaId: areas.id,
      areaName: areas.name,
      district: areas.district,
      active: sql<number>`count(${reports.id}) filter (
        where ${reports.status} in ('reported','under_review','dispatched'))`.mapWith(Number),
      cleared: sql<number>`count(${reports.id}) filter (
        where ${reports.status} = 'cleared')`.mapWith(Number),
      score: sql<number>`coalesce(sum(
        case when ${reports.status} in ('reported','under_review','dispatched')
          then case ${reports.riskLevel}
                 when 'high' then 3 when 'medium' then 2 else 1 end
          else 0 end), 0)`.mapWith(Number),
    })
    .from(areas)
    .leftJoin(reports, eq(reports.areaId, areas.id))
    .groupBy(areas.id, areas.name, areas.district);

  return rows.map(withBand).sort((a, b) => b.score - a.score);
}

export type TeamWorkloadRow = {
  teamName: string;
  type: string;
  openJobs: number;
};

export async function getTeamWorkloads(): Promise<TeamWorkloadRow[]> {
  const rows = await db
    .select({
      teamName: teams.name,
      type: teams.type,
      openJobs: sql<number>`count(${reports.id}) filter (
        where ${reports.status} = 'dispatched')`.mapWith(Number),
    })
    .from(teams)
    .leftJoin(reports, eq(reports.assignedTeamId, teams.id))
    .groupBy(teams.id, teams.name, teams.type);

  return rows.sort((a, b) => b.openJobs - a.openJobs);
}

export type GlobalStats = {
  totalActive: number;
  cleared7Days: number;
  avgHoursToResolve: number;
};

export async function getGlobalStats(): Promise<GlobalStats> {
  const [row] = await db
    .select({
      totalActive: sql<number>`count(${reports.id}) filter (
        where ${reports.status} in ('reported','under_review','dispatched'))`.mapWith(Number),
      cleared7Days: sql<number>`count(${reports.id}) filter (
        where ${reports.status} = 'cleared' and ${reports.resolvedAt} >= now() - interval '7 days')`.mapWith(Number),
      avgHoursToResolve: sql<number>`coalesce(avg(extract(epoch from (${reports.resolvedAt} - ${reports.createdAt})) / 3600) filter (where ${reports.status} = 'cleared'), 0)`.mapWith(Number),
    })
    .from(reports);
  
  return row;
}

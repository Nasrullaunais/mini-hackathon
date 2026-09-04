import { NextResponse } from "next/server";
import { getAreaRisks, getTeamWorkloads, getGlobalStats } from "@/lib/stats/area-risk";

export async function GET() {
  const stats = await getGlobalStats();
  const risks = await getAreaRisks();
  const workloads = await getTeamWorkloads();
  return NextResponse.json({ stats, risks, workloads });
}

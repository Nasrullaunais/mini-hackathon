import { getAreaRisks, getTeamWorkloads, getGlobalStats } from "./src/lib/stats/area-risk";

async function main() {
  const risks = await getAreaRisks();
  const workloads = await getTeamWorkloads();
  const stats = await getGlobalStats();

  console.log("Stats:", stats);
  console.log("Risks:");
  for (const risk of risks) {
    console.log(`  ${risk.areaName}: score=${risk.score}, band=${risk.band}, hotspot=${risk.hotspot}`);
  }
  console.log("Workloads:");
  for (const w of workloads) {
    console.log(`  ${w.teamName}: openJobs=${w.openJobs}`);
  }
}
main().catch(console.error).finally(() => process.exit(0));

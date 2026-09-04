import { randomUUID } from "node:crypto";
import { hashPassword } from "../lib/auth";
import { db } from "./client";
import {
  areas,
  items,
  reportEvents,
  reports,
  sessions,
  teams,
  users,
  type ActionTaken,
  type ReportStatus,
  type RiskLevel,
  type SiteType,
} from "./schema";

/**
 * DengueWatch demo data (DESIGN.md §12). Delete order: reportEvents -> reports
 * -> sessions -> users -> teams -> areas, then re-insert bottom-up.
 *
 * Every seeded user shares this password so it can go straight in the demo
 * README/video without hunting for it mid-take.
 */
const DEMO_PASSWORD = "dengue2026";

function daysAgo(n: number, hours = 0): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000 - hours * 60 * 60 * 1000);
}

/** One spec per report; buildReport() expands it into a row plus its timeline. */
interface ReportSpec {
  reporterId: string;
  areaId: string;
  addressLine: string;
  siteType: SiteType;
  description: string;
  reportedSeverity?: RiskLevel;
  reportedAt: Date;
  assessedBy?: string;
  assessedAt?: Date;
  riskLevel?: RiskLevel;
  assessNote?: string;
  dispatchedAt?: Date;
  assignedTeamId?: string;
  dispatchNote?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  actionTaken?: ActionTaken;
  resolutionNotes?: string;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectNote?: string;
}

function buildReport(spec: ReportSpec) {
  const id = randomUUID();

  let status: ReportStatus = "reported";
  let updatedAt = spec.reportedAt;
  if (spec.rejectedAt) {
    status = "rejected";
    updatedAt = spec.rejectedAt;
  } else if (spec.resolvedAt) {
    status = "cleared";
    updatedAt = spec.resolvedAt;
  } else if (spec.dispatchedAt) {
    status = "dispatched";
    updatedAt = spec.dispatchedAt;
  } else if (spec.assessedAt) {
    status = "under_review";
    updatedAt = spec.assessedAt;
  }

  const row = {
    id,
    reporterId: spec.reporterId,
    areaId: spec.areaId,
    addressLine: spec.addressLine,
    siteType: spec.siteType,
    description: spec.description,
    photoUrl: null,
    photoPathname: null,
    reportedSeverity: spec.reportedSeverity ?? null,
    status,
    riskLevel: spec.riskLevel ?? null,
    assignedTeamId: spec.assignedTeamId ?? null,
    dispatchedAt: spec.dispatchedAt ?? null,
    actionTaken: spec.actionTaken ?? null,
    resolutionNotes: spec.resolutionNotes ?? null,
    resolvedAt: spec.resolvedAt ?? null,
    createdAt: spec.reportedAt,
    updatedAt,
  };

  const events: (typeof reportEvents.$inferInsert)[] = [
    {
      reportId: id,
      actorId: spec.reporterId,
      fromStatus: null,
      toStatus: "reported",
      note: null,
      createdAt: spec.reportedAt,
      updatedAt: spec.reportedAt,
    },
  ];

  if (spec.assessedAt && spec.assessedBy) {
    events.push({
      reportId: id,
      actorId: spec.assessedBy,
      fromStatus: "reported",
      toStatus: "under_review",
      note: spec.assessNote ?? null,
      createdAt: spec.assessedAt,
      updatedAt: spec.assessedAt,
    });
  }

  if (spec.dispatchedAt && spec.assessedBy) {
    events.push({
      reportId: id,
      actorId: spec.assessedBy,
      fromStatus: "under_review",
      toStatus: "dispatched",
      note: spec.dispatchNote ?? null,
      createdAt: spec.dispatchedAt,
      updatedAt: spec.dispatchedAt,
    });
  }

  if (spec.resolvedAt && spec.resolvedBy) {
    events.push({
      reportId: id,
      actorId: spec.resolvedBy,
      fromStatus: "dispatched",
      toStatus: "cleared",
      note: spec.resolutionNotes ?? null,
      createdAt: spec.resolvedAt,
      updatedAt: spec.resolvedAt,
    });
  }

  if (spec.rejectedAt && spec.rejectedBy) {
    events.push({
      reportId: id,
      actorId: spec.rejectedBy,
      fromStatus: spec.assessedAt ? "under_review" : "reported",
      toStatus: "rejected",
      note: spec.rejectNote ?? null,
      createdAt: spec.rejectedAt,
      updatedAt: spec.rejectedAt,
    });
  }

  return { row, events };
}

async function main() {
  console.log("Clearing existing data...");
  await db.delete(reportEvents);
  await db.delete(reports);
  await db.delete(sessions);
  await db.delete(users);
  await db.delete(teams);
  await db.delete(areas);
  await db.delete(items);

  console.log("Seeding areas...");
  const areaIds = {
    narahenpita: randomUUID(),
    dehiwala: randomUUID(),
    maharagama: randomUUID(),
    kaduwela: randomUUID(),
    moratuwa: randomUUID(),
    negombo: randomUUID(),
    gampaha: randomUUID(),
    kandy: randomUUID(),
  };

  await db.insert(areas).values([
    { id: areaIds.narahenpita, name: "Narahenpita", district: "Colombo" },
    { id: areaIds.dehiwala, name: "Dehiwala", district: "Colombo" },
    { id: areaIds.maharagama, name: "Maharagama", district: "Colombo" },
    { id: areaIds.kaduwela, name: "Kaduwela", district: "Colombo" },
    { id: areaIds.moratuwa, name: "Moratuwa", district: "Colombo" },
    { id: areaIds.negombo, name: "Negombo", district: "Gampaha" },
    { id: areaIds.gampaha, name: "Gampaha", district: "Gampaha" },
    { id: areaIds.kandy, name: "Kandy", district: "Kandy" },
  ]);

  console.log("Seeding teams...");
  const teamIds = {
    fogging: randomUUID(),
    cleaning: randomUUID(),
    inspection: randomUUID(),
  };

  await db.insert(teams).values([
    {
      id: teamIds.fogging,
      name: "Fogging Unit A",
      type: "fogging",
      baseAreaId: areaIds.narahenpita,
    },
    {
      id: teamIds.cleaning,
      name: "Cleaning Crew 2",
      type: "cleaning",
      baseAreaId: areaIds.dehiwala,
    },
    {
      id: teamIds.inspection,
      name: "Inspection Team North",
      type: "inspection",
      baseAreaId: areaIds.gampaha,
    },
  ]);

  console.log("Hashing the shared demo password...");
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  console.log("Seeding users...");
  const citizenIds = {
    kasun: randomUUID(),
    nadeesha: randomUUID(),
    ruwan: randomUUID(),
    chamari: randomUUID(),
    dinesh: randomUUID(),
    anusha: randomUUID(),
  };
  const officerIds = {
    colombo: randomUUID(),
    gampaha: randomUUID(),
    kandy: randomUUID(),
  };
  const crewIds = {
    fogging: randomUUID(),
    cleaning: randomUUID(),
    inspection: randomUUID(),
  };

  await db.insert(users).values([
    // 6 citizens
    {
      id: citizenIds.kasun,
      name: "Kasun Perera",
      role: "citizen",
      phone: "0771000001",
      passwordHash,
      areaId: areaIds.narahenpita,
    },
    {
      id: citizenIds.nadeesha,
      name: "Nadeesha Fernando",
      role: "citizen",
      phone: "0771000002",
      passwordHash,
      areaId: areaIds.dehiwala,
    },
    {
      id: citizenIds.ruwan,
      name: "Ruwan Silva",
      role: "citizen",
      phone: "0771000003",
      passwordHash,
      areaId: areaIds.maharagama,
    },
    {
      id: citizenIds.chamari,
      name: "Chamari Jayasuriya",
      role: "citizen",
      phone: "0771000004",
      passwordHash,
      areaId: areaIds.kaduwela,
    },
    {
      id: citizenIds.dinesh,
      name: "Dinesh Wickramasinghe",
      role: "citizen",
      phone: "0771000005",
      passwordHash,
      areaId: areaIds.moratuwa,
    },
    {
      id: citizenIds.anusha,
      name: "Anusha Rathnayake",
      role: "citizen",
      phone: "0771000006",
      passwordHash,
      areaId: areaIds.negombo,
    },
    // 3 officers, one per district
    {
      id: officerIds.colombo,
      name: "Priyanka de Silva",
      role: "officer",
      phone: "0772000001",
      passwordHash,
      areaId: areaIds.narahenpita,
    },
    {
      id: officerIds.gampaha,
      name: "Sunil Bandara",
      role: "officer",
      phone: "0772000002",
      passwordHash,
      areaId: areaIds.gampaha,
    },
    {
      id: officerIds.kandy,
      name: "Malini Gunawardena",
      role: "officer",
      phone: "0772000003",
      passwordHash,
      areaId: areaIds.kandy,
    },
    // 3 crew, each carrying their team's id
    {
      id: crewIds.fogging,
      name: "Nimal Rajapaksa",
      role: "crew",
      phone: "0773000001",
      passwordHash,
      areaId: areaIds.narahenpita,
      teamId: teamIds.fogging,
    },
    {
      id: crewIds.cleaning,
      name: "Sanduni Wijesekara",
      role: "crew",
      phone: "0773000002",
      passwordHash,
      areaId: areaIds.dehiwala,
      teamId: teamIds.cleaning,
    },
    {
      id: crewIds.inspection,
      name: "Tharindu Karunaratne",
      role: "crew",
      phone: "0773000003",
      passwordHash,
      areaId: areaIds.gampaha,
      teamId: teamIds.inspection,
    },
  ]);

  console.log("Building 24 reports across 8 areas...");
  const specs: ReportSpec[] = [
    // --- Narahenpita: 5 active, two high -> Danger zone --------------------
    {
      reporterId: citizenIds.kasun,
      areaId: areaIds.narahenpita,
      addressLine: "Vacant plot behind St. Joseph's Church, Narahenpita",
      siteType: "stagnant_water",
      description:
        "Stagnant water collecting in an abandoned water tank on the vacant plot. Saw mosquito larvae swimming in it this morning.",
      reportedSeverity: "medium",
      reportedAt: daysAgo(1),
    },
    {
      reporterId: citizenIds.nadeesha,
      areaId: areaIds.narahenpita,
      addressLine: "Storm drain outside the old bus depot, Elvitigala Mawatha",
      siteType: "blocked_drain",
      description:
        "The drain has been blocked with rubbish for over a week and water is pooling along the road edge, right next to a school.",
      reportedSeverity: "high",
      reportedAt: daysAgo(6),
      assessedBy: officerIds.colombo,
      assessedAt: daysAgo(4),
      riskLevel: "high",
      assessNote: "Confirmed heavy larvae presence, flagged high risk.",
    },
    {
      reporterId: citizenIds.ruwan,
      areaId: areaIds.narahenpita,
      addressLine: "Halted construction site next to Narahenpita railway crossing",
      siteType: "construction_site",
      description:
        "Concrete mixing pits have filled with rainwater and have not been drained in weeks. Site looks abandoned.",
      reportedSeverity: "high",
      reportedAt: daysAgo(5),
      assessedBy: officerIds.colombo,
      assessedAt: daysAgo(3),
      riskLevel: "high",
      assessNote: "Multiple uncovered pits, clear breeding risk.",
    },
    {
      reporterId: citizenIds.chamari,
      areaId: areaIds.narahenpita,
      addressLine: "Rubbish collection point behind the Narahenpita market",
      siteType: "garbage_pile",
      description:
        "Discarded tyres and food containers are holding water after the rain. Flies and mosquitoes swarming the pile.",
      reportedSeverity: "medium",
      reportedAt: daysAgo(4),
      assessedBy: officerIds.colombo,
      assessedAt: daysAgo(3),
      riskLevel: "medium",
      dispatchedAt: daysAgo(2),
      assignedTeamId: teamIds.fogging,
      dispatchNote: "Sending Fogging Unit A.",
    },
    {
      reporterId: citizenIds.dinesh,
      areaId: areaIds.narahenpita,
      addressLine: "Roadside gutter near Narahenpita Junction",
      siteType: "other",
      description:
        "Shallow gutter water sitting stagnant for several days near the junction, minor larvae spotted.",
      reportedSeverity: "low",
      reportedAt: daysAgo(3),
      assessedBy: officerIds.colombo,
      assessedAt: daysAgo(2),
      riskLevel: "low",
      dispatchedAt: daysAgo(1),
      assignedTeamId: teamIds.fogging,
    },

    // --- Dehiwala: 3 active -> Watch + hotspot ------------------------------
    {
      reporterId: citizenIds.nadeesha,
      areaId: areaIds.dehiwala,
      addressLine: "Empty lot beside the Dehiwala fish market",
      siteType: "garbage_pile",
      description:
        "Piles of discarded coconut shells and containers holding rainwater right beside the market entrance.",
      reportedAt: daysAgo(2),
    },
    {
      reporterId: citizenIds.kasun,
      areaId: areaIds.dehiwala,
      addressLine: "Backyard pond area, Hill Street, Dehiwala",
      siteType: "stagnant_water",
      description:
        "An ornamental pond behind an abandoned house has turned green and stagnant, with visible larvae.",
      reportedSeverity: "medium",
      reportedAt: daysAgo(5),
      assessedBy: officerIds.colombo,
      assessedAt: daysAgo(3),
      riskLevel: "medium",
    },
    {
      reporterId: citizenIds.anusha,
      areaId: areaIds.dehiwala,
      addressLine: "Blocked roadside drain near Dehiwala zoo entrance",
      siteType: "blocked_drain",
      description:
        "Drain has overflowed after recent rains and water has been sitting for four days near the bus stop.",
      reportedSeverity: "medium",
      reportedAt: daysAgo(4),
      assessedBy: officerIds.colombo,
      assessedAt: daysAgo(3),
      riskLevel: "medium",
      dispatchedAt: daysAgo(2),
      assignedTeamId: teamIds.cleaning,
      dispatchNote: "Cleaning Crew 2 dispatched.",
    },

    // --- Kandy: 1 cleared, 0 active -> proves clearing lowers the score -----
    {
      reporterId: citizenIds.ruwan,
      areaId: areaIds.kandy,
      addressLine: "Riverside path near Kandy lake",
      siteType: "other",
      description:
        "Small puddle of water on the riverside path that looked suspicious after the rain, wanted it checked.",
      reportedSeverity: "medium",
      reportedAt: daysAgo(9),
      assessedBy: officerIds.kandy,
      assessedAt: daysAgo(8),
      riskLevel: "medium",
      dispatchedAt: daysAgo(7),
      assignedTeamId: teamIds.inspection,
      dispatchNote: "Sending Inspection Team North to verify.",
      resolvedBy: crewIds.inspection,
      resolvedAt: daysAgo(6),
      actionTaken: "no_action_needed",
      resolutionNotes:
        "Inspected the site; the reported puddle had already dried out naturally. No further action required.",
    },

    // --- Gampaha: 0 reports -> proves the empty row renders (no entries) ---

    // --- Maharagama: 4 ------------------------------------------------------
    {
      reporterId: citizenIds.ruwan,
      areaId: areaIds.maharagama,
      addressLine: "Roadside dump near Maharagama town hall",
      siteType: "garbage_pile",
      description:
        "A pile of discarded tyres and buckets collecting rainwater has been sitting untouched for over a week.",
      reportedAt: daysAgo(1),
    },
    {
      reporterId: citizenIds.chamari,
      areaId: areaIds.maharagama,
      addressLine: "Unused well behind a boutique on High Level Road, Maharagama",
      siteType: "stagnant_water",
      description:
        "An old well with a broken cover has rainwater sitting in it, mosquitoes seen flying around the opening.",
      reportedSeverity: "low",
      reportedAt: daysAgo(4),
      assessedBy: officerIds.colombo,
      assessedAt: daysAgo(2),
      riskLevel: "low",
    },
    {
      reporterId: citizenIds.dinesh,
      areaId: areaIds.maharagama,
      addressLine: "Drain outside Maharagama railway station",
      siteType: "blocked_drain",
      description:
        "The drain outside the station entrance has been blocked with debris and is now overflowing onto the pavement.",
      reportedSeverity: "medium",
      reportedAt: daysAgo(5),
      assessedBy: officerIds.colombo,
      assessedAt: daysAgo(4),
      riskLevel: "medium",
      dispatchedAt: daysAgo(3),
      assignedTeamId: teamIds.cleaning,
    },
    {
      reporterId: citizenIds.anusha,
      areaId: areaIds.maharagama,
      addressLine: "Empty field off Highfield Road, Maharagama",
      siteType: "other",
      description:
        "Reported what looked like standing water but it turned out to be a tarpaulin catching rain, not a breeding risk.",
      reportedAt: daysAgo(6),
      rejectedBy: officerIds.colombo,
      rejectedAt: daysAgo(5),
      rejectNote:
        "Not a breeding site -- tarpaulin, not standing water. Closing as false alarm.",
    },

    // --- Kaduwela: 4 ---------------------------------------------------------
    {
      reporterId: citizenIds.kasun,
      areaId: areaIds.kaduwela,
      addressLine: "Paddy field drainage canal, Kaduwela",
      siteType: "stagnant_water",
      description:
        "Drainage canal beside the paddy field has stopped flowing and is now stagnant with visible larvae.",
      reportedAt: daysAgo(2),
    },
    {
      reporterId: citizenIds.nadeesha,
      areaId: areaIds.kaduwela,
      addressLine: "Half-built apartment site off Kaduwela-Malabe Road",
      siteType: "construction_site",
      description:
        "Several open pits at the construction site are filled with rainwater and have been left uncovered for weeks.",
      reportedSeverity: "high",
      reportedAt: daysAgo(7),
      assessedBy: officerIds.colombo,
      assessedAt: daysAgo(5),
      riskLevel: "high",
    },
    {
      reporterId: citizenIds.ruwan,
      areaId: areaIds.kaduwela,
      addressLine: "Roadside construction yard, Kaduwela town",
      siteType: "construction_site",
      description:
        "Construction yard has multiple containers and pits holding water, heavy larvae presence reported by neighbours.",
      reportedSeverity: "high",
      reportedAt: daysAgo(9),
      assessedBy: officerIds.colombo,
      assessedAt: daysAgo(8),
      riskLevel: "high",
      dispatchedAt: daysAgo(7),
      assignedTeamId: teamIds.fogging,
      resolvedBy: crewIds.fogging,
      resolvedAt: daysAgo(5),
      actionTaken: "fogged",
      resolutionNotes:
        "Fogged the entire construction perimeter and drained the standing pits.",
    },
    {
      reporterId: citizenIds.chamari,
      areaId: areaIds.kaduwela,
      addressLine: "Vacant house compound, Kaduwela",
      siteType: "other",
      description:
        "Reported an overgrown compound suspected of holding water but inspection found it dry.",
      reportedAt: daysAgo(3),
      rejectedBy: officerIds.colombo,
      rejectedAt: daysAgo(2),
      rejectNote: "Site inspected on the way to another job -- dry, no action needed.",
    },

    // --- Moratuwa: 3 ---------------------------------------------------------
    {
      reporterId: citizenIds.dinesh,
      areaId: areaIds.moratuwa,
      addressLine: "Storm drain near Moratuwa University junction",
      siteType: "blocked_drain",
      description:
        "Storm drain has been overflowing for several days after the recent rains, water pooling onto the road.",
      reportedAt: daysAgo(1),
    },
    {
      reporterId: citizenIds.anusha,
      areaId: areaIds.moratuwa,
      addressLine: "Rubbish collection point, Moratuwa fish market",
      siteType: "garbage_pile",
      description:
        "Discarded polythene and containers near the fish market are collecting rainwater and breeding mosquitoes.",
      reportedSeverity: "low",
      reportedAt: daysAgo(4),
      assessedBy: officerIds.colombo,
      assessedAt: daysAgo(3),
      riskLevel: "low",
      dispatchedAt: daysAgo(2),
      assignedTeamId: teamIds.cleaning,
    },
    {
      reporterId: citizenIds.kasun,
      areaId: areaIds.moratuwa,
      addressLine: "Drain beside Moratuwa bus stand",
      siteType: "blocked_drain",
      description:
        "Drain next to the bus stand has been blocked for over a week, water pooling and attracting mosquitoes.",
      reportedSeverity: "medium",
      reportedAt: daysAgo(8),
      assessedBy: officerIds.colombo,
      assessedAt: daysAgo(7),
      riskLevel: "medium",
      dispatchedAt: daysAgo(6),
      assignedTeamId: teamIds.cleaning,
      resolvedBy: crewIds.cleaning,
      resolvedAt: daysAgo(4),
      actionTaken: "debris_removed",
      resolutionNotes: "Cleared the blocked drain and removed the accumulated debris.",
    },

    // --- Negombo: 4 -----------------------------------------------------------
    {
      reporterId: citizenIds.anusha,
      areaId: areaIds.negombo,
      addressLine: "Canal-side path near Negombo lagoon",
      siteType: "stagnant_water",
      description:
        "Stagnant pool of water has formed beside the canal path after recent rains, larvae visible near the edges.",
      reportedAt: daysAgo(2),
    },
    {
      reporterId: citizenIds.nadeesha,
      areaId: areaIds.negombo,
      addressLine: "Market waste collection point, Negombo town",
      siteType: "garbage_pile",
      description:
        "Discarded fruit crates and containers at the market waste point are holding rainwater.",
      reportedSeverity: "medium",
      reportedAt: daysAgo(5),
      assessedBy: officerIds.gampaha,
      assessedAt: daysAgo(3),
      riskLevel: "medium",
    },
    {
      reporterId: citizenIds.ruwan,
      areaId: areaIds.negombo,
      addressLine: "Beachside resort construction site, Negombo",
      siteType: "construction_site",
      description:
        "Large open pits at the resort construction site are filled with water and heavy larvae activity was reported by workers.",
      reportedSeverity: "high",
      reportedAt: daysAgo(6),
      assessedBy: officerIds.gampaha,
      assessedAt: daysAgo(5),
      riskLevel: "high",
      dispatchedAt: daysAgo(4),
      assignedTeamId: teamIds.fogging,
    },
    {
      reporterId: citizenIds.chamari,
      areaId: areaIds.negombo,
      addressLine: "Backyard water storage barrels, Negombo",
      siteType: "other",
      description:
        "Several uncovered water storage barrels behind a row of houses were found breeding mosquitoes.",
      reportedSeverity: "medium",
      reportedAt: daysAgo(9),
      assessedBy: officerIds.gampaha,
      assessedAt: daysAgo(8),
      riskLevel: "medium",
      dispatchedAt: daysAgo(7),
      assignedTeamId: teamIds.fogging,
      resolvedBy: crewIds.fogging,
      resolvedAt: daysAgo(5),
      actionTaken: "fogged",
      resolutionNotes:
        "Fogged the affected area and advised residents to cover water containers.",
    },
  ];

  const built = specs.map(buildReport);

  await db.insert(reports).values(built.map((b) => b.row));
  await db.insert(reportEvents).values(built.flatMap((b) => b.events));

  console.log("Seeding items reference table...");
  await db.insert(items).values([
    { title: "Read the GUIDELINES.md", description: "Before writing any code.", done: true },
    { title: "Pick the topic", description: "Agree as a team, write it in the README." },
    { title: "Model the schema", description: "One person owns src/db/schema.ts." },
  ]);

  console.log(`Seeded 8 areas, 3 teams, 12 users, ${built.length} reports.`);
  console.log(`Demo password for every seeded account: ${DEMO_PASSWORD}`);
  console.log("Officers: 0772000001 (Colombo), 0772000002 (Gampaha), 0772000003 (Kandy)");
  console.log("Crew: 0773000001 (Fogging), 0773000002 (Cleaning), 0773000003 (Inspection)");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

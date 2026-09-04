"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reports, reportEvents, type Report, type ReportStatus } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import {
  assessSchema,
  dispatchSchema,
  rejectSchema,
  resolveSchema,
} from "@/lib/validations/reports";
import { actionError, actionSuccess, parseForm, type ActionState } from "@/lib/form";

/**
 * DESIGN.md §7: reported -> under_review|rejected -> dispatched|rejected ->
 * cleared. cleared and rejected are terminal.
 */
const ALLOWED: Record<ReportStatus, ReportStatus[]> = {
  reported: ["under_review", "rejected"],
  under_review: ["dispatched", "rejected"],
  dispatched: ["cleared"],
  cleared: [],
  rejected: [],
};

function transitionError(current: ReportStatus): string {
  switch (current) {
    case "cleared":
      return "This report has already been cleared";
    case "rejected":
      return "This report has already been rejected";
    case "dispatched":
      return "This report has already been dispatched";
    case "under_review":
      return "This report has already been reviewed";
    case "reported":
      return "This report has not been reviewed yet";
  }
}

async function loadReport(id: string): Promise<Report | null> {
  const rows = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  return rows.at(0) ?? null;
}

function revalidateReportPaths(): void {
  revalidatePath("/staff");
  revalidatePath("/team");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  revalidatePath("/");
  revalidatePath("/reports/[id]", "page");
}

export async function assessReport(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(assessSchema, formData);
  if (!parsed.ok) return parsed.state;

  const actor = await getCurrentUser();
  if (!actor || actor.role !== "officer") {
    return actionError("Only a PHI officer can assess reports");
  }

  const report = await loadReport(parsed.data.id);
  if (!report) return actionError("That report no longer exists");
  if (!ALLOWED[report.status].includes("under_review")) {
    return actionError(transitionError(report.status));
  }

  await db.transaction(async (tx) => {
    await tx
      .update(reports)
      .set({
        status: "under_review",
        riskLevel: parsed.data.riskLevel,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, report.id));

    await tx.insert(reportEvents).values({
      reportId: report.id,
      actorId: actor.id,
      fromStatus: report.status,
      toStatus: "under_review",
      note: parsed.data.note,
    });
  });

  revalidateReportPaths();
  return actionSuccess(undefined, "Report assessed");
}

export async function dispatchTeam(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(dispatchSchema, formData);
  if (!parsed.ok) return parsed.state;

  const actor = await getCurrentUser();
  if (!actor || actor.role !== "officer") {
    return actionError("Only a PHI officer can dispatch a team");
  }

  const report = await loadReport(parsed.data.id);
  if (!report) return actionError("That report no longer exists");
  if (!ALLOWED[report.status].includes("dispatched")) {
    return actionError(transitionError(report.status));
  }

  await db.transaction(async (tx) => {
    await tx
      .update(reports)
      .set({
        status: "dispatched",
        assignedTeamId: parsed.data.assignedTeamId,
        dispatchedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reports.id, report.id));

    await tx.insert(reportEvents).values({
      reportId: report.id,
      actorId: actor.id,
      fromStatus: report.status,
      toStatus: "dispatched",
      note: parsed.data.note,
    });
  });

  revalidateReportPaths();
  return actionSuccess(undefined, "Team dispatched");
}

export async function rejectReport(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(rejectSchema, formData);
  if (!parsed.ok) return parsed.state;

  const actor = await getCurrentUser();
  if (!actor || actor.role !== "officer") {
    return actionError("Only a PHI officer can reject reports");
  }

  const report = await loadReport(parsed.data.id);
  if (!report) return actionError("That report no longer exists");
  if (!ALLOWED[report.status].includes("rejected")) {
    return actionError(transitionError(report.status));
  }

  await db.transaction(async (tx) => {
    await tx
      .update(reports)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(reports.id, report.id));

    await tx.insert(reportEvents).values({
      reportId: report.id,
      actorId: actor.id,
      fromStatus: report.status,
      toStatus: "rejected",
      note: parsed.data.note,
    });
  });

  revalidateReportPaths();
  return actionSuccess(undefined, "Report rejected");
}

export async function resolveReport(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(resolveSchema, formData);
  if (!parsed.ok) return parsed.state;

  const actor = await getCurrentUser();
  if (!actor || actor.role !== "crew") {
    return actionError("Only a field crew can resolve a job");
  }

  const report = await loadReport(parsed.data.id);
  if (!report) return actionError("That report no longer exists");
  if (!ALLOWED[report.status].includes("cleared")) {
    return actionError(transitionError(report.status));
  }
  if (report.assignedTeamId !== actor.teamId) {
    return actionError("That job is assigned to another team");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(reports)
      .set({
        status: "cleared",
        actionTaken: parsed.data.actionTaken,
        resolutionNotes: parsed.data.resolutionNotes,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reports.id, report.id));

    await tx.insert(reportEvents).values({
      reportId: report.id,
      actorId: actor.id,
      fromStatus: report.status,
      toStatus: "cleared",
      note: parsed.data.resolutionNotes,
    });
  });

  revalidateReportPaths();
  return actionSuccess(undefined, "Job resolved");
}

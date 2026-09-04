"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { reports, reportEvents } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { reportFormSchema } from "@/lib/validations/reports";
import { actionError, actionSuccess, parseForm, type ActionState } from "@/lib/form";

export async function createReport(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(reportFormSchema, formData);
  if (!parsed.ok) return parsed.state;

  const actor = await getCurrentUser();
  if (!actor) {
    return actionError("Sign in to submit a report");
  }

  const { photo, ...values } = parsed.data;

  let photoUrl: string | null = null;
  let photoPathname: string | null = null;

  if (photo) {
    const blob = await put(`reports/${crypto.randomUUID()}-${photo.name}`, photo, {
      access: "public",
      contentType: photo.type,
    });
    photoUrl = blob.url;
    photoPathname = blob.pathname;
  }

  await db.transaction(async (tx) => {
    const [report] = await tx
      .insert(reports)
      .values({ ...values, reporterId: actor.id, photoUrl, photoPathname })
      .returning({ id: reports.id });

    await tx.insert(reportEvents).values({
      reportId: report.id,
      actorId: actor.id,
      fromStatus: null,
      toStatus: "reported",
      note: null,
    });
  });

  revalidatePath("/");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  return actionSuccess(undefined, "Report submitted");
}

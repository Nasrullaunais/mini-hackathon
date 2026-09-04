import { z } from "zod";

/**
 * Shared shape returned by every server action. Actions never throw at the UI --
 * they return one of these so the form can render the message inline.
 */
export type ActionState<T = undefined> = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Keyed by form field name, e.g. { title: ["Title is required"] }. */
  fieldErrors?: Record<string, string[] | undefined>;
  data?: T;
};

export const idleState: ActionState = { status: "idle" };

export function actionError<T = never>(
  message: string,
  fieldErrors?: Record<string, string[] | undefined>,
  data?: T,
): ActionState<T> {
  return { status: "error", message, fieldErrors, data };
}

export function actionSuccess<T>(data?: T, message?: string): ActionState<T> {
  return { status: "success", data, message };
}

/** FormData -> plain object, collapsing repeated keys into arrays. */
function toObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    // Next.js injects its own action fields; they are never part of the schema.
    if (key.startsWith("$ACTION")) continue;

    const existing = result[key];
    if (existing === undefined) {
      result[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      result[key] = [existing, value];
    }
  }

  return result;
}

/**
 * Validate a submitted form against a Zod schema.
 *
 * Returns a discriminated union so the caller is forced to handle failure:
 *
 *   const parsed = parseForm(itemFormSchema, formData);
 *   if (!parsed.ok) return parsed.state;
 *   // parsed.data is fully typed here
 */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
):
  | { ok: true; data: z.output<S> }
  | { ok: false; state: ActionState<never> } {
  const result = schema.safeParse(toObject(formData));

  if (result.success) {
    return { ok: true, data: result.data };
  }

  const flattened = z.flattenError(result.error);
  const fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;
  // .at() is typed as `T | undefined`, unlike [0] -- keeps the ?? chain honest.
  const firstMessage =
    Object.values(fieldErrors).flat().at(0) ??
    flattened.formErrors.at(0) ??
    "Please check the form and try again.";

  return { ok: false, state: actionError(firstMessage, fieldErrors) };
}

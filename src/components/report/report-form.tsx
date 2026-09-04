"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createReport } from "@/lib/actions/reports";
import { idleState } from "@/lib/form";
import { SITE_TYPE_LABEL, RISK_LABEL } from "@/lib/labels";
import { SITE_TYPES, RISK_LEVELS } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AreaOption {
  id: string;
  name: string;
  district: string;
}

export function ReportForm({ areas }: { areas: AreaOption[] }) {
  const [state, formAction, isPending] = useActionState(createReport, idleState);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Report submitted");
      router.push("/reports");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} noValidate encType="multipart/form-data">
      <FieldGroup>
        <Field data-invalid={!!state.fieldErrors?.areaId}>
          <FieldLabel htmlFor="areaId">Area</FieldLabel>
          <Select name="areaId">
            <SelectTrigger id="areaId" className="w-full">
              <SelectValue placeholder="Where is this?" />
            </SelectTrigger>
            <SelectContent>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name} · {area.district}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={state.fieldErrors?.areaId?.map((m) => ({ message: m }))} />
        </Field>

        <Field data-invalid={!!state.fieldErrors?.addressLine}>
          <FieldLabel htmlFor="addressLine">Location</FieldLabel>
          <Input
            id="addressLine"
            name="addressLine"
            placeholder="e.g. behind the temple, Elvitigala Mawatha"
            aria-invalid={!!state.fieldErrors?.addressLine}
          />
          <FieldError
            errors={state.fieldErrors?.addressLine?.map((m) => ({ message: m }))}
          />
        </Field>

        <Field data-invalid={!!state.fieldErrors?.siteType}>
          <FieldLabel htmlFor="siteType">Site type</FieldLabel>
          <Select name="siteType">
            <SelectTrigger id="siteType" className="w-full">
              <SelectValue placeholder="What kind of site is it?" />
            </SelectTrigger>
            <SelectContent>
              {SITE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {SITE_TYPE_LABEL[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={state.fieldErrors?.siteType?.map((m) => ({ message: m }))} />
        </Field>

        <Field data-invalid={!!state.fieldErrors?.description}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            rows={4}
            placeholder="What did you see? How much water, how long has it been there..."
            aria-invalid={!!state.fieldErrors?.description}
          />
          <FieldError
            errors={state.fieldErrors?.description?.map((m) => ({ message: m }))}
          />
        </Field>

        <Field data-invalid={!!state.fieldErrors?.reportedSeverity}>
          <FieldLabel htmlFor="reportedSeverity">Your guess at severity (optional)</FieldLabel>
          <Select name="reportedSeverity">
            <SelectTrigger id="reportedSeverity" className="w-full">
              <SelectValue placeholder="How bad does it look?" />
            </SelectTrigger>
            <SelectContent>
              {RISK_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {RISK_LABEL[level]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Advisory only — a PHI officer sets the real risk level.
          </FieldDescription>
          <FieldError
            errors={state.fieldErrors?.reportedSeverity?.map((m) => ({ message: m }))}
          />
        </Field>

        <Field data-invalid={!!state.fieldErrors?.photo}>
          <FieldLabel htmlFor="photo">Photo (optional)</FieldLabel>
          <Input id="photo" name="photo" type="file" accept="image/*" />
          <FieldDescription>JPEG, PNG or WebP, up to 5MB.</FieldDescription>
          <FieldError errors={state.fieldErrors?.photo?.map((m) => ({ message: m }))} />
        </Field>

        {state.status === "error" && !state.fieldErrors && (
          <p className="text-destructive text-sm">{state.message}</p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Submitting..." : "Submit report"}
        </Button>
      </FieldGroup>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { RISK_LEVELS } from "@/db/schema";
import { RISK_LABEL } from "@/lib/labels";
import { idleState } from "@/lib/form";
import { assessReport } from "@/lib/actions/triage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AssessDialog({
  reportId,
  addressLine,
}: {
  reportId: string;
  addressLine: string;
}) {
  const [state, formAction, isPending] = useActionState(assessReport, idleState);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Report assessed");
      closeRef.current?.click();
    }
  }, [state]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">Assess</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogClose ref={closeRef} className="hidden" />
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={reportId} />
          <DialogHeader>
            <DialogTitle>Assess report</DialogTitle>
            <DialogDescription>{addressLine}</DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field data-invalid={!!state.fieldErrors?.riskLevel}>
              <FieldLabel htmlFor="riskLevel">Risk level</FieldLabel>
              <Select name="riskLevel">
                <SelectTrigger id="riskLevel" className="w-full">
                  <SelectValue placeholder="Choose a severity" />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {RISK_LABEL[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                errors={state.fieldErrors?.riskLevel?.map((m) => ({ message: m }))}
              />
            </Field>

            <Field data-invalid={!!state.fieldErrors?.note}>
              <FieldLabel htmlFor="note">Note (optional)</FieldLabel>
              <Textarea id="note" name="note" rows={3} />
              <FieldError errors={state.fieldErrors?.note?.map((m) => ({ message: m }))} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Confirm assessment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

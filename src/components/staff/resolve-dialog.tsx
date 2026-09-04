"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ACTIONS_TAKEN } from "@/db/schema";
import { ACTION_LABEL } from "@/lib/labels";
import { idleState } from "@/lib/form";
import { resolveReport } from "@/lib/actions/triage";
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

export function ResolveDialog({
  reportId,
  addressLine,
}: {
  reportId: string;
  addressLine: string;
}) {
  const [state, formAction, isPending] = useActionState(resolveReport, idleState);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Job resolved");
      closeRef.current?.click();
    }
  }, [state]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">Resolve</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogClose ref={closeRef} className="hidden" />
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={reportId} />
          <DialogHeader>
            <DialogTitle>Resolve job</DialogTitle>
            <DialogDescription>{addressLine}</DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field data-invalid={!!state.fieldErrors?.actionTaken}>
              <FieldLabel htmlFor="actionTaken">What was done</FieldLabel>
              <Select name="actionTaken">
                <SelectTrigger id="actionTaken" className="w-full">
                  <SelectValue placeholder="Record what was done" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS_TAKEN.map((action) => (
                    <SelectItem key={action} value={action}>
                      {ACTION_LABEL[action]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                errors={state.fieldErrors?.actionTaken?.map((m) => ({ message: m }))}
              />
            </Field>

            <Field data-invalid={!!state.fieldErrors?.resolutionNotes}>
              <FieldLabel htmlFor="resolutionNotes">Notes (optional)</FieldLabel>
              <Textarea id="resolutionNotes" name="resolutionNotes" rows={3} />
              <FieldError
                errors={state.fieldErrors?.resolutionNotes?.map((m) => ({ message: m }))}
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Confirm resolution"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { idleState } from "@/lib/form";
import { rejectReport } from "@/lib/actions/triage";
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

export function RejectDialog({
  reportId,
  addressLine,
}: {
  reportId: string;
  addressLine: string;
}) {
  const [state, formAction, isPending] = useActionState(rejectReport, idleState);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Report rejected");
      closeRef.current?.click();
    }
  }, [state]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          Reject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogClose ref={closeRef} className="hidden" />
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={reportId} />
          <DialogHeader>
            <DialogTitle>Reject report</DialogTitle>
            <DialogDescription>{addressLine}</DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field data-invalid={!!state.fieldErrors?.note}>
              <FieldLabel htmlFor="reject-note">Reason</FieldLabel>
              <Textarea
                id="reject-note"
                name="note"
                rows={3}
                placeholder="Why is this being rejected?"
              />
              <FieldError errors={state.fieldErrors?.note?.map((m) => ({ message: m }))} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Rejecting..." : "Confirm rejection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

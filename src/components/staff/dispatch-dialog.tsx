"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { TEAM_TYPE_LABEL } from "@/lib/labels";
import { idleState } from "@/lib/form";
import { dispatchTeam } from "@/lib/actions/triage";
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
import type { TeamType } from "@/db/schema";

interface TeamOption {
  id: string;
  name: string;
  type: TeamType;
}

export function DispatchDialog({
  reportId,
  addressLine,
  teams,
}: {
  reportId: string;
  addressLine: string;
  teams: TeamOption[];
}) {
  const [state, formAction, isPending] = useActionState(dispatchTeam, idleState);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Team dispatched");
      closeRef.current?.click();
    }
  }, [state]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">Dispatch</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogClose ref={closeRef} className="hidden" />
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={reportId} />
          <DialogHeader>
            <DialogTitle>Dispatch a team</DialogTitle>
            <DialogDescription>{addressLine}</DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field data-invalid={!!state.fieldErrors?.assignedTeamId}>
              <FieldLabel htmlFor="assignedTeamId">Team</FieldLabel>
              <Select name="assignedTeamId">
                <SelectTrigger id="assignedTeamId" className="w-full">
                  <SelectValue placeholder="Choose which team to send" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} · {TEAM_TYPE_LABEL[team.type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                errors={state.fieldErrors?.assignedTeamId?.map((m) => ({ message: m }))}
              />
            </Field>

            <Field data-invalid={!!state.fieldErrors?.note}>
              <FieldLabel htmlFor="dispatch-note">Note (optional)</FieldLabel>
              <Textarea id="dispatch-note" name="note" rows={3} />
              <FieldError errors={state.fieldErrors?.note?.map((m) => ({ message: m }))} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Dispatching..." : "Confirm dispatch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

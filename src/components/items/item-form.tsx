"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createItem } from "@/lib/actions/items";
import { idleState } from "@/lib/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldError,
} from "@/components/ui/field";

export function ItemForm() {
  const [state, formAction, isPending] = useActionState(createItem, idleState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Saved");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate>
      <FieldGroup>
        <Field data-invalid={!!state.fieldErrors?.title}>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            name="title"
            placeholder="What needs doing?"
            aria-invalid={!!state.fieldErrors?.title}
          />
          <FieldError errors={state.fieldErrors?.title?.map((m) => ({ message: m }))} />
        </Field>

        <Field data-invalid={!!state.fieldErrors?.description}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            placeholder="Optional details"
            rows={3}
            aria-invalid={!!state.fieldErrors?.description}
          />
          <FieldError
            errors={state.fieldErrors?.description?.map((m) => ({ message: m }))}
          />
        </Field>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding..." : "Add item"}
        </Button>
      </FieldGroup>
    </form>
  );
}

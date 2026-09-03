"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createItem, type ActionState } from "@/lib/actions/items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";

const initialState: ActionState = {};

export function ItemForm() {
  const [state, formAction, isPending] = useActionState(createItem, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Item created");
      formRef.current?.reset();
    }
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input id="title" name="title" placeholder="What needs doing?" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea id="description" name="description" placeholder="Optional details" rows={3} />
        </Field>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding..." : "Add item"}
        </Button>
      </FieldGroup>
    </form>
  );
}

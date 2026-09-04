"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { register, type RegisterSubmitted } from "@/lib/actions/auth";
import type { ActionState } from "@/lib/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldError,
} from "@/components/ui/field";

const idleState: ActionState<RegisterSubmitted> = { status: "idle" };

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(register, idleState);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Account created");
      router.push("/");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <Field data-invalid={!!state.fieldErrors?.name}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            name="name"
            placeholder="Your name"
            defaultValue={state.data?.name}
            aria-invalid={!!state.fieldErrors?.name}
          />
          <FieldError errors={state.fieldErrors?.name?.map((m) => ({ message: m }))} />
        </Field>

        <Field data-invalid={!!state.fieldErrors?.phone}>
          <FieldLabel htmlFor="phone">Phone</FieldLabel>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="07XXXXXXXX"
            defaultValue={state.data?.phone}
            aria-invalid={!!state.fieldErrors?.phone}
          />
          <FieldError errors={state.fieldErrors?.phone?.map((m) => ({ message: m }))} />
        </Field>

        <Field data-invalid={!!state.fieldErrors?.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            aria-invalid={!!state.fieldErrors?.password}
          />
          <FieldError
            errors={state.fieldErrors?.password?.map((m) => ({ message: m }))}
          />
        </Field>

        <Field data-invalid={!!state.fieldErrors?.confirmPassword}>
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            aria-invalid={!!state.fieldErrors?.confirmPassword}
          />
          <FieldError
            errors={state.fieldErrors?.confirmPassword?.map((m) => ({ message: m }))}
          />
        </Field>

        {state.status === "error" && !state.fieldErrors && (
          <p className="text-destructive text-sm">{state.message}</p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating account..." : "Create account"}
        </Button>
      </FieldGroup>
    </form>
  );
}

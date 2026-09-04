"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { login } from "@/lib/actions/auth";
import { idleState } from "@/lib/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldError,
} from "@/components/ui/field";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, idleState);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Signed in");
      router.push("/");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} noValidate>
      <FieldGroup>
        <Field data-invalid={!!state.fieldErrors?.phone}>
          <FieldLabel htmlFor="phone">Phone</FieldLabel>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="07XXXXXXXX"
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
            placeholder="Your password"
            aria-invalid={!!state.fieldErrors?.password}
          />
          <FieldError
            errors={state.fieldErrors?.password?.map((m) => ({ message: m }))}
          />
        </Field>

        {state.status === "error" && (
          <p className="text-destructive text-sm">{state.message}</p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Signing in..." : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  );
}

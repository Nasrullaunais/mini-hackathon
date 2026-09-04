import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/current-user";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  // Already signed in: a second sign-up form is a dead end, not a choice.
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="mx-auto w-full max-w-sm space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Report breeding sites and track what happens to them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
        {/* gap-1, not {" "}: CardFooter is a flex row, so a whitespace-only
            text node between the two children is dropped. */}
        <CardFooter className="text-muted-foreground gap-1 text-sm">
          Already have an account?
          <Link href="/login" className="text-foreground underline">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}

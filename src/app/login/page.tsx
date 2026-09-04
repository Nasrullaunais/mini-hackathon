import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
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

export default async function LoginPage() {
  // Already signed in: a second sign-in form is a dead end, not a choice.
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="mx-auto w-full max-w-sm space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Citizens, PHI officers and field crews all sign in here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        {/* gap-1, not {" "}: CardFooter is a flex row, so a whitespace-only
            text node between the two children is dropped. */}
        <CardFooter className="text-muted-foreground gap-1 text-sm">
          New here?
          <Link href="/register" className="text-foreground underline">
            Create an account
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}

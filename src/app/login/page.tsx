import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm space-y-6 p-6">
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
        <CardFooter className="text-muted-foreground text-sm">
          New here?{" "}
          <Link href="/register" className="text-foreground underline">
            Create an account
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}

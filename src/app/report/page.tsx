import { asc } from "drizzle-orm";
import { db } from "@/db";
import { areas } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { ReportForm } from "@/components/report/report-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const actor = await getCurrentUser();

  if (!actor) {
    return (
      <main className="mx-auto w-full max-w-md p-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sign in to report a site</EmptyTitle>
            <EmptyDescription>
              You need an account to submit a breeding-site report.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/login">Sign in to continue</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    );
  }

  if (actor.role === "crew") {
    return (
      <main className="mx-auto w-full max-w-md p-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Not available for field crew</EmptyTitle>
            <EmptyDescription>
              Field crew accounts work from{" "}
              <Link href="/team" className="underline">
                My jobs
              </Link>
              .
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    );
  }

  const areaRows = await db
    .select({ id: areas.id, name: areas.name, district: areas.district })
    .from(areas)
    .orderBy(asc(areas.name));

  return (
    <main className="mx-auto w-full max-w-xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Report a breeding site</CardTitle>
          <CardDescription>
            Stagnant water, a blocked drain, a rubbish pile — describe what you
            saw and where. A photo helps an officer judge it faster.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportForm areas={areaRows} />
        </CardContent>
      </Card>
    </main>
  );
}

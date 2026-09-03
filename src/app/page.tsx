import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Mini Hackathon</h1>
        <p className="text-muted-foreground">
          Next.js 16 · Neon Postgres · Drizzle · shadcn/ui. Read{" "}
          <code className="bg-muted rounded px-1 py-0.5 text-sm">GUIDELINES.md</code>{" "}
          before you write code.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/items">Reference CRUD</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/api/health">Health check</Link>
        </Button>
      </div>
    </main>
  );
}

import { desc } from "drizzle-orm";
import { db } from "@/db";
import { items } from "@/db/schema";
import { ItemForm } from "@/components/items/item-form";
import { ItemList } from "@/components/items/item-list";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

// Always read fresh from the DB — no static caching for this page.
export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const allItems = await db.select().from(items).orderBy(desc(items.createdAt));

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Items</h1>
        <p className="text-muted-foreground text-sm">
          Reference CRUD slice. Copy this pattern for the real feature.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New item</CardTitle>
          <CardDescription>Server Action + zod validation.</CardDescription>
        </CardHeader>
        <CardContent>
          <ItemForm />
        </CardContent>
      </Card>

      <ItemList items={allItems} />
    </main>
  );
}

"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { Item } from "@/db/schema";
import { deleteItem, toggleItem } from "@/lib/actions/items";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

export function ItemList({ items }: { items: Item[] }) {
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No items yet</EmptyTitle>
          <EmptyDescription>Add your first one with the form above.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 p-4">
          <Checkbox
            checked={item.done}
            disabled={isPending}
            onCheckedChange={(checked) =>
              startTransition(async () => {
                const res = await toggleItem(item.id, checked === true);
                if (res.error) toast.error(res.error);
              })
            }
            className="mt-1"
          />
          <div className="min-w-0 flex-1">
            <p className={item.done ? "font-medium line-through opacity-60" : "font-medium"}>
              {item.title}
            </p>
            {item.description && (
              <p className="text-muted-foreground mt-0.5 text-sm">{item.description}</p>
            )}
          </div>
          {item.done && <Badge variant="secondary">Done</Badge>}
          <Button
            variant="ghost"
            size="icon"
            disabled={isPending}
            aria-label={`Delete ${item.title}`}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteItem(item.id);
                if (res.error) toast.error(res.error);
                else toast.success("Deleted");
              })
            }
          >
            <Trash2 className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

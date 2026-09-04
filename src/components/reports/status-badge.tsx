import type { ReportStatus } from "@/db/schema";
import { STATUS_LABEL } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Colour is purely presentational sugar on top of the shared `Badge` variants
 * -- the enum-to-label mapping itself lives in STATUS_LABEL so it can't drift.
 */
const STATUS_CLASS: Record<ReportStatus, string> = {
  reported: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  under_review:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  dispatched: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  cleared:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

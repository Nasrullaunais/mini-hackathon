import type { RiskLevel } from "@/db/schema";
import { RISK_LABEL } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RISK_CLASS: Record<RiskLevel, string> = {
  low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

/** `riskLevel` is nullable on `reports` -- null means "not assessed yet". */
export function RiskBadge({ riskLevel }: { riskLevel: RiskLevel | null }) {
  if (!riskLevel) {
    return <Badge variant="outline">Not assessed</Badge>;
  }

  return (
    <Badge variant="outline" className={cn("border-transparent", RISK_CLASS[riskLevel])}>
      {RISK_LABEL[riskLevel]} risk
    </Badge>
  );
}

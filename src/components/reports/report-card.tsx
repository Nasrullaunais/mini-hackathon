import Link from "next/link";
import Image from "next/image";
import type { Report } from "@/db/schema";
import { SITE_TYPE_LABEL } from "@/lib/labels";
import { StatusBadge } from "@/components/reports/status-badge";
import { RiskBadge } from "@/components/reports/risk-badge";
import { Card, CardContent } from "@/components/ui/card";

export interface ReportCardData extends Report {
  areaName: string;
  teamName: string | null;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
  }).format(date);
}

export function ReportCard({ report }: { report: ReportCardData }) {
  return (
    <Link href={`/reports/${report.id}`} className="block h-full">
      <Card className="hover:border-primary/50 h-full overflow-hidden py-0 transition-colors">
        <div className="bg-muted relative aspect-video w-full">
          {report.photoUrl ? (
            <Image
              src={report.photoUrl}
              alt={report.addressLine}
              fill
              className="object-cover"
              sizes="(min-width: 768px) 33vw, 100vw"
            />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              No photo
            </div>
          )}
        </div>
        <CardContent className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={report.status} />
            <RiskBadge riskLevel={report.riskLevel} />
          </div>
          <p className="leading-snug font-medium">{report.addressLine}</p>
          <p className="text-muted-foreground text-sm">
            {SITE_TYPE_LABEL[report.siteType]} · {report.areaName}
          </p>
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {report.description}
          </p>
          <div className="text-muted-foreground flex items-center justify-between pt-1 text-xs">
            <span>{formatDate(report.createdAt)}</span>
            {report.teamName && <span>Assigned: {report.teamName}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

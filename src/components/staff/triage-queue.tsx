import type { Report, TeamType } from "@/db/schema";
import { SITE_TYPE_LABEL } from "@/lib/labels";
import { StatusBadge } from "@/components/reports/status-badge";
import { RiskBadge } from "@/components/reports/risk-badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssessDialog } from "@/components/staff/assess-dialog";
import { DispatchDialog } from "@/components/staff/dispatch-dialog";
import { RejectDialog } from "@/components/staff/reject-dialog";

export interface TriageReport extends Report {
  areaName: string;
  reporterName: string;
}

interface TriageQueueProps {
  reported: TriageReport[];
  underReview: TriageReport[];
  dispatched: TriageReport[];
  teams: { id: string; name: string; type: TeamType }[];
}

const GROUPS = [
  { key: "reported", label: "Reported" },
  { key: "under_review", label: "Under review" },
  { key: "dispatched", label: "Dispatched" },
] as const;

export function TriageQueue({ reported, underReview, dispatched, teams }: TriageQueueProps) {
  const rows: Record<(typeof GROUPS)[number]["key"], TriageReport[]> = {
    reported,
    under_review: underReview,
    dispatched,
  };

  return (
    <Tabs defaultValue="reported">
      <TabsList>
        {GROUPS.map((group) => (
          <TabsTrigger key={group.key} value={group.key}>
            {group.label} ({rows[group.key].length})
          </TabsTrigger>
        ))}
      </TabsList>

      {GROUPS.map((group) => (
        <TabsContent key={group.key} value={group.key}>
          {rows[group.key].length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Nothing here</EmptyTitle>
                <EmptyDescription>
                  No reports are currently {group.label.toLowerCase()}.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows[group.key].map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="max-w-64 truncate font-medium">
                      {report.addressLine}
                    </TableCell>
                    <TableCell>{SITE_TYPE_LABEL[report.siteType]}</TableCell>
                    <TableCell>{report.areaName}</TableCell>
                    <TableCell>{report.reporterName}</TableCell>
                    <TableCell>
                      <RiskBadge riskLevel={report.riskLevel} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={report.status} />
                    </TableCell>
                    <TableCell className="flex justify-end gap-2 text-right">
                      {report.status === "reported" && (
                        <>
                          <AssessDialog
                            reportId={report.id}
                            addressLine={report.addressLine}
                          />
                          <RejectDialog
                            reportId={report.id}
                            addressLine={report.addressLine}
                          />
                        </>
                      )}
                      {report.status === "under_review" && (
                        <>
                          <DispatchDialog
                            reportId={report.id}
                            addressLine={report.addressLine}
                            teams={teams}
                          />
                          <RejectDialog
                            reportId={report.id}
                            addressLine={report.addressLine}
                          />
                        </>
                      )}
                      {report.status === "dispatched" && (
                        <span className="text-muted-foreground text-sm">
                          Waiting on the field crew
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

import { type TeamWorkloadRow } from "@/lib/stats/area-risk";
import { TEAM_TYPE_LABEL } from "@/lib/labels";
import { type TeamType } from "@/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function TeamWorkload({ workloads }: { workloads: TeamWorkloadRow[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Open Jobs (Dispatched)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workloads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                No teams found.
              </TableCell>
            </TableRow>
          ) : (
            workloads.map((workload) => (
              <TableRow key={workload.teamName}>
                <TableCell className="font-medium">{workload.teamName}</TableCell>
                <TableCell>{TEAM_TYPE_LABEL[workload.type as TeamType] || workload.type}</TableCell>
                <TableCell className="text-right font-medium">{workload.openJobs}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

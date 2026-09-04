import { type AreaRiskRow } from "@/lib/stats/area-risk";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function AreaRiskTable({ areas }: { areas: AreaRiskRow[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Area</TableHead>
            <TableHead>District</TableHead>
            <TableHead className="text-right">Active Reports</TableHead>
            <TableHead className="text-right">Cleared</TableHead>
            <TableHead className="text-right">Risk Score</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {areas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No areas found.
              </TableCell>
            </TableRow>
          ) : (
            areas.map((area) => (
              <TableRow key={area.areaId}>
                <TableCell className="font-medium">
                  {area.areaName}
                  {area.hotspot && (
                    <Badge variant="destructive" className="ml-2">Hotspot</Badge>
                  )}
                </TableCell>
                <TableCell>{area.district}</TableCell>
                <TableCell className="text-right">{area.active}</TableCell>
                <TableCell className="text-right">{area.cleared}</TableCell>
                <TableCell className="text-right font-medium">{area.score}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      area.band === "Danger zone"
                        ? "destructive"
                        : area.band === "Watch"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {area.band}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

import type { ReportStatus } from "@/db/schema";
import { StatusBadge } from "@/components/reports/status-badge";

export interface TimelineEntry {
  id: string;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  note: string | null;
  createdAt: Date;
  actorName: string;
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ReportTimeline({ events }: { events: TimelineEntry[] }) {
  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm">No activity recorded yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="border-border border-l-2 py-0.5 pl-4">
          <div className="flex flex-wrap items-center gap-2">
            {event.fromStatus && (
              <>
                <StatusBadge status={event.fromStatus} />
                <span className="text-muted-foreground text-xs">→</span>
              </>
            )}
            <StatusBadge status={event.toStatus} />
          </div>
          <p className="mt-1 text-sm">
            <span className="font-medium">{event.actorName}</span>
            <span className="text-muted-foreground"> · {formatDateTime(event.createdAt)}</span>
          </p>
          {event.note && <p className="text-muted-foreground mt-1 text-sm">{event.note}</p>}
        </li>
      ))}
    </ol>
  );
}

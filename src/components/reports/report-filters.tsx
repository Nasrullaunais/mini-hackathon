"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { REPORT_STATUSES, SITE_TYPES, type ReportStatus, type SiteType } from "@/db/schema";
import { SITE_TYPE_LABEL, STATUS_LABEL } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Sentinel for "no filter" -- Radix Select can't use an empty string as a value. */
const ALL = "all";

interface ReportFiltersProps {
  areas: { id: string; name: string }[];
  area?: string;
  status?: ReportStatus;
  siteType?: SiteType;
}

export function ReportFilters({ areas, area, status, siteType }: ReportFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasFilters = Boolean(area ?? status ?? siteType);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={area ?? ALL} onValueChange={(value) => setParam("area", value)}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="All areas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All areas</SelectItem>
          {areas.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status ?? ALL} onValueChange={(value) => setParam("status", value)}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {REPORT_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={siteType ?? ALL} onValueChange={(value) => setParam("siteType", value)}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="All site types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All site types</SelectItem>
          {SITE_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {SITE_TYPE_LABEL[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

import type { CheckResult, Role } from "@/lib/portal-types";
import {
  CHECK_RESULT_META,
  ROLE_BADGE,
  ROLE_LABELS,
  platformMeta,
  statusMeta,
} from "@/lib/portal-ui";
import { cn } from "@/lib/utils";

export function PlatformBadge({ platform, className }: { platform: string; className?: string }) {
  const meta = platformMeta(platform);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        meta.badge,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {platform}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = statusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        meta.badge,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function CheckBadge({
  result,
  className,
}: {
  result?: string | null;
  className?: string;
}) {
  if (!result) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground",
          className,
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
        Sin verificar
      </span>
    );
  }
  const meta = CHECK_RESULT_META[result as CheckResult] ?? CHECK_RESULT_META.unavailable;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        meta.badge,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

export function RoleBadge({ role }: { role?: Role | null }) {
  if (!role) {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
        Sin rol
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        ROLE_BADGE[role],
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

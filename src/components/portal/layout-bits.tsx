import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 sm:flex-1">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}

const TONES: Record<string, string> = {
  primary: "border-primary/30 bg-primary/10 text-primary",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  info: "border-info/30 bg-info/10 text-info",
  muted: "border-border bg-muted/50 text-muted-foreground",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "muted",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES | string;
}) {
  return (
    <div className="panel group relative overflow-hidden p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-md border",
            TONES[tone] ?? TONES.muted,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full border border-border bg-muted/50 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-foreground">
          {title}
        </h3>
        {typeof count === "number" ? (
          <span className="rounded-full border border-border bg-muted/50 px-1.5 text-[11px] text-muted-foreground">
            {count}
          </span>
        ) : null}
      </div>
      {action}
    </div>
  );
}

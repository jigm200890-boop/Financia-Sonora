import type { AppStatus, CheckResult, Role, TaskStatus } from "./portal-types";

export const STATUS_META: Record<
  AppStatus,
  { label: string; dot: string; badge: string }
> = {
  active: {
    label: "Activa",
    dot: "bg-success",
    badge: "border-success/40 bg-success/10 text-success",
  },
  unverified: {
    label: "Por verificar",
    dot: "bg-warning",
    badge: "border-warning/40 bg-warning/10 text-warning",
  },
  pending: {
    label: "Pendiente",
    dot: "bg-info",
    badge: "border-info/40 bg-info/10 text-info",
  },
  offline: {
    label: "Desconectada",
    dot: "bg-destructive",
    badge: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  unpublished: {
    label: "Sin publicar",
    dot: "bg-muted-foreground",
    badge: "border-border bg-muted/60 text-muted-foreground",
  },
};

export const PLATFORM_META: Record<string, { badge: string; short: string }> = {
  "Hércules": { badge: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300", short: "H" },
  Base44: { badge: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300", short: "B44" },
  Google: { badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", short: "G" },
  "Agentes IA": { badge: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300", short: "IA" },
  Cappy: { badge: "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300", short: "C" },
  Otra: { badge: "border-border bg-muted/50 text-muted-foreground", short: "OT" },
};

export const CHECK_RESULT_META: Record<
  CheckResult,
  { label: string; badge: string }
> = {
  reachable: {
    label: "Alcanzable",
    badge: "border-success/40 bg-success/10 text-success",
  },
  auth_required: {
    label: "Requiere iniciar sesión",
    badge: "border-warning/40 bg-warning/10 text-warning",
  },
  unavailable: {
    label: "No disponible",
    badge: "border-destructive/40 bg-destructive/10 text-destructive",
  },
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  editor: "Colaborador",
  viewer: "Solo lectura",
};

export const ROLE_BADGE: Record<Role, string> = {
  admin: "border-primary/40 bg-primary/10 text-primary",
  editor: "border-info/40 bg-info/10 text-info",
  viewer: "border-border bg-muted/60 text-muted-foreground",
};

export const TASK_COLUMNS: Array<{ id: TaskStatus; label: string; accent: string }> = [
  { id: "pendiente", label: "Pendientes", accent: "bg-info" },
  { id: "en_curso", label: "En curso", accent: "bg-primary" },
  { id: "bloqueada", label: "Bloqueadas", accent: "bg-destructive" },
  { id: "hecha", label: "Hechas", accent: "bg-success" },
];

export const PRIORITY_META: Record<string, { label: string; badge: string }> = {
  alta: { label: "Alta", badge: "border-destructive/40 bg-destructive/10 text-destructive" },
  media: { label: "Media", badge: "border-warning/40 bg-warning/10 text-warning" },
  baja: { label: "Baja", badge: "border-border bg-muted/50 text-muted-foreground" },
};

export const AGENT_ACCENTS: Record<string, string> = {
  blue: "from-sky-500/25 to-blue-600/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  amber: "from-amber-500/25 to-orange-600/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  violet: "from-violet-500/25 to-fuchsia-600/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  emerald: "from-emerald-500/25 to-teal-600/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  rose: "from-rose-500/25 to-pink-600/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export function platformMeta(platform: string) {
  return PLATFORM_META[platform] ?? PLATFORM_META.Otra;
}

export function statusMeta(status: string) {
  return STATUS_META[(status as AppStatus) ?? "unverified"] ?? STATUS_META.unverified;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Sin verificar";
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value + "T00:00:00").toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

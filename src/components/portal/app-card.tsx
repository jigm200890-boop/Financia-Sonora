import {
  AtSign,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  SquarePen,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { AppRow } from "@/lib/portal-types";
import { formatDateTime } from "@/lib/portal-ui";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckBadge, PlatformBadge, StatusBadge } from "@/components/portal/badges";
import { cn } from "@/lib/utils";

export function AppCard({
  app,
  canEdit,
  onEdit,
  onDelete,
  onVerify,
  verifying,
}: {
  app: AppRow;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onVerify: () => void;
  verifying: boolean;
}) {
  const features = [...app.features_ready, ...app.features_pending];

  return (
    <article className="panel group flex h-full flex-col p-4 transition-all hover:border-primary/40 hover:shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="line-clamp-2 text-[15px] font-semibold leading-tight text-foreground">
            {app.name}
          </h4>
          <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
            <AtSign className="h-3 w-3 shrink-0" />
            {app.owner_account || "Cuenta por definir"}
          </p>
        </div>
        <PlatformBadge platform={app.platform} />
      </div>

      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
        {app.summary || "Sin descripción registrada."}
      </p>

      {features.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {app.features_ready.slice(0, 3).map((feature) => (
            <span
              key={feature}
              className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {feature}
            </span>
          ))}
          {app.features_ready.length > 3 ? (
            <span className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              +{app.features_ready.length - 3}
            </span>
          ) : null}
          {app.features_pending.slice(0, 2).map((feature) => (
            <span
              key={feature}
              className="rounded border border-dashed border-warning/40 px-1.5 py-0.5 text-[10px] text-warning/90"
            >
              {feature} · pendiente
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto space-y-3 pt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={app.status} />
          <CheckBadge result={app.last_check_result} />
        </div>

        <p className="text-[11px] text-muted-foreground">
          Última verificación: {formatDateTime(app.last_checked_at)}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="xs"
            variant={app.app_url ? "success" : "outlineMuted"}
            disabled={!app.app_url}
            title={app.app_url ? undefined : "Falta registrar la URL pública en la ficha"}
            onClick={() => app.app_url && window.open(app.app_url, "_blank", "noopener")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir
          </Button>

          {app.builder_url ? (
            <Button
              size="xs"
              variant="default"
              onClick={() => app.builder_url && window.open(app.builder_url, "_blank", "noopener")}
            >
              <SquarePen className="h-3.5 w-3.5" />
              Abrir editor
            </Button>
          ) : null}

          {canEdit ? (
            <Button
              size="xs"
              variant="outlineMuted"
              onClick={onVerify}
              disabled={!app.app_url || verifying}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", verifying && "animate-spin")} />
              Verificar
            </Button>
          ) : null}

          {canEdit ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-auto h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Más acciones</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  disabled={!app.app_url}
                  onClick={() => {
                    if (!app.app_url) return;
                    void navigator.clipboard
                      .writeText(app.app_url)
                      .then(() => toast.success("URL copiada"))
                      .catch(() => toast.error("No se pudo copiar la URL"));
                  }}
                >
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copiar URL
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Editar ficha
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </article>
  );
}

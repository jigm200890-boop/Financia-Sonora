import { useMemo, useState } from "react";
import { Cpu, ExternalLink, Info, RefreshCw, SquarePen } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useApps, useVerifyTarget } from "@/hooks/use-portal-data";
import { EmptyState, PageHeader } from "@/components/portal/layout-bits";
import { CheckBadge, PlatformBadge, StatusBadge } from "@/components/portal/badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CHECK_RESULT_META, formatDateTime } from "@/lib/portal-ui";
import type { CheckResult } from "@/lib/portal-types";
import { cn } from "@/lib/utils";

export default function Nucleos() {
  const { canEdit } = useAuth();
  const { data: apps, isLoading } = useApps();
  const verify = useVerifyTarget();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const cores = useMemo(
    () => (apps ?? []).filter((app) => app.category === "Núcleos centrales"),
    [apps],
  );

  async function handleVerify(id: string, name: string, url: string | null) {
    if (!url) {
      toast.warning("Este núcleo aún no tiene un enlace público registrado.");
      return;
    }
    setVerifyingId(id);
    try {
      const result = await verify.mutateAsync({ id, type: "app", name, url });
      const label = CHECK_RESULT_META[result.result as CheckResult]?.label ?? result.result;
      if (result.result === "reachable") toast.success(`${name}: ${label}`);
      else toast.warning(`${name}: ${label}`, { description: result.detail });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo verificar.");
    } finally {
      setVerifyingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Núcleos centrales"
        description="Los sistemas que ya existen siguen funcionando por su cuenta. Desde el portal se abren, se supervisan y se enlazan con el resto del ecosistema."
      />

      <div className="panel mb-6 flex items-start gap-3 p-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-muted/50 text-muted-foreground">
          <Info className="h-4 w-4" />
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          El portal no reconstruye ni fusiona los núcleos. Cada uno conserva su propio inicio de
          sesión y sus datos. La verificación confirma si el sistema responde y si pide autenticación;
          no lee información privada de plataformas que no autorizan API.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-[320px] rounded-lg" />
          ))}
        </div>
      ) : cores.length === 0 ? (
        <EmptyState
          icon={Cpu}
          title="Sin núcleos registrados"
          description="Registra el primer núcleo desde Aplicaciones, con su cuenta propietaria y su enlace real."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {cores.map((core) => (
            <article
              key={core.id}
              className="panel flex h-full flex-col p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-foreground">{core.name}</h3>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {core.owner_account || "Cuenta por definir"}
                  </p>
                </div>
                <PlatformBadge platform={core.platform} />
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {core.summary || "Sin descripción registrada."}
              </p>

              {core.features_ready.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {core.features_ready.map((feature) => (
                    <span
                      key={feature}
                      className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <StatusBadge status={core.status} />
                <CheckBadge result={core.last_check_result} />
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground">
                Última verificación: {formatDateTime(core.last_checked_at)}
              </p>

              {core.notes ? (
                <p className="mt-3 rounded-md border border-border/60 bg-muted/30 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
                  {core.notes}
                </p>
              ) : null}

              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <Button
                  size="sm"
                  variant="success"
                  disabled={!core.app_url}
                  onClick={() => core.app_url && window.open(core.app_url, "_blank", "noopener")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir aplicación
                </Button>
                {core.builder_url ? (
                  <Button
                    size="sm"
                    disabled={!core.builder_url}
                    onClick={() => core.builder_url && window.open(core.builder_url, "_blank", "noopener")}
                  >
                    <SquarePen className="h-3.5 w-3.5" />
                    Abrir constructor
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button
                    size="sm"
                    variant="outlineMuted"
                    className={cn(!core.app_url && "opacity-60")}
                    onClick={() => void handleVerify(core.id, core.name, core.app_url)}
                    disabled={verifyingId === core.id}
                  >
                    <RefreshCw
                      className={cn("h-3.5 w-3.5", verifyingId === core.id && "animate-spin")}
                    />
                    Verificar
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

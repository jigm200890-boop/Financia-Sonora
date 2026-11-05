import { useEffect, useMemo, useState } from "react";
import { ExternalLink, LayoutGrid, Loader2, Plus, RefreshCw, Search, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { useApps, useDeleteApp, useVerifyTarget } from "@/hooks/use-portal-data";
import { PageHeader, SectionTitle, EmptyState } from "@/components/portal/layout-bits";
import { AppCard } from "@/components/portal/app-card";
import { AppFormDialog } from "@/components/portal/app-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CHECK_RESULT_META, STATUS_META } from "@/lib/portal-ui";
import type { AppRow, CheckResult } from "@/lib/portal-types";

const ALL = "todas";

export default function Aplicaciones() {
  const { canEdit } = useAuth();
  const { data: apps, isLoading } = useApps();
  const verify = useVerifyTarget();
  const deleteApp = useDeleteApp();

  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [owner, setOwner] = useState(ALL);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppRow | null>(null);
  const [live, setLive] = useState<{
    total?: number;
    actualizado?: string;
    por_plataforma?: Record<string, number>;
    apps?: Array<Record<string, unknown>>;
  } | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  async function loadLive() {
    setLiveLoading(true);
    setLiveError(null);
    try {
      const { data, error } = await supabase.functions.invoke("linea-fs", {
        body: { action: "apps" },
      });
      if (error) throw new Error(error.message);
      const payload = data as {
        ok?: boolean;
        data?: {
          ok?: boolean;
          total?: number;
          actualizado?: string;
          por_plataforma?: Record<string, number>;
          apps?: Array<Record<string, unknown>>;
          error?: string;
        };
      };
      if (!payload?.ok || !payload?.data?.ok) {
        throw new Error(payload?.data?.error ?? "El directorio vivo no respondió.");
      }
      setLive(payload.data);
    } catch (caught) {
      setLive(null);
      setLiveError(caught instanceof Error ? caught.message : "No se pudo leer el directorio.");
    } finally {
      setLiveLoading(false);
    }
  }

  useEffect(() => {
    void loadLive();
  }, []);

  const platforms = useMemo(
    () => Array.from(new Set((apps ?? []).map((app) => app.platform))).sort(),
    [apps],
  );
  const owners = useMemo(
    () =>
      Array.from(
        new Set((apps ?? []).map((app) => app.owner_account).filter((value): value is string => !!value)),
      ).sort(),
    [apps],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (apps ?? []).filter((app) => {
      const matchesTerm =
        !term ||
        [app.name, app.summary, app.owner_account, app.platform, app.category, ...app.features_ready]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesPlatform = platform === ALL || app.platform === platform;
      const matchesStatus = status === ALL || app.status === status;
      const matchesOwner = owner === ALL || app.owner_account === owner;
      return matchesTerm && matchesPlatform && matchesStatus && matchesOwner;
    });
  }, [apps, search, platform, status, owner]);

  const grouped = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, AppRow[]>();
    for (const app of filtered) {
      if (!map.has(app.category)) {
        map.set(app.category, []);
        order.push(app.category);
      }
      map.get(app.category)?.push(app);
    }
    return order.map((category) => ({ category, items: map.get(category) ?? [] }));
  }, [filtered]);

  async function handleVerify(app: AppRow) {
    if (!app.app_url) {
      toast.warning("Esta ficha no tiene URL registrada.");
      return;
    }
    setVerifyingId(app.id);
    try {
      const result = await verify.mutateAsync({
        id: app.id,
        type: "app",
        name: app.name,
        url: app.app_url,
      });
      const label = CHECK_RESULT_META[result.result as CheckResult]?.label ?? result.result;
      if (result.result === "reachable") toast.success(`${app.name}: ${label}`);
      else toast.warning(`${app.name}: ${label}`, { description: result.detail });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo verificar.");
    } finally {
      setVerifyingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Aplicaciones"
        description="Todas las apps y webs del ecosistema, aunque vivan en plataformas y cuentas distintas. El estado se confirma verificando el enlace real."
      >
        {canEdit ? (
          <Button
            onClick={() => {
              setEditingApp(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nueva aplicación
          </Button>
        ) : null}
      </PageHeader>

      <div className="panel mb-4 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Directorio vivo · Base44</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {live?.total ?? 0} aplicaciones
              {live?.actualizado
                ? ` · actualizado ${new Date(live.actualizado).toLocaleString("es-MX")}`
                : ""}
            </p>
          </div>
          <Button size="xs" variant="outlineMuted" onClick={() => void loadLive()} disabled={liveLoading}>
            <RefreshCw className={liveLoading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            Actualizar
          </Button>
        </div>

        {live?.por_plataforma ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(live.por_plataforma).map(([name, count]) => (
              <span
                key={name}
                className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {name}: {count}
              </span>
            ))}
          </div>
        ) : null}

        {liveError ? (
          <div className="mt-2 flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-[11px] text-destructive">
            <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
            {liveError}
          </div>
        ) : null}

        {liveLoading && !live ? (
          <p className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Consultando el directorio…
          </p>
        ) : null}

        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto scrollbar-thin">
          {(live?.apps ?? []).map((app, index) => {
            const nombre = String(app.nombre ?? app.name ?? "Sin nombre");
            const plataforma = String(app.plataforma ?? app.platform ?? "");
            const estado = String(app.estado ?? app.status ?? "");
            const enlace = typeof app.enlace === "string" ? app.enlace : null;
            const dueno = String(app.dueno ?? app.owner ?? "");
            const nota = String(app.nota ?? app.summary ?? "");
            return (
              <div
                key={`${nombre}-${index}`}
                className="flex items-start justify-between gap-2 rounded-md border border-border/60 px-2 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-foreground">{nombre}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {plataforma}
                    {estado ? ` · ${estado}` : ""}
                    {dueno ? ` · ${dueno}` : ""}
                    {nota ? ` · ${nota}` : ""}
                  </p>
                </div>
                {enlace ? (
                  <a
                    href={enlace}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-primary"
                    aria-label={`Abrir ${nombre}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>

        <p className="mt-2 text-[10px] text-muted-foreground">
          Fuente: appsListar (Base44). Ver no es entrar: cada app abre con su propio acceso.
        </p>
      </div>

      <div className="panel mb-6 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre, cuenta o función"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground lg:flex">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
          </span>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Plataforma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {platforms.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {Object.entries(STATUS_META).map(([value, meta]) => (
                <SelectItem key={value} value={value}>
                  {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Cuenta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {owners.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((key) => (
            <Skeleton key={key} className="h-[240px] rounded-lg" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No hay aplicaciones con esos filtros"
          description="Ajusta la búsqueda o registra una aplicación nueva con su cuenta y su enlace real."
          action={
            canEdit ? (
              <Button
                size="sm"
                onClick={() => {
                  setEditingApp(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Nueva aplicación
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.category}>
              <SectionTitle title={group.category} count={group.items.length} />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    canEdit={canEdit}
                    verifying={verifyingId === app.id}
                    onVerify={() => void handleVerify(app)}
                    onEdit={() => {
                      setEditingApp(app);
                      setFormOpen(true);
                    }}
                    onDelete={() => {
                      if (window.confirm(`¿Eliminar la ficha de ${app.name}?`)) {
                        void deleteApp
                          .mutateAsync(app.id)
                          .then(() => toast.success("Ficha eliminada"))
                          .catch((error: unknown) =>
                            toast.error(
                              error instanceof Error ? error.message : "No se pudo eliminar.",
                            ),
                          );
                      }
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <AppFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingApp(null);
        }}
        app={editingApp}
      />
    </div>
  );
}

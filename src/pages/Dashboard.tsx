import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock,
  LayoutGrid,
  MessageSquare,
  Plus,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import {
  useAgents,
  useApps,
  useDeleteApp,
  useTasks,
  useVerifyTarget,
} from "@/hooks/use-portal-data";
import { PageHeader, SectionTitle, StatCard } from "@/components/portal/layout-bits";
import { AppCard } from "@/components/portal/app-card";
import { AppFormDialog } from "@/components/portal/app-form-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AGENT_ACCENTS, CHECK_RESULT_META, PRIORITY_META } from "@/lib/portal-ui";
import type { AppRow, CheckResult } from "@/lib/portal-types";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { profile, canEdit } = useAuth();
  const { data: apps, isLoading: appsLoading } = useApps();
  const { data: tasks } = useTasks();
  const { data: agents } = useAgents();
  const verify = useVerifyTarget();
  const deleteApp = useDeleteApp();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppRow | null>(null);

  const cores = useMemo(
    () => (apps ?? []).filter((app) => app.category === "Núcleos centrales"),
    [apps],
  );

  const stats = useMemo(() => {
    const all = apps ?? [];
    return {
      total: all.length,
      active: all.filter((app) => app.status === "active").length,
      unverified: all.filter((app) => app.status === "unverified").length,
      pending: all.filter((app) => app.status === "pending" || app.status === "unpublished").length,
    };
  }, [apps]);

  const openTasks = useMemo(
    () => (tasks ?? []).filter((task) => task.status !== "hecha").slice(0, 5),
    [tasks],
  );

  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  async function handleVerify(id: string, name: string, url: string | null) {
    if (!url) return;
    setVerifyingId(id);
    try {
      const result = await verify.mutateAsync({ id, type: "app", name, url });
      const label = CHECK_RESULT_META[result.result as CheckResult]?.label ?? result.result;
      if (result.result === "reachable") {
        toast.success(`${name}: ${label}`);
      } else {
        toast.warning(`${name}: ${label}`, { description: result.detail });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo verificar.");
    } finally {
      setVerifyingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="panel relative overflow-hidden">
        <div className="surface-grid absolute inset-0 opacity-60" />
        <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {today}
            </p>
            <h2 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Hola{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}. Este es tu
              centro de control.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Todas las aplicaciones de Financia Sonora, con su plataforma, su cuenta y su estado
              real. Los núcleos siguen siendo sistemas independientes: desde aquí se abren y se
              supervisan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/chat">
                <MessageSquare className="h-4 w-4" />
                Matriz de IA
              </Link>
            </Button>
            {canEdit ? (
              <Button
                variant="outlineMuted"
                onClick={() => {
                  setEditingApp(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Nueva aplicación
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Aplicaciones" value={stats.total} icon={LayoutGrid} tone="primary" hint="Registradas en el portal" />
        <StatCard label="Activas" value={stats.active} icon={CheckCircle2} tone="success" hint="Con acceso verificado" />
        <StatCard label="Por verificar" value={stats.unverified} icon={CircleAlert} tone="warning" hint="Sin confirmar enlace" />
        <StatCard label="Pendientes" value={stats.pending} icon={Clock} tone="info" hint="En desarrollo o sin publicar" />
      </section>

      <section>
        <SectionTitle
          title="Núcleos centrales"
          count={cores.length}
          action={
            <Button asChild variant="ghost" size="xs">
              <Link to="/nucleos">
                Ver todos
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          }
        />
        {appsLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-[230px] rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cores.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                canEdit={canEdit}
                verifying={verifyingId === app.id}
                onEdit={() => {
                  setEditingApp(app);
                  setFormOpen(true);
                }}
                onDelete={() => {
                  if (window.confirm(`¿Eliminar la ficha de ${app.name}?`)) {
                    void deleteApp.mutateAsync(app.id).then(() => toast.success("Ficha eliminada"));
                  }
                }}
                onVerify={() => void handleVerify(app.id, app.name, app.app_url)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <section>
          <SectionTitle
            title="Tareas abiertas"
            count={openTasks.length}
            action={
              <Button asChild variant="ghost" size="xs">
                <Link to="/tareas">
                  Ver tablero
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />
          <div className="panel divide-y divide-border/60">
            {openTasks.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Sin tareas abiertas. Todo al día.
              </p>
            ) : (
              openTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      task.priority === "alta"
                        ? "bg-destructive"
                        : task.priority === "media"
                          ? "bg-warning"
                          : "bg-muted-foreground",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {task.assignee || "Sin responsable"} ·{" "}
                      {task.status === "en_curso"
                        ? "En curso"
                        : task.status === "bloqueada"
                          ? "Bloqueada"
                          : "Pendiente"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",
                      PRIORITY_META[task.priority]?.badge,
                    )}
                  >
                    {PRIORITY_META[task.priority]?.label}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <SectionTitle
            title="Agentes disponibles"
            count={(agents ?? []).length}
            action={
              <Button asChild variant="ghost" size="xs">
                <Link to="/chat">
                  Abrir matriz
                  <Sparkles className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {(agents ?? []).map((agent) => (
              <Link
                key={agent.id}
                to="/chat"
                className="panel flex items-start gap-3 p-3 transition-colors hover:border-primary/40"
              >
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-md border bg-gradient-to-br text-xs font-semibold",
                    AGENT_ACCENTS[agent.accent] ?? AGENT_ACCENTS.blue,
                  )}
                >
                  {agent.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{agent.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{agent.provider}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground/80">
                    {agent.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {(agents ?? []).length === 0 ? (
            <div className="panel flex items-center gap-2 p-4 text-xs text-muted-foreground">
              <TriangleAlert className="h-4 w-4 text-warning" />
              Aún no hay agentes registrados.
            </div>
          ) : null}
        </section>
      </div>

      <section className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-muted/50 text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Verificación real, sin simulaciones</p>
            <p className="text-xs text-muted-foreground">
              El portal consulta cada enlace desde el servidor. Si un sistema pide iniciar sesión o no
              responde, lo dice tal cual.
            </p>
          </div>
        </div>
        <Button asChild variant="outlineMuted" size="sm">
          <Link to="/aplicaciones">Revisar aplicaciones</Link>
        </Button>
      </section>

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

import { CheckCircle2, Moon, Palette, ShieldCheck, Sun, TriangleAlert } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useAgents, useApps, useCheckLogs, useProfiles, useTasks } from "@/hooks/use-portal-data";
import { PageHeader, SectionTitle, StatCard } from "@/components/portal/layout-bits";
import { RoleBadge } from "@/components/portal/badges";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { CHECK_RESULT_META, formatDateTime } from "@/lib/portal-ui";
import type { CheckResult } from "@/lib/portal-types";
import { cn } from "@/lib/utils";

const RULES = [
  "No se guardan contraseñas de plataformas externas; solo correos y notas de acceso.",
  "La verificación confirma alcance y autenticación, no contenido privado.",
  "Cada núcleo conserva su propio inicio de sesión: el portal no promete acceso automático.",
  "Los permisos se validan del lado del servidor, no en el navegador.",
];

export default function Configuracion() {
  const { profile, role, isAdmin } = useAuth();
  const { data: apps } = useApps();
  const { data: agents } = useAgents();
  const { data: tasks } = useTasks();
  const { data: profiles } = useProfiles();
  const { data: logs } = useCheckLogs();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configuración"
        description="Identidad del portal, preferencias de tema y registro de verificaciones. Las reglas de seguridad no son opcionales."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Aplicaciones" value={(apps ?? []).length} icon={Palette} tone="primary" />
        <StatCard label="Agentes" value={(agents ?? []).length} icon={CheckCircle2} tone="info" />
        <StatCard label="Tareas" value={(tasks ?? []).length} icon={CheckCircle2} tone="success" />
        <StatCard label="Usuarios" value={(profiles ?? []).length} icon={ShieldCheck} tone="muted" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle title="Identidad del portal" />
          <div className="panel space-y-3 p-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-primary to-info text-xs font-bold text-primary-foreground">
                FS
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Financia Sonora</p>
                <p className="text-[11px] text-muted-foreground">Portal de Acceso Único</p>
              </div>
            </div>
            <div className="grid gap-2 border-t border-border/60 pt-3 text-muted-foreground">
              <p>
                <span className="text-foreground">Sesión:</span> {profile?.email ?? "Sin sesión"}
              </p>
              <p className="flex items-center gap-2">
                <span className="text-foreground">Tu permiso:</span>
                <RoleBadge role={role} />
              </p>
              <p>
                <span className="text-foreground">Administración de usuarios:</span>{" "}
                {isAdmin ? "habilitada" : "solo el administrador puede cambiar permisos"}
              </p>
            </div>
          </div>
        </section>

        <section>
          <SectionTitle title="Apariencia" />
          <div className="panel space-y-3 p-4">
            <p className="text-xs text-muted-foreground">
              El portal se abre en tema oscuro. El cambio se guarda en este navegador.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={theme === "dark" ? "default" : "outlineMuted"}
                className="justify-start"
                onClick={() => setTheme("dark")}
              >
                <Moon className="h-4 w-4" />
                Oscuro
              </Button>
              <Button
                variant={theme === "light" ? "default" : "outlineMuted"}
                className="justify-start"
                onClick={() => setTheme("light")}
              >
                <Sun className="h-4 w-4" />
                Claro
              </Button>
            </div>
          </div>
        </section>
      </div>

      <section>
        <SectionTitle title="Reglas del portal" />
        <div className="panel divide-y divide-border/50">
          {RULES.map((rule) => (
            <div key={rule} className="flex items-start gap-2.5 px-4 py-3">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-muted-foreground">{rule}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Registro de verificaciones" count={(logs ?? []).length} />
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead>
              <tr className="border-b border-border/70 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Sistema</th>
                <th className="px-4 py-2.5 font-semibold">Resultado</th>
                <th className="px-4 py-2.5 font-semibold">Detalle</th>
                <th className="px-4 py-2.5 font-semibold">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((log) => {
                const meta = CHECK_RESULT_META[log.result as CheckResult];
                return (
                  <tr key={log.id} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-2.5 text-foreground">{log.target_name ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px]",
                          meta?.badge ?? "border-border text-muted-foreground",
                        )}
                      >
                        {meta?.label ?? log.result}
                      </span>
                    </td>
                    <td className="max-w-[240px] truncate px-4 py-2.5 text-muted-foreground">
                      {log.detail || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatDateTime(log.checked_at)}
                    </td>
                  </tr>
                );
              })}
              {(logs ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Todavía no se ha verificado ningún enlace.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
          Si un enlace aparece como "no disponible" puede deberse a bloqueo del proveedor, a un
          preview privado o a que la app cambió de dirección.
        </p>
      </section>
    </div>
  );
}

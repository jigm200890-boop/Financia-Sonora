import { useMemo } from "react";
import { AtSign, KeyRound, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useApps, useProfiles, useSetRole } from "@/hooks/use-portal-data";
import { PageHeader, SectionTitle } from "@/components/portal/layout-bits";
import { RoleBadge } from "@/components/portal/badges";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/portal-ui";
import type { Role } from "@/lib/portal-types";

export default function Cuentas() {
  const { isAdmin, profile: me } = useAuth();
  const { data: apps } = useApps();
  const { data: profiles, isLoading } = useProfiles();
  const setRole = useSetRole();

  const accounts = useMemo(() => {
    const map = new Map<
      string,
      { owner: string; platforms: Set<string>; apps: string[]; active: number }
    >();
    for (const app of apps ?? []) {
      const owner = app.owner_account || "Sin cuenta asignada";
      if (!map.has(owner)) {
        map.set(owner, { owner, platforms: new Set(), apps: [], active: 0 });
      }
      const entry = map.get(owner)!;
      entry.platforms.add(app.platform);
      entry.apps.push(app.name);
      if (app.status === "active") entry.active += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.apps.length - a.apps.length);
  }, [apps]);

  async function handleRole(id: string, role: string) {
    try {
      await setRole.mutateAsync({ id, role: role as Role });
      toast.success("Permiso actualizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar el permiso.");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cuentas y usuarios"
        description="Los correos y cuentas propietarias de cada plataforma, más quién puede entrar al portal y con qué permiso."
      />

      <section>
        <SectionTitle title="Cuentas por plataforma" count={accounts.length} />
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Cuenta</th>
                <th className="px-4 py-2.5 font-semibold">Plataformas</th>
                <th className="px-4 py-2.5 font-semibold">Aplicaciones</th>
                <th className="px-4 py-2.5 font-semibold">Activas</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.owner} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <AtSign className="h-3 w-3 text-muted-foreground" />
                      {account.owner}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {Array.from(account.platforms).map((platform) => (
                        <span
                          key={platform}
                          className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {account.apps.join(", ")}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {account.active} de {account.apps.length}
                  </td>
                </tr>
              ))}
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    Aún no hay cuentas registradas en las fichas de aplicaciones.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <KeyRound className="mt-0.5 h-3 w-3 shrink-0" />
          Solo se guardan correos y notas. El portal no almacena contraseñas de plataformas externas.
        </p>
      </section>

      <section>
        <SectionTitle title="Usuarios del portal" count={(profiles ?? []).length} />
        {isLoading ? (
          <Skeleton className="h-[160px] rounded-lg" />
        ) : (
          <div className="panel divide-y divide-border/60">
            {(profiles ?? []).map((profile) => (
              <div
                key={profile.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold uppercase text-primary">
                    {(profile.full_name || profile.email).slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {profile.full_name || profile.email}
                      {profile.id === me?.id ? (
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          tú
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">{profile.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden text-[11px] text-muted-foreground sm:block">
                    Alta {formatDateTime(profile.created_at)}
                  </span>
                  {isAdmin ? (
                    <Select value={profile.role} onValueChange={(value) => void handleRole(profile.id, value)}>
                      <SelectTrigger className="h-8 w-[150px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="editor">Colaborador</SelectItem>
                        <SelectItem value="viewer">Solo lectura</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <RoleBadge role={profile.role as Role} />
                  )}
                </div>
              </div>
            ))}
            {(profiles ?? []).length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                Sin usuarios registrados todavía.
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="panel flex items-start gap-3 p-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-primary/30 bg-primary/10 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Cómo funcionan los permisos</p>
          <p className="mt-1">
            El primer usuario registrado queda como administrador. El administrador puede cambiar
            permisos; el colaborador trabaja en apps, conocimiento, tareas, flujos y matriz; el
            usuario de solo lectura consulta todo sin modificar ni verificar.
          </p>
        </div>
        {isAdmin ? (
          <Button variant="ghost" size="xs" className="ml-auto hidden sm:flex" disabled>
            <Users className="h-3.5 w-3.5" />
            {profiles?.length ?? 0} usuarios
          </Button>
        ) : null}
      </section>
    </div>
  );
}

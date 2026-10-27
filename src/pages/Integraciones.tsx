import { useEffect, useState } from "react";
import {
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import {
  useDeleteIntegration,
  useIntegrations,
  useSaveIntegration,
  useVerifyTarget,
} from "@/hooks/use-portal-data";
import { EmptyState, PageHeader } from "@/components/portal/layout-bits";
import { CheckBadge } from "@/components/portal/badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CHECK_RESULT_META, formatDateTime } from "@/lib/portal-ui";
import type { CheckResult, IntegrationRow } from "@/lib/portal-types";
import { cn } from "@/lib/utils";

export default function Integraciones() {
  const { canEdit } = useAuth();
  const { data: integrations, isLoading } = useIntegrations();
  const remove = useDeleteIntegration();
  const verify = useVerifyTarget();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IntegrationRow | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  async function handleVerify(integration: IntegrationRow) {
    if (!integration.url) {
      toast.warning("Esta integración no tiene URL para verificar.");
      return;
    }
    setVerifyingId(integration.id);
    try {
      const result = await verify.mutateAsync({
        id: integration.id,
        type: "integration",
        name: integration.name,
        url: integration.url,
      });
      const label = CHECK_RESULT_META[result.result as CheckResult]?.label ?? result.result;
      if (result.result === "reachable") toast.success(`${integration.name}: ${label}`);
      else toast.warning(`${integration.name}: ${label}`, { description: result.detail });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo verificar.");
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleDelete(integration: IntegrationRow) {
    if (!window.confirm(`¿Eliminar la integración "${integration.name}"?`)) return;
    try {
      await remove.mutateAsync(integration.id);
      toast.success("Integración eliminada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Integraciones"
        description="Conexiones reales, pendientes e informativas. Se registra lo que existe; no se simula intercambio de datos."
      >
        {canEdit ? (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nueva integración
          </Button>
        ) : null}
      </PageHeader>

      <div className="panel mb-6 flex items-start gap-3 border-warning/30 bg-warning/5 p-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-warning/40 bg-warning/10 text-warning">
          <TriangleAlert className="h-4 w-4" />
        </span>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Verificar confirma si el servicio responde y si exige autenticación. No sincroniza datos:
          eso requiere una API autorizada por cada plataforma, y se activará cuando exista.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-[180px] rounded-lg" />
          ))}
        </div>
      ) : (integrations ?? []).length === 0 ? (
        <EmptyState
          icon={Link2}
          title="Sin integraciones registradas"
          description="Registra las conexiones que ya existen y marca su estado real."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(integrations ?? []).map((integration) => (
            <article key={integration.id} className="panel flex h-full flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {integration.name}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {integration.kind} · {integration.owner || "Responsable por definir"}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    integration.status === "active"
                      ? "border-success/40 bg-success/10 text-success"
                      : integration.status === "pending"
                        ? "border-warning/40 bg-warning/10 text-warning"
                        : "border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                >
                  {integration.status === "active"
                    ? "Activa"
                    : integration.status === "pending"
                      ? "Pendiente"
                      : "No disponible"}
                </span>
              </div>

              {integration.notes ? (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {integration.notes}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <CheckBadge result={integration.last_check_result} />
                <span className="text-[11px] text-muted-foreground">
                  {formatDateTime(integration.last_checked_at)}
                </span>
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                {canEdit ? (
                  <Button
                    size="xs"
                    variant="outlineMuted"
                    disabled={!integration.url || verifyingId === integration.id}
                    onClick={() => void handleVerify(integration)}
                  >
                    <RefreshCw
                      className={cn(
                        "h-3.5 w-3.5",
                        verifyingId === integration.id && "animate-spin",
                      )}
                    />
                    Verificar
                  </Button>
                ) : null}
                {integration.url ? (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      integration.url && window.open(integration.url, "_blank", "noopener")
                    }
                  >
                    Abrir servicio
                  </Button>
                ) : null}
                {canEdit ? (
                  <div className="ml-auto flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditing(integration);
                        setOpen(true);
                      }}
                      aria-label="Editar integración"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => void handleDelete(integration)}
                      aria-label="Eliminar integración"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <IntegrationDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setEditing(null);
        }}
        integration={editing}
      />
    </div>
  );
}

function IntegrationDialog({
  open,
  onOpenChange,
  integration,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: IntegrationRow | null;
}) {
  const save = useSaveIntegration();
  const [form, setForm] = useState({
    name: "",
    kind: "API",
    status: "pending",
    owner: "",
    url: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      name: integration?.name ?? "",
      kind: integration?.kind ?? "API",
      status: integration?.status ?? "pending",
      owner: integration?.owner ?? "",
      url: integration?.url ?? "",
      notes: integration?.notes ?? "",
    });
  }, [open, integration]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    try {
      await save.mutateAsync({
        id: integration?.id,
        values: {
          name: form.name.trim(),
          kind: form.kind,
          status: form.status,
          owner: form.owner.trim() || null,
          url: form.url.trim() || null,
          notes: form.notes.trim() || null,
        },
      });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{integration ? "Editar integración" : "Nueva integración"}</DialogTitle>
          <DialogDescription>
            Registra el tipo real de conexión. No se guardan claves en el navegador.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="integration-name">Nombre</Label>
            <Input
              id="integration-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Base44"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.kind} onValueChange={(value) => setForm({ ...form, kind: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="API">API</SelectItem>
                  <SelectItem value="Enlace autorizado">Enlace autorizado</SelectItem>
                  <SelectItem value="Informativa">Informativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm({ ...form, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="unavailable">No disponible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="integration-owner">Responsable</Label>
              <Input
                id="integration-owner"
                value={form.owner}
                onChange={(event) => setForm({ ...form, owner: event.target.value })}
                placeholder="Cuenta o área"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="integration-url">URL</Label>
              <Input
                id="integration-url"
                value={form.url}
                onChange={(event) => setForm({ ...form, url: event.target.value })}
                placeholder="https://…"
                inputMode="url"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="integration-notes">Notas</Label>
            <Textarea
              id="integration-notes"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              rows={2}
              placeholder="Qué se puede hacer hoy y qué falta"
            />
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

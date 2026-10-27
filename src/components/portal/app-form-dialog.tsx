import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { AppInsert, AppRow } from "@/lib/portal-types";
import { STATUS_META } from "@/lib/portal-ui";
import { useSaveApp } from "@/hooks/use-portal-data";
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
import { Textarea } from "@/components/ui/textarea";

const PLATFORMS = ["Hércules", "Base44", "Google", "Cappy", "Agentes IA", "Otra"];
const CATEGORIES = [
  "Núcleos centrales",
  "Aplicaciones de crédito y gestión",
  "Portal web y soporte",
  "Otra",
];

function splitList(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function AppFormDialog({
  open,
  onOpenChange,
  app,
  defaultCategory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: AppRow | null;
  defaultCategory?: string;
}) {
  const save = useSaveApp();
  const [form, setForm] = useState({
    name: "",
    platform: "Base44",
    category: defaultCategory ?? CATEGORIES[1],
    owner: "",
    summary: "",
    appUrl: "",
    builderUrl: "",
    status: "unverified",
    ready: "",
    pending: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      name: app?.name ?? "",
      platform: app?.platform ?? "Base44",
      category: app?.category ?? defaultCategory ?? CATEGORIES[1],
      owner: app?.owner_account ?? "",
      summary: app?.summary ?? "",
      appUrl: app?.app_url ?? "",
      builderUrl: app?.builder_url ?? "",
      status: app?.status ?? "unverified",
      ready: (app?.features_ready ?? []).join(", "),
      pending: (app?.features_pending ?? []).join(", "),
      notes: app?.notes ?? "",
    });
  }, [open, app, defaultCategory]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("El nombre de la aplicación es obligatorio.");
      return;
    }
    const values: AppInsert = {
      name: form.name.trim(),
      platform: form.platform,
      category: form.category,
      owner_account: form.owner.trim() || null,
      summary: form.summary.trim() || null,
      app_url: form.appUrl.trim() || null,
      builder_url: form.builderUrl.trim() || null,
      status: form.status,
      features_ready: splitList(form.ready),
      features_pending: splitList(form.pending),
      notes: form.notes.trim() || null,
      sort_order: app?.sort_order ?? 100,
    };
    try {
      await save.mutateAsync({ id: app?.id, values });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar la ficha.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{app ? "Editar ficha" : "Nueva aplicación"}</DialogTitle>
          <DialogDescription>
            Registra la plataforma, la cuenta propietaria y las URLs reales. Nada se marca como activo
            sin verificarlo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="app-name">Nombre</Label>
              <Input
                id="app-name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="FinanciaPro Sonora"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Plataforma</Label>
              <Select value={form.platform} onValueChange={(value) => update("platform", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(value) => update("status", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_META).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app-category">Categoría</Label>
              <Input
                id="app-category"
                list="app-categories"
                value={form.category}
                onChange={(event) => update("category", event.target.value)}
              />
              <datalist id="app-categories">
                {CATEGORIES.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app-owner">Cuenta propietaria</Label>
              <Input
                id="app-owner"
                value={form.owner}
                onChange={(event) => update("owner", event.target.value)}
                placeholder="correo o nombre de la cuenta"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="app-summary">Función</Label>
              <Textarea
                id="app-summary"
                value={form.summary}
                onChange={(event) => update("summary", event.target.value)}
                placeholder="Para qué sirve y qué resuelve"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app-url">URL de la aplicación</Label>
              <Input
                id="app-url"
                value={form.appUrl}
                onChange={(event) => update("appUrl", event.target.value)}
                placeholder="https://…"
                inputMode="url"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app-builder">URL del constructor</Label>
              <Input
                id="app-builder"
                value={form.builderUrl}
                onChange={(event) => update("builderUrl", event.target.value)}
                placeholder="https://… (opcional)"
                inputMode="url"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app-ready">Funciones disponibles</Label>
              <Input
                id="app-ready"
                value={form.ready}
                onChange={(event) => update("ready", event.target.value)}
                placeholder="Clientes, Préstamos, Pagos"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app-pending">Funciones pendientes</Label>
              <Input
                id="app-pending"
                value={form.pending}
                onChange={(event) => update("pending", event.target.value)}
                placeholder="Reportes, Publicación"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="app-notes">Notas de acceso</Label>
              <Textarea
                id="app-notes"
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                placeholder="Requiere cuenta propietaria, licencia, etc."
                rows={2}
              />
            </div>
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
              Guardar ficha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

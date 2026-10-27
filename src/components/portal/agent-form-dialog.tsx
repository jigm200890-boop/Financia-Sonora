import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { AgentInsert, AgentRow } from "@/lib/portal-types";
import { AI_MODEL_OPTIONS } from "@/lib/ai-models";
import { useSaveAgent } from "@/hooks/use-portal-data";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const ACCENTS = ["blue", "amber", "violet", "emerald", "rose"];

export function AgentFormDialog({
  open,
  onOpenChange,
  agent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentRow | null;
}) {
  const save = useSaveAgent();
  const [form, setForm] = useState({
    name: "",
    model: AI_MODEL_OPTIONS[0].model,
    description: "",
    responsibilities: "",
    tools: "",
    usesKnowledge: true,
    status: "active",
    accent: "blue",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      name: agent?.name ?? "",
      model: agent?.model ?? AI_MODEL_OPTIONS[0].model,
      description: agent?.description ?? "",
      responsibilities: agent?.responsibilities ?? "",
      tools: (agent?.tools ?? []).join(", "),
      usesKnowledge: agent?.uses_knowledge ?? true,
      status: agent?.status ?? "active",
      accent: agent?.accent ?? "blue",
    });
  }, [open, agent]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("El nombre del agente es obligatorio.");
      return;
    }
    const option = AI_MODEL_OPTIONS.find((item) => item.model === form.model) ?? AI_MODEL_OPTIONS[0];
    const values: AgentInsert = {
      name: form.name.trim(),
      provider: option.provider,
      model: option.model,
      protocol: option.protocol,
      description: form.description.trim() || null,
      responsibilities: form.responsibilities.trim() || null,
      tools: form.tools
        .split(",")
        .map((tool) => tool.trim())
        .filter(Boolean),
      uses_knowledge: form.usesKnowledge,
      status: form.status,
      accent: form.accent,
      sort_order: agent?.sort_order ?? 100,
    };
    try {
      await save.mutateAsync({ id: agent?.id, values });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar el agente.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{agent ? "Editar agente" : "Nuevo agente"}</DialogTitle>
          <DialogDescription>
            Define su función y qué herramientas tiene autorizadas. El motor de IA queda del lado del
            servidor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="agent-name">Nombre</Label>
            <Input
              id="agent-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Supagente"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Motor de IA</Label>
              <Select
                value={form.model}
                onValueChange={(value) => setForm({ ...form, model: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODEL_OPTIONS.map((option) => (
                    <SelectItem key={option.model} value={option.model}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Incluido en el plan del portal.
              </p>
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
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="paused">En pausa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="agent-description">Función</Label>
            <Input
              id="agent-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Consulta general y redacción ejecutiva"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="agent-responsibilities">Responsabilidades</Label>
            <Textarea
              id="agent-responsibilities"
              value={form.responsibilities}
              onChange={(event) => setForm({ ...form, responsibilities: event.target.value })}
              rows={3}
              placeholder="Qué resuelve y con qué criterio"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="agent-tools">Herramientas autorizadas</Label>
            <Input
              id="agent-tools"
              value={form.tools}
              onChange={(event) => setForm({ ...form, tools: event.target.value })}
              placeholder="Chat, Conocimiento, Tareas"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">Acceso al conocimiento</p>
                <p className="text-[11px] text-muted-foreground">Consulta la memoria compartida.</p>
              </div>
              <Switch
                checked={form.usesKnowledge}
                onCheckedChange={(checked) => setForm({ ...form, usesKnowledge: checked })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Color de identificación</Label>
              <Select
                value={form.accent}
                onValueChange={(value) => setForm({ ...form, accent: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCENTS.map((accent) => (
                    <SelectItem key={accent} value={accent}>
                      {accent === "blue"
                        ? "Azul"
                        : accent === "amber"
                          ? "Ámbar"
                          : accent === "violet"
                            ? "Violeta"
                            : accent === "emerald"
                              ? "Esmeralda"
                              : "Rosa"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              Guardar agente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

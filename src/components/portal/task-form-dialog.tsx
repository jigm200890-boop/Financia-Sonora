import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { TaskRow } from "@/lib/portal-types";
import { useApps, useAgents, useSaveTask } from "@/hooks/use-portal-data";
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

const NONE = "ninguno";

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskRow | null;
}) {
  const { data: apps } = useApps();
  const { data: agents } = useAgents();
  const save = useSaveTask();
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignee: "",
    status: "pendiente",
    priority: "media",
    dueDate: "",
    appId: NONE,
    agentId: NONE,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      title: task?.title ?? "",
      description: task?.description ?? "",
      assignee: task?.assignee ?? "",
      status: task?.status ?? "pendiente",
      priority: task?.priority ?? "media",
      dueDate: task?.due_date ?? "",
      appId: task?.app_id ?? NONE,
      agentId: task?.agent_id ?? NONE,
    });
  }, [open, task]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    try {
      await save.mutateAsync({
        id: task?.id,
        values: {
          title: form.title.trim(),
          description: form.description.trim() || null,
          assignee: form.assignee.trim() || null,
          status: form.status,
          priority: form.priority,
          due_date: form.dueDate || null,
          app_id: form.appId === NONE ? null : form.appId,
          agent_id: form.agentId === NONE ? null : form.agentId,
        },
      });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar la tarea.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
          <DialogDescription>
            Asigna responsable, prioridad y a qué aplicación o agente pertenece.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Confirmar la URL pública de PrestaCore"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-description">Descripción</Label>
            <Textarea
              id="task-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={3}
              placeholder="Qué hay que hacer y con qué criterio se da por terminado"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-assignee">Responsable</Label>
              <Input
                id="task-assignee"
                value={form.assignee}
                onChange={(event) => setForm({ ...form, assignee: event.target.value })}
                placeholder="Nombre o equipo"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">Fecha límite</Label>
              <Input
                id="task-due"
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en_curso">En curso</SelectItem>
                  <SelectItem value="bloqueada">Bloqueada</SelectItem>
                  <SelectItem value="hecha">Hecha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Select
                value={form.priority}
                onValueChange={(value) => setForm({ ...form, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Aplicación vinculada</Label>
              <Select value={form.appId} onValueChange={(value) => setForm({ ...form, appId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin vínculo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin vínculo</SelectItem>
                  {(apps ?? []).map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Agente vinculado</Label>
              <Select
                value={form.agentId}
                onValueChange={(value) => setForm({ ...form, agentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin vínculo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin vínculo</SelectItem>
                  {(agents ?? []).map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
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
              Guardar tarea
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

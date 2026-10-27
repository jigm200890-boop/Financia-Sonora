import { useEffect, useState } from "react";
import {
  ArrowRight,
  GitBranch,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useDeleteWorkflow, useSaveWorkflow, useWorkflows } from "@/hooks/use-portal-data";
import { EmptyState, PageHeader } from "@/components/portal/layout-bits";
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
import type { WorkflowRow, WorkflowStep } from "@/lib/portal-types";
import { cn } from "@/lib/utils";

const EMPTY_STEP: WorkflowStep = { title: "", detail: "", owner: "" };

export default function Flujos() {
  const { canEdit } = useAuth();
  const { data: workflows, isLoading } = useWorkflows();
  const remove = useDeleteWorkflow();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkflowRow | null>(null);

  async function handleDelete(workflow: WorkflowRow) {
    if (!window.confirm(`¿Eliminar el flujo "${workflow.name}"?`)) return;
    try {
      await remove.mutateAsync(workflow.id);
      toast.success("Flujo eliminado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Flujos de trabajo"
        description="Procesos con pasos ordenados: quién hace qué, en qué orden y con qué aplicación o agente. El diagrama se genera a partir de los pasos."
      >
        {canEdit ? (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo flujo
          </Button>
        ) : null}
      </PageHeader>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-[220px] rounded-lg" />
          <Skeleton className="h-[220px] rounded-lg" />
        </div>
      ) : (workflows ?? []).length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="Sin flujos registrados"
          description="Documenta el primer proceso: qué se hace, en qué orden y quién responde en cada paso."
        />
      ) : (
        <div className="space-y-4">
          {(workflows ?? []).map((workflow) => {
            const steps = Array.isArray(workflow.steps) ? (workflow.steps as WorkflowStep[]) : [];
            return (
              <article key={workflow.id} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">{workflow.name}</h3>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          workflow.status === "activo"
                            ? "border-success/40 bg-success/10 text-success"
                            : workflow.status === "pausado"
                              ? "border-warning/40 bg-warning/10 text-warning"
                              : "border-border bg-muted/50 text-muted-foreground",
                        )}
                      >
                        {workflow.status === "activo"
                          ? "Activo"
                          : workflow.status === "pausado"
                            ? "Pausado"
                            : "Borrador"}
                      </span>
                    </div>
                    <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                      {workflow.objective || "Sin objetivo descrito."}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <UserRound className="h-3 w-3" />
                      {workflow.owner || "Sin responsable"}
                    </p>
                  </div>
                  {canEdit ? (
                    <div className="flex gap-1.5">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setEditing(workflow);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => void handleDelete(workflow)}
                        aria-label={`Eliminar ${workflow.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex items-stretch gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {steps.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Sin pasos registrados.</p>
                  ) : (
                    steps.map((step, index) => (
                      <div key={`${workflow.id}-${index}`} className="flex items-center gap-2">
                        <div className="min-w-[190px] max-w-[230px] rounded-md border border-border/70 bg-card/70 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                            Paso {index + 1}
                          </p>
                          <p className="mt-1 text-xs font-medium leading-snug text-foreground">
                            {step.title || "Sin título"}
                          </p>
                          {step.detail ? (
                            <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                              {step.detail}
                            </p>
                          ) : null}
                          {step.owner ? (
                            <p className="mt-1.5 text-[10px] text-muted-foreground/80">
                              {step.owner}
                            </p>
                          ) : null}
                        </div>
                        {index < steps.length - 1 ? (
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <WorkflowDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setEditing(null);
        }}
        workflow={editing}
      />
    </div>
  );
}

function WorkflowDialog({
  open,
  onOpenChange,
  workflow,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: WorkflowRow | null;
}) {
  const save = useSaveWorkflow();
  const [form, setForm] = useState({
    name: "",
    objective: "",
    owner: "",
    status: "borrador",
    steps: [{ ...EMPTY_STEP }] as WorkflowStep[],
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const steps = Array.isArray(workflow?.steps)
      ? ((workflow?.steps as WorkflowStep[]) ?? [])
      : [];
    setForm({
      name: workflow?.name ?? "",
      objective: workflow?.objective ?? "",
      owner: workflow?.owner ?? "",
      status: workflow?.status ?? "borrador",
      steps: steps.length > 0 ? steps.map((step) => ({ ...step })) : [{ ...EMPTY_STEP }],
    });
  }, [open, workflow]);

  function updateStep(index: number, patch: Partial<WorkflowStep>) {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((step, position) =>
        position === index ? { ...step, ...patch } : step,
      ),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("El nombre del flujo es obligatorio.");
      return;
    }
    const steps = form.steps.filter((step) => step.title.trim());
    if (steps.length === 0) {
      setError("Agrega al menos un paso con título.");
      return;
    }
    try {
      await save.mutateAsync({
        id: workflow?.id,
        values: {
          name: form.name.trim(),
          objective: form.objective.trim() || null,
          owner: form.owner.trim() || null,
          status: form.status,
          steps,
        },
      });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo guardar el flujo.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{workflow ? "Editar flujo" : "Nuevo flujo"}</DialogTitle>
          <DialogDescription>
            Describe los pasos en orden. El diagrama del proceso se arma con ellos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="flow-name">Nombre</Label>
              <Input
                id="flow-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Alta de una aplicación nueva"
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="flow-objective">Objetivo</Label>
              <Input
                id="flow-objective"
                value={form.objective}
                onChange={(event) => setForm({ ...form, objective: event.target.value })}
                placeholder="Qué logra este proceso"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flow-owner">Responsable</Label>
              <Input
                id="flow-owner"
                value={form.owner}
                onChange={(event) => setForm({ ...form, owner: event.target.value })}
                placeholder="Área o persona"
              />
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
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Pasos</Label>
              <Button
                type="button"
                size="xs"
                variant="outlineMuted"
                onClick={() =>
                  setForm((prev) => ({ ...prev, steps: [...prev.steps, { ...EMPTY_STEP }] }))
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar paso
              </Button>
            </div>

            {form.steps.map((step, index) => (
              <div
                key={index}
                className="space-y-2 rounded-md border border-border/70 bg-muted/20 p-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <Input
                    value={step.title}
                    onChange={(event) => updateStep(index, { title: event.target.value })}
                    placeholder="Título del paso"
                    className="h-8"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        steps: prev.steps.filter((_, position) => position !== index),
                      }))
                    }
                    aria-label="Quitar paso"
                    disabled={form.steps.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={step.detail ?? ""}
                    onChange={(event) => updateStep(index, { detail: event.target.value })}
                    placeholder="Qué se hace en este paso"
                    className="h-8"
                  />
                  <Input
                    value={step.owner ?? ""}
                    onChange={(event) => updateStep(index, { owner: event.target.value })}
                    placeholder="Quién responde"
                    className="h-8"
                  />
                </div>
              </div>
            ))}
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
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar flujo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

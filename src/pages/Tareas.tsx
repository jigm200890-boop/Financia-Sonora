import { useMemo, useState } from "react";
import { CalendarDays, ListChecks, MoreHorizontal, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useApps, useAgents, useDeleteTask, useSaveTask, useTasks } from "@/hooks/use-portal-data";
import { PageHeader } from "@/components/portal/layout-bits";
import { TaskFormDialog } from "@/components/portal/task-form-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { PRIORITY_META, TASK_COLUMNS, formatDate, formatDateTime } from "@/lib/portal-ui";
import type { TaskRow } from "@/lib/portal-types";
import { cn } from "@/lib/utils";

export default function Tareas() {
  const { canEdit } = useAuth();
  const { data: tasks, isLoading } = useTasks();
  const { data: apps } = useApps();
  const { data: agents } = useAgents();
  const save = useSaveTask();
  const remove = useDeleteTask();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);

  const appName = (id: string | null) => (apps ?? []).find((app) => app.id === id)?.name;
  const agentName = (id: string | null) => (agents ?? []).find((agent) => agent.id === id)?.name;

  const grouped = useMemo(
    () =>
      TASK_COLUMNS.map((column) => ({
        ...column,
        items: (tasks ?? []).filter((task) => task.status === column.id),
      })),
    [tasks],
  );

  async function moveTask(task: TaskRow, status: string) {
    try {
      await save.mutateAsync({
        id: task.id,
        values: {
          title: task.title,
          description: task.description,
          assignee: task.assignee,
          status,
          priority: task.priority,
          due_date: task.due_date,
          app_id: task.app_id,
          agent_id: task.agent_id,
        },
      });
      toast.success("Estado actualizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Tareas"
        description="Actividades con responsable, prioridad y vínculo a una aplicación o a un agente. El contador del menú sale de aquí."
      >
        {canEdit ? (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nueva tarea
          </Button>
        ) : null}
      </PageHeader>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-[300px] rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {grouped.map((column) => (
            <section key={column.id} className="panel flex flex-col p-2.5">
              <header className="mb-2 flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full", column.accent)} />
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
                    {column.label}
                  </h3>
                </div>
                <span className="rounded-full border border-border bg-muted/50 px-1.5 text-[10px] text-muted-foreground">
                  {column.items.length}
                </span>
              </header>

              <div className="flex-1 space-y-2">
                {column.items.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border/70 px-2 py-6 text-center text-[11px] text-muted-foreground">
                    Sin tareas
                  </p>
                ) : (
                  column.items.map((task) => (
                    <article
                      key={task.id}
                      className="rounded-md border border-border/70 bg-card/70 p-2.5 transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <p
                          className={cn(
                            "text-[13px] font-medium leading-snug text-foreground",
                            task.status === "hecha" && "line-through opacity-60",
                          )}
                        >
                          {task.title}
                        </p>
                        {canEdit ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                                <span className="sr-only">Acciones</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(task);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  if (window.confirm(`¿Eliminar "${task.title}"?`)) {
                                    void remove
                                      .mutateAsync(task.id)
                                      .then(() => toast.success("Tarea eliminada"))
                                      .catch((error: unknown) =>
                                        toast.error(
                                          error instanceof Error
                                            ? error.message
                                            : "No se pudo eliminar.",
                                        ),
                                      );
                                  }
                                }}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>

                      {task.description ? (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                          {task.description}
                        </p>
                      ) : null}

                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <span
                          className={cn(
                            "rounded-full border px-1.5 py-0.5 text-[10px]",
                            PRIORITY_META[task.priority]?.badge,
                          )}
                        >
                          {PRIORITY_META[task.priority]?.label}
                        </span>
                        {task.app_id ? (
                          <span className="rounded-full border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {appName(task.app_id) ?? "Aplicación"}
                          </span>
                        ) : null}
                        {task.agent_id ? (
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                            {agentName(task.agent_id) ?? "Agente"}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <UserRound className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{task.assignee || "Sin responsable"}</span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1">
                          <CalendarDays className="h-2.5 w-2.5" />
                          {task.due_date ? formatDate(task.due_date) : "Sin fecha"}
                        </span>
                      </div>

                      {canEdit ? (
                        <select
                          value={task.status}
                          onChange={(event) => void moveTask(task, event.target.value)}
                          className="mt-2 w-full rounded border border-border bg-background px-1.5 py-1 text-[10px] text-muted-foreground"
                          aria-label="Cambiar estado"
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="en_curso">En curso</option>
                          <option value="bloqueada">Bloqueada</option>
                          <option value="hecha">Hecha</option>
                        </select>
                      ) : (
                        <p className="mt-2 text-[10px] text-muted-foreground">
                          Actualizado {formatDateTime(task.updated_at)}
                        </p>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {(tasks ?? []).length === 0 && !isLoading ? (
        <div className="panel mt-3 flex items-center gap-2 p-4 text-xs text-muted-foreground">
          <ListChecks className="h-4 w-4" />
          Aún no hay tareas. Crea una desde aquí o desde una respuesta de la matriz de IA.
        </div>
      ) : null}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        task={editing}
      />
    </div>
  );
}

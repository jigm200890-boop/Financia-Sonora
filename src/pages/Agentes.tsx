import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Brain, MessageSquare, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useAgents, useDeleteAgent } from "@/hooks/use-portal-data";
import { EmptyState, PageHeader } from "@/components/portal/layout-bits";
import { AgentFormDialog } from "@/components/portal/agent-form-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AGENT_ACCENTS } from "@/lib/portal-ui";
import { modelLabel } from "@/lib/ai-models";
import type { AgentRow } from "@/lib/portal-types";
import { cn } from "@/lib/utils";

export default function Agentes() {
  const { canEdit } = useAuth();
  const { data: agents, isLoading } = useAgents();
  const remove = useDeleteAgent();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AgentRow | null>(null);

  async function handleDelete(agent: AgentRow) {
    if (!window.confirm(`¿Eliminar al agente ${agent.name}? Sus conversaciones se conservan.`)) return;
    try {
      await remove.mutateAsync(agent.id);
      toast.success("Agente eliminado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Agentes IA"
        description="Cada agente tiene una función, herramientas autorizadas y acceso opcional a la memoria compartida. Los agentes activos aparecen como columnas en la matriz."
      >
        {canEdit ? (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo agente
          </Button>
        ) : null}
        <Button asChild variant="outlineMuted">
          <Link to="/chat">
            <MessageSquare className="h-4 w-4" />
            Abrir matriz
          </Link>
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-[260px] rounded-lg" />
          ))}
        </div>
      ) : (agents ?? []).length === 0 ? (
        <EmptyState
          icon={Bot}
          title="Todavía no hay agentes"
          description="Registra el primero con su función y sus herramientas autorizadas para que aparezca en la matriz."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(agents ?? []).map((agent) => (
            <article
              key={agent.id}
              className="panel flex h-full flex-col p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-lg border bg-gradient-to-br text-xs font-bold",
                    AGENT_ACCENTS[agent.accent] ?? AGENT_ACCENTS.blue,
                  )}
                >
                  {agent.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] font-semibold text-foreground">{agent.name}</h3>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {agent.provider} · {modelLabel(agent.model)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    agent.status === "active"
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-border bg-muted/60 text-muted-foreground",
                  )}
                >
                  {agent.status === "active" ? "Activo" : "En pausa"}
                </span>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {agent.description || "Sin función descrita."}
              </p>

              {agent.responsibilities ? (
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80">
                  {agent.responsibilities}
                </p>
              ) : null}

              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {agent.tools.map((tool) => (
                    <span
                      key={tool}
                      className="inline-flex items-center gap-1 rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      <Wrench className="h-2.5 w-2.5" />
                      {tool}
                    </span>
                  ))}
                </div>
                <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Brain className="h-3 w-3" />
                  {agent.uses_knowledge
                    ? "Con acceso al conocimiento compartido"
                    : "Sin acceso al conocimiento"}
                </p>
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                <Button asChild size="xs" variant="outlineMuted">
                  <Link to="/chat">Abrir en la matriz</Link>
                </Button>
                {canEdit ? (
                  <>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        setEditing(agent);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => void handleDelete(agent)}
                      aria-label={`Eliminar ${agent.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <AgentFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        agent={editing}
      />
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookMarked,
  Check,
  ListPlus,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import {
  insertMessage,
  useAgents,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useSaveDocument,
  useSaveTask,
  useWorlds,
} from "@/hooks/use-portal-data";
import { PageHeader } from "@/components/portal/layout-bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AGENT_ACCENTS } from "@/lib/portal-ui";
import { modelLabel } from "@/lib/ai-models";
import type { AgentRow, MessageRow } from "@/lib/portal-types";
import { cn } from "@/lib/utils";

type PendingMap = Record<string, boolean>;
type ErrorMap = Record<string, string | null>;

const MATRIX_SELECTION_KEY = "portal-matrix-enabled-agents";

function readSelection(): string[] | null {
  try {
    const raw = window.localStorage.getItem(MATRIX_SELECTION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return null;
  }
}

const SUGGESTIONS = [
  "Resume en qué estado está el ecosistema y qué falta por confirmar.",
  "Propón el orden de trabajo para la próxima semana.",
  "Revisa los riesgos de las fichas marcadas como pendientes.",
];

export default function MatrizIA() {
  const { canEdit } = useAuth();
  const { data: agents } = useAgents();
  const { data: worlds } = useWorlds();
  const { data: conversations } = useConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const saveDocument = useSaveDocument();
  const saveTask = useSaveTask();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<PendingMap>({});
  const [errors, setErrors] = useState<ErrorMap>({});
  const [enabledIds, setEnabledIds] = useState<string[] | null>(readSelection);
  const [savingMessage, setSavingMessage] = useState<MessageRow | null>(null);
  const [noteName, setNoteName] = useState("");
  const [noteWorld, setNoteWorld] = useState<string>("none");
  const [contextWorld, setContextWorld] = useState<string>("none");

  const atlasAgent = useMemo(
    () => (agents ?? []).find((agent) => agent.name === "Atlas") ?? null,
    [agents],
  );

  useEffect(() => {
    if (enabledIds !== null || !agents) return;
    const fallback = atlasAgent?.id ?? agents.find((agent) => agent.status === "active")?.id;
    setEnabledIds(fallback ? [fallback] : []);
  }, [agents, atlasAgent, enabledIds]);

  useEffect(() => {
    if (enabledIds) {
      window.localStorage.setItem(MATRIX_SELECTION_KEY, JSON.stringify(enabledIds));
    }
  }, [enabledIds]);

  const activeAgents = useMemo(
    () =>
      (agents ?? []).filter(
        (agent) =>
          agent.status === "active" &&
          (agent.id === atlasAgent?.id || (enabledIds ?? []).includes(agent.id)),
      ),
    [agents, enabledIds, atlasAgent],
  );

  useEffect(() => {
    if (conversationId) return;
    if ((conversations ?? []).length > 0) {
      setConversationId(conversations![0].id);
    }
  }, [conversations, conversationId]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let active = true;
    void supabase
      .from("portal_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (active) setMessages(data ?? []);
      });
    return () => {
      active = false;
    };
  }, [conversationId]);

  function toggleAgent(id: string) {
    if (id === atlasAgent?.id) {
      toast.info("Atlas es el motor de dirección y permanece activo.");
      return;
    }
    setEnabledIds((prev) => {
      const base = prev ?? [];
      return base.includes(id) ? base.filter((value) => value !== id) : [...base, id];
    });
  }

  async function knowledgeContext() {
    if (contextWorld === "none") return "";
    const { data } = await supabase
      .from("portal_knowledge_items")
      .select("name, content")
      .eq("world_id", contextWorld)
      .not("content", "is", null)
      .order("updated_at", { ascending: false })
      .limit(4);
    return (data ?? [])
      .map((item) => `### ${item.name}\n${item.content ?? ""}`)
      .join("\n\n")
      .slice(0, 6000);
  }

  async function ensureConversation(firstMessage: string) {
    if (conversationId) return conversationId;
    const title = firstMessage.slice(0, 60) || "Nueva conversación";
    const conversation = await createConversation.mutateAsync(title);
    setConversationId(conversation.id);
    return conversation.id;
  }

  async function handleSend() {
    const content = input.trim();
    if (!content) return;
    if (activeAgents.length === 0) {
      toast.warning("Activa al menos un agente para enviar.");
      return;
    }

    const conversation = await ensureConversation(content);
    const previous = messages;
    const userMessage: MessageRow = {
      id: crypto.randomUUID(),
      conversation_id: conversation,
      agent_id: null,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    setInput("");
    setMessages([...previous, userMessage]);
    void insertMessage({
      conversationId: conversation,
      agentId: null,
      role: "user",
      content,
    }).catch(() => toast.error("No se pudo guardar tu mensaje en el historial."));

    const knowledge = await knowledgeContext();
    const targets = [...activeAgents];
    setPending(Object.fromEntries(targets.map((agent) => [agent.id, true])));
    setErrors({});

    await Promise.all(
      targets.map(async (agent) => {
        const history = [...previous, userMessage]
          .filter((message) => message.role === "user" || message.agent_id === agent.id)
          .map((message) => ({ role: message.role, content: message.content }));

        try {
          const { data, error } = await supabase.functions.invoke("ai-matrix", {
            body: {
              model: agent.model,
              agentName: agent.name,
              responsibilities: agent.responsibilities ?? agent.description ?? "",
              knowledge: agent.uses_knowledge ? knowledge : "",
              messages: history,
            },
            headers: { "X-Session-ID": conversation },
          });
          if (error) throw new Error(error.message ?? "El agente no respondió.");
          const payload = data as { text?: string; error?: string };
          if (payload?.error) throw new Error(payload.error);
          if (!payload?.text) throw new Error("El agente no devolvió texto.");

          const assistantMessage: MessageRow = {
            id: crypto.randomUUID(),
            conversation_id: conversation,
            agent_id: agent.id,
            role: "assistant",
            content: payload.text,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          await insertMessage({
            conversationId: conversation,
            agentId: agent.id,
            role: "assistant",
            content: payload.text,
          });
        } catch (caught) {
          const message =
            caught instanceof Error ? caught.message : "El agente no pudo responder.";
          setErrors((prev) => ({ ...prev, [agent.id]: message }));
        } finally {
          setPending((prev) => ({ ...prev, [agent.id]: false }));
        }
      }),
    );
  }

  async function handleNewConversation() {
    try {
      const conversation = await createConversation.mutateAsync("Nueva conversación");
      setConversationId(conversation.id);
      setMessages([]);
      setErrors({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la conversación.");
    }
  }

  async function handleDeleteConversation() {
    if (!conversationId) return;
    if (!window.confirm("¿Eliminar esta conversación y sus mensajes del historial?")) return;
    try {
      await deleteConversation.mutateAsync(conversationId);
      setConversationId(null);
      setMessages([]);
      toast.success("Conversación eliminada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
    }
  }

  function openSaveNote(message: MessageRow) {
    const agent = (agents ?? []).find((item) => item.id === message.agent_id);
    setSavingMessage(message);
    setNoteName(
      `Nota de ${agent?.name ?? "agente"} · ${new Date().toLocaleDateString("es-MX")}`,
    );
    setNoteWorld(contextWorld !== "none" ? contextWorld : ((worlds ?? [])[0]?.id ?? "none"));
  }

  async function confirmSaveNote() {
    if (!savingMessage) return;
    try {
      const agent = (agents ?? []).find((item) => item.id === savingMessage.agent_id);
      await saveDocument.mutateAsync({
        name: noteName.trim() || "Nota del chat",
        content: `${savingMessage.content}\n\n— ${agent?.name ?? "Agente"}, portal de Financia Sonora`,
        folderId: null,
        worldId: noteWorld === "none" ? null : noteWorld,
      });
      toast.success("Guardado en el conocimiento");
      setSavingMessage(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la nota.");
    }
  }

  async function createTaskFrom(message: MessageRow) {
    const title = message.content.split("\n")[0].slice(0, 90);
    try {
      await saveTask.mutateAsync({
        values: {
          title: title || "Seguimiento desde la matriz de IA",
          description: message.content,
          status: "pendiente",
          priority: "media",
          assignee: "Equipo Financia Sonora",
          agent_id: message.agent_id,
        },
      });
      toast.success("Tarea creada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la tarea.");
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col lg:h-[calc(100dvh-7rem)] lg:min-h-[600px]">
      <PageHeader
        title="Matriz de IA"
        description="La misma pregunta a varios agentes a la vez, cada uno en su columna. Todo se guarda en el historial del portal."
      >
        <Select
          value={conversationId ?? ""}
          onValueChange={(value) => setConversationId(value)}
        >
          <SelectTrigger className="h-9 w-[220px]">
            <SelectValue placeholder="Sin conversaciones" />
          </SelectTrigger>
          <SelectContent>
            {(conversations ?? []).map((conversation) => (
              <SelectItem key={conversation.id} value={conversation.id}>
                {conversation.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canEdit ? (
          <>
            <Button variant="outlineMuted" size="sm" onClick={() => void handleNewConversation()}>
              <Plus className="h-4 w-4" />
              Nueva
            </Button>
            {conversationId ? (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => void handleDeleteConversation()}
                aria-label="Eliminar conversación"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </>
        ) : null}
      </PageHeader>

      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Agentes activos
        </span>
        {(agents ?? []).map((agent) => {
          const pinned = agent.id === atlasAgent?.id;
          const enabled = pinned || (enabledIds ?? []).includes(agent.id);
          return (
            <button
              key={agent.id}
              onClick={() => toggleAgent(agent.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                enabled
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              {enabled ? <Check className="h-3 w-3" /> : null}
              {agent.name}
              {pinned ? <span className="text-[9px] opacity-70">fijo</span> : null}
            </button>
          );
        })}
        {(agents ?? []).length === 0 ? (
          <span className="text-xs text-muted-foreground">
            Registra agentes en la sección Agentes IA.
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Contexto
          </span>
          <Select value={contextWorld} onValueChange={setContextWorld}>
            <SelectTrigger className="h-8 w-[190px] text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin conocimiento</SelectItem>
              {(worlds ?? []).map((world) => (
                <SelectItem key={world.id} value={world.id}>
                  {world.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className={cn(
          "grid flex-1 gap-3 lg:min-h-0 lg:overflow-hidden",
          activeAgents.length <= 1 ? "grid-cols-1" : "lg:grid-cols-2 xl:grid-cols-4",
        )}
      >
        {activeAgents.map((agent) => (
          <AgentColumn
            key={agent.id}
            agent={agent}
            messages={messages}
            pending={!!pending[agent.id]}
            error={errors[agent.id] ?? null}
            canEdit={canEdit}
            onSaveNote={openSaveNote}
            onCreateTask={(message) => void createTaskFrom(message)}
          />
        ))}
        {activeAgents.length === 0 ? (
          <div className="panel grid place-items-center p-10 text-center xl:col-span-4">
            <div>
              <Sparkles className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">
                No hay agentes activos en la matriz
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Activa algún agente arriba o registra uno nuevo.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {messages.length === 0 && activeAgents.length > 0 ? (
        <div className="mt-3 flex shrink-0 flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-3 shrink-0 border-t border-border/60 pt-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Escribe una pregunta para todos los agentes activos… (Enter envía, Shift+Enter salta línea)"
            rows={2}
            className="min-h-[52px] resize-none"
            disabled={!canEdit}
          />
          <Button
            onClick={() => void handleSend()}
            disabled={!canEdit || !input.trim() || activeAgents.length === 0}
            className="h-[52px] px-4"
          >
            <Send className="h-4 w-4" />
            Enviar
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Cada envío consulta a {activeAgents.length}{" "}
          {activeAgents.length === 1 ? "agente" : "agentes"} en paralelo. Las respuestas quedan en el
          historial y pueden convertirse en tarea o en documento.
        </p>
      </div>

      <Dialog open={!!savingMessage} onOpenChange={(open) => !open && setSavingMessage(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Guardar en conocimiento</DialogTitle>
            <DialogDescription>
              La respuesta se guarda como documento en la raíz del conocimiento, independiente del chat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input
              value={noteName}
              onChange={(event) => setNoteName(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              placeholder="Título del documento"
            />
            <Select value={noteWorld} onValueChange={setNoteWorld}>
              <SelectTrigger>
                <SelectValue placeholder="Mundo destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin mundo (sin clasificar)</SelectItem>
                {(worlds ?? []).map((world) => (
                  <SelectItem key={world.id} value={world.id}>
                    {world.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-[12px] text-muted-foreground">
              {savingMessage?.content}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSavingMessage(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void confirmSaveNote()} disabled={saveDocument.isPending}>
              {saveDocument.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AgentColumn({
  agent,
  messages,
  pending,
  error,
  canEdit,
  onSaveNote,
  onCreateTask,
}: {
  agent: AgentRow;
  messages: MessageRow[];
  pending: boolean;
  error: string | null;
  canEdit: boolean;
  onSaveNote: (message: MessageRow) => void;
  onCreateTask: (message: MessageRow) => void;
}) {
  const thread = messages.filter(
    (message) => message.role === "user" || message.agent_id === agent.id,
  );
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length, pending]);

  return (
    <section className="panel flex h-[420px] flex-col overflow-hidden lg:h-full lg:min-h-0">
      <header className="flex items-center gap-2.5 border-b border-border/60 px-3 py-2.5">
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-md border bg-gradient-to-br text-[10px] font-bold",
            AGENT_ACCENTS[agent.accent] ?? AGENT_ACCENTS.blue,
          )}
        >
          {agent.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">{agent.name}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {agent.provider} · {modelLabel(agent.model)}
          </p>
        </div>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : null}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 scrollbar-thin">
        {thread.length === 0 && !pending ? (
          <p className="px-1 pt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
            {agent.description || "Sin mensajes todavía."}
          </p>
        ) : null}

        {thread.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <p className="max-w-[92%] rounded-lg rounded-br-sm bg-primary/15 px-2.5 py-1.5 text-[11px] leading-relaxed text-foreground">
                {message.content}
              </p>
            </div>
          ) : (
            <div key={message.id} className="group space-y-1.5">
              <p className="whitespace-pre-wrap rounded-lg rounded-bl-sm border border-border/60 bg-muted/40 px-2.5 py-2 text-[11px] leading-relaxed text-foreground">
                {message.content}
              </p>
              {canEdit ? (
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="xs"
                    variant="ghost"
                    className="h-6 px-1.5 text-[10px]"
                    onClick={() => onSaveNote(message)}
                  >
                    <BookMarked className="h-3 w-3" />
                    Conocimiento
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="h-6 px-1.5 text-[10px]"
                    onClick={() => onCreateTask(message)}
                  >
                    <ListPlus className="h-3 w-3" />
                    Tarea
                  </Button>
                </div>
              ) : null}
            </div>
          ),
        )}

        {pending ? (
          <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {agent.name} está respondiendo…
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[10px] leading-relaxed text-destructive">
            <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
            {error}
          </div>
        ) : null}

        <div ref={endRef} />
      </div>
    </section>
  );
}

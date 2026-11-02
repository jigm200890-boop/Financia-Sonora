import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  BookMarked,
  Bot,
  CheckCircle2,
  Circle,
  ClipboardCopy,
  FileText,
  FolderOpen,
  HardDrive,
  Hexagon,
  Layers,
  ListChecks,
  Loader2,
  Lock,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Target,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import {
  insertMessage,
  useAgents,
  useAgreements,
  useBackupSteps,
  useCoreConversation,
  useDeleteAgreement,
  useDeleteObjective,
  useIntegrations,
  useKnowledgeItems,
  useObjectives,
  useSaveAgreement,
  useSaveDocument,
  useSaveObjective,
  useSaveTask,
  useSetBackupStepStatus,
  useTasks,
  useWorlds,
} from "@/hooks/use-portal-data";
import { PageHeader, SectionTitle } from "@/components/portal/layout-bits";
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
import { formatDate, formatDateTime } from "@/lib/portal-ui";
import { modelLabel } from "@/lib/ai-models";
import type {
  AgreementRow,
  BackupStepRow,
  MessageRow,
  ObjectiveRow,
} from "@/lib/portal-types";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "mesa", label: "Mesa de trabajo", icon: MessageSquare },
  { id: "acuerdos", label: "Acuerdos", icon: ShieldCheck },
  { id: "objetivos", label: "Objetivos", icon: Target },
  { id: "documentos", label: "Documentos", icon: FolderOpen },
  { id: "coordinacion", label: "Coordinación", icon: Layers },
  { id: "respaldo", label: "Respaldo", icon: HardDrive },
  { id: "limites", label: "Límites", icon: TriangleAlert },
] as const;

type TabId = (typeof TABS)[number]["id"];

const AGREEMENT_META: Record<string, { label: string; badge: string }> = {
  propuesta: { label: "Propuesta", badge: "border-info/40 bg-info/10 text-info" },
  acordado: { label: "Acordado", badge: "border-primary/40 bg-primary/10 text-primary" },
  en_vigor: { label: "En vigor", badge: "border-success/40 bg-success/10 text-success" },
  descartado: { label: "Descartado", badge: "border-border bg-muted/50 text-muted-foreground" },
};

export default function NucleoCentral() {
  const { isAdmin, profile } = useAuth();
  const { data: worlds } = useWorlds();
  const { data: agents } = useAgents();
  const { data: objectives } = useObjectives();
  const { data: agreements } = useAgreements();
  const { data: tasks } = useTasks();
  const { data: items } = useKnowledgeItems();
  const { data: integrations } = useIntegrations();
  const { data: backupSteps } = useBackupSteps();
  const setBackupStatus = useSetBackupStepStatus();
  const { data: coreConversation } = useCoreConversation();
  const saveDocument = useSaveDocument();
  const saveTask = useSaveTask();

  const [searchParams] = useSearchParams();
  const initialTab = TABS.some((entry) => entry.id === searchParams.get("tab"))
    ? (searchParams.get("tab") as TabId)
    : "mesa";
  const [tab, setTab] = useState<TabId>(initialTab);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectiveDialog, setObjectiveDialog] = useState(false);
  const [editingObjective, setEditingObjective] = useState<ObjectiveRow | null>(null);
  const [agreementDialog, setAgreementDialog] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<AgreementRow | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const coreWorld = useMemo(
    () => (worlds ?? []).find((world) => world.name === "Núcleo Central") ?? null,
    [worlds],
  );
  const atlas = useMemo(
    () => (agents ?? []).find((agent) => agent.name === "Atlas") ?? null,
    [agents],
  );

  const activeObjectives = (objectives ?? []).filter((objective) => objective.status === "activo");
  const inForceAgreements = (agreements ?? []).filter(
    (agreement) => agreement.status === "en_vigor",
  );
  const openTasks = (tasks ?? []).filter((task) => task.status !== "hecha");
  const coreDocs = (items ?? []).filter((item) => item.world_id === coreWorld?.id);

  useEffect(() => {
    if (!coreConversation) {
      setMessages([]);
      return;
    }
    let active = true;
    void supabase
      .from("portal_messages")
      .select("*")
      .eq("conversation_id", coreConversation.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (active) setMessages(data ?? []);
      });
    return () => {
      active = false;
    };
  }, [coreConversation]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, sending]);

  if (!isAdmin) {
    return (
      <div className="panel mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 p-8 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full border border-border bg-muted/50 text-muted-foreground">
          <Lock className="h-5 w-5" />
        </span>
        <p className="text-sm font-medium text-foreground">Espacio reservado al administrador</p>
        <p className="text-xs text-muted-foreground">
          El Núcleo Central contiene objetivos y acuerdos privados. Solo el administrador del portal
          puede abrirlo.
        </p>
      </div>
    );
  }

  async function handleSend() {
    const content = input.trim();
    if (!content || !coreConversation || !atlas) return;
    const userMessage: MessageRow = {
      id: crypto.randomUUID(),
      conversation_id: coreConversation.id,
      agent_id: null,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    const previous = messages;
    setInput("");
    setMessages([...previous, userMessage]);
    setError(null);
    setSending(true);

    void insertMessage({
      conversationId: coreConversation.id,
      agentId: null,
      role: "user",
      content,
    });

    try {
      let knowledge = "";
      if (coreWorld) {
        const { data } = await supabase
          .from("portal_knowledge_items")
          .select("name, content")
          .eq("world_id", coreWorld.id)
          .not("content", "is", null)
          .order("updated_at", { ascending: false })
          .limit(4);
        knowledge = (data ?? [])
          .map((item) => `### ${item.name}\n${item.content ?? ""}`)
          .join("\n\n")
          .slice(0, 6000);
      }

      const history = [...previous, userMessage].map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const { data, error: invokeError } = await supabase.functions.invoke("ai-matrix", {
        body: {
          model: atlas.model,
          agentName: "Atlas",
          responsibilities:
            "Dirección estratégica del Núcleo Central. Decides con el usuario, ordenas prioridades, registras acuerdos y detectas bloqueos.",
          knowledge,
          messages: history,
        },
        headers: { "X-Session-ID": coreConversation.id },
      });
      if (invokeError) throw new Error(invokeError.message);
      const payload = data as { text?: string; error?: string };
      if (payload?.error) throw new Error(payload.error);
      if (!payload?.text) throw new Error("Atlas no devolvió texto.");

      const assistantMessage: MessageRow = {
        id: crypto.randomUUID(),
        conversation_id: coreConversation.id,
        agent_id: atlas.id,
        role: "assistant",
        content: payload.text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      await insertMessage({
        conversationId: coreConversation.id,
        agentId: atlas.id,
        role: "assistant",
        content: payload.text,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Atlas no pudo responder.");
    } finally {
      setSending(false);
    }
  }

  function buildBrief() {
    const lines = [
      "BRIEF DE COORDINACIÓN — NÚCLEO CENTRAL",
      `Fecha: ${new Date().toLocaleString("es-MX")}`,
      "",
      "OBJETIVOS ACTIVOS",
      ...(activeObjectives.length
        ? activeObjectives.map(
            (objective) =>
              `- ${objective.title} (${objective.progress}%, ${objective.horizon})`,
          )
        : ["- Sin objetivos activos"]),
      "",
      "ACUERDOS EN VIGOR",
      ...(inForceAgreements.length
        ? inForceAgreements.map(
            (agreement) => `- ${agreement.title}: ${agreement.decision ?? ""}`,
          )
        : ["- Sin acuerdos registrados"]),
      "",
      `TAREAS ABIERTAS (${openTasks.length})`,
      ...(openTasks.length
        ? openTasks.slice(0, 10).map((task) => `- ${task.title} · ${task.assignee ?? "sin responsable"}`)
        : ["- Sin tareas abiertas"]),
      "",
      "INSTRUCCIÓN PARA EL AGENTE EXTERNO",
      "Devuelve: (1) riesgos, (2) siguiente acción concreta, (3) qué decisión requiere el usuario.",
    ];
    return lines.join("\n");
  }

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(buildBrief());
      toast.success("Brief copiado. Pégalo en ChatGPT, Claude o Base44.");
    } catch {
      toast.error("No se pudo copiar el brief.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Núcleo Central"
        description="Nuestra base privada de operaciones: conversación, acuerdos, objetivos, documentos y coordinación con los agentes."
      >
        <Button variant="outlineMuted" onClick={() => void copyBrief()}>
          <ClipboardCopy className="h-4 w-4" />
          Copiar brief
        </Button>
        <Button variant="outlineMuted" onClick={() => setTab("limites")}>
          <TriangleAlert className="h-4 w-4" />
          Límites reales
        </Button>
      </PageHeader>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map((entry) => {
          const Icon = entry.icon;
          const active = tab === entry.id;
          return (
            <button
              key={entry.id}
              onClick={() => setTab(entry.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card/60 text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {entry.label}
            </button>
          );
        })}
      </div>

      {tab === "mesa" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="panel flex h-[calc(100dvh-18rem)] min-h-[420px] flex-col overflow-hidden">
            <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-md border border-violet-500/30 bg-gradient-to-br from-violet-500/25 to-fuchsia-600/10 text-[10px] font-bold text-violet-300">
                AT
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Atlas</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {atlas ? `${atlas.provider} · ${modelLabel(atlas.model)}` : "Agente no registrado"} ·
                  contexto Núcleo Central
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Privado
              </span>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="mx-auto max-w-md pt-10 text-center">
                  <Hexagon className="mx-auto h-7 w-7 text-primary/70" />
                  <p className="mt-3 text-sm font-medium text-foreground">Mesa de trabajo privada</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Todo lo que acuerdes aquí queda guardado con los objetivos y documentos del Núcleo
                    Central. Empieza por una prioridad.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {[
                      "¿Cuál es la siguiente acción concreta?",
                      "Ordena los objetivos por impacto.",
                      "¿Qué está bloqueado hoy?",
                    ].map((hint) => (
                      <button
                        key={hint}
                        onClick={() => setInput(hint)}
                        className="rounded-full border border-border bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <p className="max-w-[85%] rounded-lg rounded-br-sm bg-primary/15 px-3 py-2 text-[13px] leading-relaxed text-foreground">
                      {message.content}
                    </p>
                  </div>
                ) : (
                  <div key={message.id} className="group space-y-1.5">
                    <p className="max-w-[92%] whitespace-pre-wrap rounded-lg rounded-bl-sm border border-border/60 bg-muted/40 px-3 py-2 text-[13px] leading-relaxed text-foreground">
                      {message.content}
                    </p>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="xs"
                        variant="ghost"
                        className="h-6 px-1.5 text-[10px]"
                        onClick={() => {
                          void saveDocument
                            .mutateAsync({
                              name: `Acuerdo de mesa · ${new Date().toLocaleDateString("es-MX")}`,
                              content: message.content,
                              folderId: null,
                              worldId: coreWorld?.id ?? null,
                            })
                            .then(() => toast.success("Guardado en el Núcleo Central"))
                            .catch((caught: unknown) =>
                              toast.error(
                                caught instanceof Error ? caught.message : "No se pudo guardar.",
                              ),
                            );
                        }}
                      >
                        <BookMarked className="h-3 w-3" />
                        Guardar documento
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        className="h-6 px-1.5 text-[10px]"
                        onClick={() => {
                          void saveTask
                            .mutateAsync({
                              values: {
                                title: message.content.split("\n")[0].slice(0, 90),
                                description: message.content,
                                status: "pendiente",
                                priority: "media",
                                assignee: profile?.full_name ?? "Administrador",
                                agent_id: atlas?.id ?? null,
                              },
                            })
                            .then(() => toast.success("Tarea creada"))
                            .catch((caught: unknown) =>
                              toast.error(
                                caught instanceof Error ? caught.message : "No se pudo crear.",
                              ),
                            );
                        }}
                      >
                        <ListChecks className="h-3 w-3" />
                        Crear tarea
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        className="h-6 px-1.5 text-[10px]"
                        onClick={() => {
                          void navigator.clipboard
                            .writeText(message.content)
                            .then(() => toast.success("Respuesta copiada"))
                            .catch(() => toast.error("No se pudo copiar"));
                        }}
                      >
                        <ClipboardCopy className="h-3 w-3" />
                        Copiar
                      </Button>
                    </div>
                  </div>
                ),
              )}

              {sending ? (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Atlas está trabajando…
                </div>
              ) : null}

              {error ? (
                <div className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-[11px] text-destructive">
                  <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                  {error}
                </div>
              ) : null}
              <div ref={endRef} />
            </div>

            <div className="shrink-0 border-t border-border/60 p-3">
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
                  rows={2}
                  placeholder="Escribe a Atlas… (Enter envía, Shift+Enter salta línea)"
                  className="min-h-[52px] resize-none"
                  disabled={!atlas || !coreConversation}
                />
                <Button
                  className="h-[52px]"
                  onClick={() => void handleSend()}
                  disabled={sending || !input.trim() || !atlas || !coreConversation}
                >
                  <Send className="h-4 w-4" />
                  Enviar
                </Button>
              </div>
              {!atlas || !coreConversation ? (
                <p className="mt-2 text-[11px] text-destructive">
                  Falta el agente Atlas o la mesa privada. Recarga la página o crea la conversación.
                </p>
              ) : null}
            </div>
          </section>

          <aside className="space-y-3">
            <div className="panel p-4">
              <SectionTitle title="Objetivos activos" count={activeObjectives.length} />
              <div className="space-y-3">
                {activeObjectives.slice(0, 3).map((objective) => (
                  <div key={objective.id}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium leading-snug text-foreground">
                        {objective.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {objective.progress}%
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${objective.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
                {activeObjectives.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Sin objetivos activos.</p>
                ) : null}
              </div>
              <Button
                size="xs"
                variant="outlineMuted"
                className="mt-3 w-full"
                onClick={() => setTab("objetivos")}
              >
                Ver objetivos
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>

            <div className="panel p-4">
              <SectionTitle title="Acuerdos en vigor" count={inForceAgreements.length} />
              <div className="space-y-2">
                {inForceAgreements.slice(0, 3).map((agreement) => (
                  <div key={agreement.id} className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {agreement.title}
                    </p>
                  </div>
                ))}
                {inForceAgreements.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Sin acuerdos en vigor.</p>
                ) : null}
              </div>
              <Button
                size="xs"
                variant="outlineMuted"
                className="mt-3 w-full"
                onClick={() => setTab("acuerdos")}
              >
                Ver acuerdos
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>

            <div className="panel p-4">
              <SectionTitle title="Tareas abiertas" count={openTasks.length} />
              <div className="space-y-2">
                {openTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                        task.priority === "alta"
                          ? "bg-destructive"
                          : task.priority === "media"
                            ? "bg-warning"
                            : "bg-muted-foreground",
                      )}
                    />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{task.title}</p>
                  </div>
                ))}
              </div>
              <Button asChild size="xs" variant="outlineMuted" className="mt-3 w-full">
                <Link to="/tareas">
                  Abrir tablero
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </aside>
        </div>
      ) : null}

      {tab === "acuerdos" ? (
        <section>
          <SectionTitle
            title="Acuerdos"
            count={(agreements ?? []).length}
            action={
              <Button
                size="xs"
                onClick={() => {
                  setEditingAgreement(null);
                  setAgreementDialog(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo acuerdo
              </Button>
            }
          />
          <div className="space-y-2">
            {(agreements ?? []).map((agreement) => {
              const meta = AGREEMENT_META[agreement.status] ?? AGREEMENT_META.propuesta;
              return (
                <article key={agreement.id} className="panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{agreement.title}</h3>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            meta.badge,
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                      {agreement.decision ? (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {agreement.decision}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatDate(agreement.decided_at)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Select
                        value={agreement.status}
                        onValueChange={(value) => {
                          void saveAgreement
                            .mutateAsync({
                              id: agreement.id,
                              values: {
                                title: agreement.title,
                                decision: agreement.decision,
                                status: value,
                                decided_at: agreement.decided_at,
                                world_id: agreement.world_id,
                              },
                            })
                            .then(() => toast.success("Estado del acuerdo actualizado"))
                            .catch((caught: unknown) =>
                              toast.error(
                                caught instanceof Error ? caught.message : "No se pudo actualizar.",
                              ),
                            );
                        }}
                      >
                        <SelectTrigger className="h-8 w-[130px] text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="propuesta">Propuesta</SelectItem>
                          <SelectItem value="acordado">Acordado</SelectItem>
                          <SelectItem value="en_vigor">En vigor</SelectItem>
                          <SelectItem value="descartado">Descartado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingAgreement(agreement);
                          setAgreementDialog(true);
                        }}
                        aria-label="Editar acuerdo"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <DeleteAgreementButton id={agreement.id} />
                    </div>
                  </div>
                </article>
              );
            })}
            {(agreements ?? []).length === 0 ? (
              <p className="panel px-4 py-8 text-center text-xs text-muted-foreground">
                Sin acuerdos registrados.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === "objetivos" ? (
        <section>
          <SectionTitle
            title="Objetivos"
            count={(objectives ?? []).length}
            action={
              <Button
                size="xs"
                onClick={() => {
                  setEditingObjective(null);
                  setObjectiveDialog(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo objetivo
              </Button>
            }
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(objectives ?? []).map((objective) => (
              <article key={objective.id} className="panel flex h-full flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-snug text-foreground">
                    {objective.title}
                  </h3>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px]",
                      objective.status === "activo"
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : objective.status === "logrado"
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-border bg-muted/50 text-muted-foreground",
                    )}
                  >
                    {objective.status === "activo"
                      ? "Activo"
                      : objective.status === "logrado"
                        ? "Logrado"
                        : "Pausado"}
                  </span>
                </div>
                {objective.description ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {objective.description}
                  </p>
                ) : null}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="uppercase tracking-wider">{objective.horizon}</span>
                    <span>{objective.progress}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${objective.progress}%` }}
                    />
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {objective.due_date
                    ? `Fecha objetivo: ${formatDate(objective.due_date)}`
                    : "Sin fecha objetivo"}
                </p>
                <div className="mt-auto flex items-center gap-1 pt-3">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setEditingObjective(objective);
                      setObjectiveDialog(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <DeleteObjectiveButton id={objective.id} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "documentos" ? (
        <section>
          <SectionTitle
            title="Documentación del Núcleo"
            count={coreDocs.length}
            action={
              <Button asChild size="xs" variant="outlineMuted">
                <Link to={`/conocimiento?world=${coreWorld?.id ?? ""}`}>
                  Abrir en Conocimiento
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {coreDocs.map((item) => (
              <Link
                key={item.id}
                to={`/conocimiento?world=${coreWorld?.id ?? ""}`}
                className="panel flex items-start gap-3 p-4 transition-colors hover:border-primary/40"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDateTime(item.updated_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {coreDocs.length === 0 ? (
            <div className="panel px-4 py-8 text-center text-xs text-muted-foreground">
              Todavía no hay documentos en este mundo. Crea el primero desde Conocimiento.
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "coordinacion" ? (
        <section className="space-y-4">
          <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Brief de coordinación</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Un solo texto con objetivos, acuerdos y tareas para pegar en ChatGPT, Claude o Base44.
              </p>
            </div>
            <Button onClick={() => void copyBrief()}>
              <ClipboardCopy className="h-4 w-4" />
              Copiar brief
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="panel p-4">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-violet-300" />
                <p className="text-sm font-semibold text-foreground">Atlas (interno)</p>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {atlas
                  ? `${atlas.provider} · ${modelLabel(atlas.model)} · acceso al Núcleo Central`
                  : "Agente no registrado"}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Responsable de ordenar prioridades, registrar acuerdos y detectar bloqueos. Se le
                consulta en la Mesa de trabajo.
              </p>
            </div>

            {[
              {
                name: "ChatGPT",
                status: "Externo, sin conexión API",
                detail:
                  "Se coordina copiando el brief y pegando su respuesta como propuesta. No hay acceso automático a tu cuenta.",
              },
              {
                name: "Claude",
                status: "Externo, sin conexión API",
                detail:
                  "Útil para análisis largo y revisión de documentos. La respuesta se archiva como propuesta hasta que la apruebes.",
              },
              {
                name: "Base44",
                status: "Plataforma de aplicaciones",
                detail:
                  "Sus apps se abren y verifican desde Aplicaciones. Sin una API autorizada no se leen datos de la plataforma.",
              },
            ].map((external) => (
              <div key={external.name} className="panel p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{external.name}</p>
                  <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                    {external.status}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {external.detail}
                </p>
              </div>
            ))}
          </div>

          <div className="panel p-4">
            <SectionTitle title="Brief que se copia" />
            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground scrollbar-thin">
              {buildBrief()}
            </pre>
          </div>

          <div className="panel p-4">
            <SectionTitle title="Integraciones registradas" count={(integrations ?? []).length} />
            <div className="space-y-2">
              {(integrations ?? []).map((integration) => (
                <div
                  key={integration.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium text-foreground">{integration.name}</p>
                    <p className="text-[10px] text-muted-foreground">{integration.kind}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",
                      integration.status === "active"
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-warning/40 bg-warning/10 text-warning",
                    )}
                  >
                    {integration.status === "active" ? "Activa" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "respaldo" ? (
        <BackupPanel
          worldId={coreWorld?.id ?? null}
          steps={backupSteps ?? []}
          onToggle={(id, status) =>
            void setBackupStatus
              .mutateAsync({ id, status })
              .then(() => toast.success("Avance del respaldo actualizado"))
              .catch((caught: unknown) =>
                toast.error(caught instanceof Error ? caught.message : "No se pudo actualizar."),
              )
          }
        />
      ) : null}

      {tab === "limites" ? <LimitsPanel openTasks={openTasks.length} /> : null}

      <ObjectiveDialog
        open={objectiveDialog}
        onOpenChange={(open) => {
          setObjectiveDialog(open);
          if (!open) setEditingObjective(null);
        }}
        objective={editingObjective}
        worldId={coreWorld?.id ?? null}
      />

      <AgreementDialog
        open={agreementDialog}
        onOpenChange={(open) => {
          setAgreementDialog(open);
          if (!open) setEditingAgreement(null);
        }}
        agreement={editingAgreement}
        worldId={coreWorld?.id ?? null}
      />
    </div>
  );
}

function DeleteObjectiveButton({ id }: { id: string }) {
  const remove = useDeleteObjective();
  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      onClick={() => {
        if (!window.confirm("¿Eliminar este objetivo?")) return;
        void remove
          .mutateAsync(id)
          .then(() => toast.success("Objetivo eliminado"))
          .catch((caught: unknown) =>
            toast.error(caught instanceof Error ? caught.message : "No se pudo eliminar."),
          );
      }}
      aria-label="Eliminar objetivo"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

function DeleteAgreementButton({ id }: { id: string }) {
  const remove = useDeleteAgreement();
  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      onClick={() => {
        if (!window.confirm("¿Eliminar este acuerdo?")) return;
        void remove
          .mutateAsync(id)
          .then(() => toast.success("Acuerdo eliminado"))
          .catch((caught: unknown) =>
            toast.error(caught instanceof Error ? caught.message : "No se pudo eliminar."),
          );
      }}
      aria-label="Eliminar acuerdo"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

function ObjectiveDialog({
  open,
  onOpenChange,
  objective,
  worldId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objective: ObjectiveRow | null;
  worldId: string | null;
}) {
  const save = useSaveObjective();
  const [form, setForm] = useState({
    title: "",
    description: "",
    horizon: "corto",
    status: "activo",
    progress: 0,
    dueDate: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      title: objective?.title ?? "",
      description: objective?.description ?? "",
      horizon: objective?.horizon ?? "corto",
      status: objective?.status ?? "activo",
      progress: objective?.progress ?? 0,
      dueDate: objective?.due_date ?? "",
    });
  }, [open, objective]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    try {
      await save.mutateAsync({
        id: objective?.id,
        values: {
          title: form.title.trim(),
          description: form.description.trim() || null,
          horizon: form.horizon,
          status: form.status,
          progress: Math.max(0, Math.min(100, Number(form.progress) || 0)),
          due_date: form.dueDate || null,
          world_id: objective?.world_id ?? worldId,
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
          <DialogTitle>{objective ? "Editar objetivo" : "Nuevo objetivo"}</DialogTitle>
          <DialogDescription>
            Un objetivo con horizonte y avance real. Se revisa en la Mesa de trabajo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="objective-title">Título</Label>
            <Input
              id="objective-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="objective-description">Descripción</Label>
            <Textarea
              id="objective-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              rows={2}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Horizonte</Label>
              <Select
                value={form.horizon}
                onValueChange={(value) => setForm({ ...form, horizon: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corto">Corto plazo</SelectItem>
                  <SelectItem value="medio">Medio plazo</SelectItem>
                  <SelectItem value="largo">Largo plazo</SelectItem>
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
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="logrado">Logrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objective-progress">Avance (%)</Label>
              <Input
                id="objective-progress"
                type="number"
                min={0}
                max={100}
                value={form.progress}
                onChange={(event) => setForm({ ...form, progress: Number(event.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objective-due">Fecha objetivo</Label>
              <Input
                id="objective-due"
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
              />
            </div>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar objetivo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AgreementDialog({
  open,
  onOpenChange,
  agreement,
  worldId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreement: AgreementRow | null;
  worldId: string | null;
}) {
  const save = useSaveAgreement();
  const [form, setForm] = useState({
    title: "",
    decision: "",
    status: "propuesta",
    decidedAt: new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      title: agreement?.title ?? "",
      decision: agreement?.decision ?? "",
      status: agreement?.status ?? "propuesta",
      decidedAt: agreement?.decided_at ?? new Date().toISOString().slice(0, 10),
    });
  }, [open, agreement]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    try {
      await save.mutateAsync({
        id: agreement?.id,
        values: {
          title: form.title.trim(),
          decision: form.decision.trim() || null,
          status: form.status,
          decided_at: form.decidedAt,
          world_id: agreement?.world_id ?? worldId,
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
          <DialogTitle>{agreement ? "Editar acuerdo" : "Nuevo acuerdo"}</DialogTitle>
          <DialogDescription>
            Un acuerdo es una decisión con fecha. Cambiar su estado deja rastro del avance.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="agreement-title">Título</Label>
            <Input
              id="agreement-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agreement-decision">Decisión</Label>
            <Textarea
              id="agreement-decision"
              value={form.decision}
              onChange={(event) => setForm({ ...form, decision: event.target.value })}
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
                  <SelectItem value="propuesta">Propuesta</SelectItem>
                  <SelectItem value="acordado">Acordado</SelectItem>
                  <SelectItem value="en_vigor">En vigor</SelectItem>
                  <SelectItem value="descartado">Descartado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agreement-date">Fecha</Label>
              <Input
                id="agreement-date"
                type="date"
                value={form.decidedAt}
                onChange={(event) => setForm({ ...form, decidedAt: event.target.value })}
              />
            </div>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar acuerdo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BackupPanel({
  worldId,
  steps,
  onToggle,
}: {
  worldId: string | null;
  steps: BackupStepRow[];
  onToggle: (id: string, status: string) => void;
}) {
  const phases = Array.from(new Set(steps.map((step) => step.phase)));
  const done = steps.filter((step) => step.status === "hecho").length;
  const pct = steps.length > 0 ? Math.round((done / steps.length) * 100) : 0;

  return (
    <section className="space-y-4">
      <div className="panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Respaldo de Google Drive en una cuenta independiente
            </p>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Procedimiento y avance verificable. Ninguna cuenta está conectada ni compartida: el
              portal registra el trabajo; la copia la ejecutas tú desde las cuentas.
            </p>
          </div>
          <Button asChild size="sm" variant="outlineMuted">
            <Link to={`/conocimiento?world=${worldId ?? ""}`}>
              Abrir procedimiento
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-medium text-foreground">{pct}%</span>
          <span className="text-[11px] text-muted-foreground">
            {done} de {steps.length} pasos
          </span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {phases.map((phase) => {
          const phaseSteps = steps.filter((step) => step.phase === phase);
          const phaseDone = phaseSteps.filter((step) => step.status === "hecho").length;
          return (
            <div key={phase} className="panel p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">
                  {phase}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {phaseDone}/{phaseSteps.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {phaseSteps.map((step) => {
                  const isDone = step.status === "hecho";
                  return (
                    <button
                      key={step.id}
                      onClick={() => onToggle(step.id, isDone ? "pendiente" : "hecho")}
                      className="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted/50"
                    >
                      {isDone ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                      ) : (
                        <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                      )}
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block text-[11px] font-medium leading-snug",
                            isDone ? "text-muted-foreground line-through" : "text-foreground",
                          )}
                        >
                          {step.title}
                        </span>
                        {step.detail ? (
                          <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">
                            {step.detail}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel border-warning/30 bg-warning/5 p-4">
        <p className="text-xs font-semibold text-foreground">Limitaciones que no se pueden saltar</p>
        <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <li>· No tengo acceso a tu Drive ni puedo iniciar sesión por ti.</li>
          <li>· Takeout entrega lotes comprimidos; puede tardar horas o días.</li>
          <li>· Docs, Sheets y Slides se exportan: el formato puede cambiar.</li>
          <li>· Los atajos no se copian como archivo; apuntan a otro documento.</li>
          <li>· Copiar permisos automáticamente puede exponer información confidencial.</li>
          <li>· Papelera e historial de versiones no se respaldan por defecto.</li>
          <li>· La integridad se comprueba por inventario, muestreo y huellas; no hay garantía absoluta.</li>
        </ul>
      </div>
    </section>
  );
}

function LimitsPanel({ openTasks }: { openTasks: number }) {
  const rows = [
    {
      label: "Modelos de IA disponibles",
      value: "4 motores incluidos en el plan (OpenAI, Anthropic, GLM, Qwen)",
    },
    {
      label: "Consumo por envío",
      value: "1 llamada por agente activo. En la matriz de 4 columnas son 4 llamadas.",
    },
    {
      label: "Contexto de conocimiento",
      value: "Hasta 4 documentos del mundo elegido, recortados a 6,000 caracteres.",
    },
    {
      label: "Historial por respuesta",
      value: "Últimos 16 mensajes de la conversación.",
    },
    {
      label: "Tiempo máximo por respuesta",
      value: "90 segundos; después se reporta error y se puede reintentar.",
    },
    {
      label: "Verificación de enlaces",
      value: "9 segundos por enlace. Solo confirma alcance y autenticación.",
    },
    {
      label: "Archivos en Conocimiento",
      value: "20 MB por archivo. Almacenamiento privado con enlace temporal.",
    },
    {
      label: "Versionado de documentos",
      value: "No disponible todavía: guardar sobrescribe el documento.",
    },
    {
      label: "Sincronización externa",
      value: "Ninguna. Base44, Hércules y Drive se abren; no se leen sus datos sin API autorizada.",
    },
    {
      label: "Saldo de créditos",
      value: "No puedo consultarlo desde el portal. El consumo se cobra por llamada en tu cuenta.",
    },
  ];

  return (
    <section className="space-y-4">
      <div className="panel p-4">
        <p className="text-sm font-medium text-foreground">Límites reales de la plataforma</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Estos son los límites que el portal aplica hoy. No hay cifras inventadas: lo que no puedo
          medir, se dice.
        </p>
        <div className="mt-4 divide-y divide-border/50">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:justify-between">
              <p className="text-xs font-medium text-foreground">{row.label}</p>
              <p className="max-w-[420px] text-[11px] leading-relaxed text-muted-foreground">
                {row.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Tareas abiertas</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{openTasks}</p>
        </div>
        <div className="panel p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Prioridad</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {openTasks > 10
              ? "Demasiadas tareas abiertas: conviene cerrar o archivar antes de abrir más."
              : "Carga manejable. Revisa prioridades en la Mesa de trabajo."}
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Recomendación</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Un acuerdo por semana y una revisión de objetivos cada viernes.
          </p>
        </div>
      </div>
    </section>
  );
}

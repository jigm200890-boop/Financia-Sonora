import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  KNOWLEDGE_BUCKET,
  type AgentInsert,
  type AppInsert,
  type AppRow,
  type CheckResult,
  type ConversationRow,
  type FolderRow,
  type IntegrationRow,
  type KnowledgeItemRow,
  type MessageRow,
  type ObjectiveRow,
  type AgreementRow,
  type BackupStepRow,
  type AttachmentRow,
  type CoreIdentityRow,
  type CoreRegistryRow,
  type DocumentEventRow,
  type DocumentGrantRow,
  type KnowledgeVersionRow,
  type ProfileRow,
  type Role,
  type TaskRow,
  type WorldRow,
  type WorkflowRow,
  type WorkflowStep,
} from "@/lib/portal-types";

const ROOT = "portal";

export const qk = {
  apps: [ROOT, "apps"],
  agents: [ROOT, "agents"],
  worlds: [ROOT, "worlds"],
  folders: [ROOT, "folders"],
  items: [ROOT, "items"],
  tasks: [ROOT, "tasks"],
  integrations: [ROOT, "integrations"],
  workflows: [ROOT, "workflows"],
  profiles: [ROOT, "profiles"],
  logs: [ROOT, "logs"],
  conversations: [ROOT, "conversations"],
  coreConversation: [ROOT, "core-conversation"],
  objectives: [ROOT, "objectives"],
  agreements: [ROOT, "agreements"],
  backupSteps: [ROOT, "backup-steps"],
  coreIdentity: [ROOT, "core-identity"],
  coreRegistry: [ROOT, "core-registry"],
  attachments: (id: string) => [ROOT, "attachments", id],
  grants: (id: string) => [ROOT, "grants", id],
  events: (id: string) => [ROOT, "events", id],
  versions: (id: string) => [ROOT, "versions", id],
  messages: (id: string) => [ROOT, "messages", id],
};

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/* ---------------------------------------------------------------- apps */

export function useApps() {
  return useQuery({
    queryKey: qk.apps,
    queryFn: async (): Promise<AppRow[]> => {
      const { data, error } = await supabase
        .from("portal_apps")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useSaveApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; values: AppInsert }) => {
      if (input.id) {
        const { error } = await supabase
          .from("portal_apps")
          .update(input.values)
          .eq("id", input.id);
        fail(error);
        return;
      }
      const { error } = await supabase.from("portal_apps").insert(input.values);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.apps }),
  });
}

export function useDeleteApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portal_apps").delete().eq("id", id);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.apps }),
  });
}

export type CheckResponse = {
  result: CheckResult;
  detail: string;
  httpStatus: number | null;
  checkedAt: string;
  error?: string;
};

export function useVerifyTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      type: "app" | "integration";
      name: string;
      url: string;
    }): Promise<CheckResponse> => {
      const { data, error } = await supabase.functions.invoke("check-endpoint", {
        body: { url: input.url },
      });
      if (error) throw new Error(error.message ?? "No se pudo verificar el enlace.");
      const payload = data as CheckResponse;
      if (payload?.error) throw new Error(payload.error);

      const result = payload.result ?? "unavailable";
      const detail = payload.detail ?? "";
      const checkedAt = payload.checkedAt ?? new Date().toISOString();

      if (input.type === "app") {
        const { error: updateError } = await supabase
          .from("portal_apps")
          .update({
            last_checked_at: checkedAt,
            last_check_result: result,
            status:
              result === "reachable"
                ? "active"
                : result === "auth_required"
                  ? "unverified"
                  : "offline",
          })
          .eq("id", input.id);
        fail(updateError);
      } else {
        const { error: updateError } = await supabase
          .from("portal_integrations")
          .update({
            last_checked_at: checkedAt,
            last_check_result: result,
            status: result === "unavailable" ? "unavailable" : "active",
          })
          .eq("id", input.id);
        fail(updateError);
      }

      const { error: logError } = await supabase.from("portal_check_logs").insert({
        target_type: input.type,
        target_id: input.id,
        target_name: input.name,
        result,
        detail,
      });
      fail(logError);

      qc.invalidateQueries({ queryKey: qk.apps });
      qc.invalidateQueries({ queryKey: qk.integrations });
      qc.invalidateQueries({ queryKey: qk.logs });
      return payload;
    },
  });
}

/* --------------------------------------------------------------- agents */

export function useAgents() {
  return useQuery({
    queryKey: qk.agents,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_agents")
        .select("*")
        .order("sort_order", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useSaveAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; values: AgentInsert }) => {
      if (input.id) {
        const { error } = await supabase
          .from("portal_agents")
          .update(input.values)
          .eq("id", input.id);
        fail(error);
        return;
      }
      const { error } = await supabase.from("portal_agents").insert(input.values);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.agents }),
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portal_agents").delete().eq("id", id);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.agents }),
  });
}

/* ----------------------------------------------------------- knowledge */

export function useWorlds() {
  return useQuery({
    queryKey: qk.worlds,
    queryFn: async (): Promise<WorldRow[]> => {
      const { data, error } = await supabase
        .from("portal_worlds")
        .select("*")
        .order("sort_order", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useFolders() {
  return useQuery({
    queryKey: qk.folders,
    queryFn: async (): Promise<FolderRow[]> => {
      const { data, error } = await supabase
        .from("portal_knowledge_folders")
        .select("*")
        .order("name", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      parentId: string | null;
      worldId: string | null;
    }) => {
      const { data, error } = await supabase
        .from("portal_knowledge_folders")
        .insert({
          name: input.name,
          parent_id: input.parentId,
          world_id: input.worldId,
        })
        .select("id")
        .single();
      fail(error);
      return data?.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.folders }),
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const { error } = await supabase
        .from("portal_knowledge_folders")
        .update({ name: input.name })
        .eq("id", input.id);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.folders }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("portal_knowledge_folders")
        .delete()
        .eq("id", id);
      fail(error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.folders });
      qc.invalidateQueries({ queryKey: qk.items });
    },
  });
}

export function useKnowledgeItems() {
  return useQuery({
    queryKey: qk.items,
    queryFn: async (): Promise<KnowledgeItemRow[]> => {
      const { data, error } = await supabase
        .from("portal_knowledge_items")
        .select("*")
        .order("updated_at", { ascending: false });
      fail(error);
      return data ?? [];
    },
  });
}

export function useSaveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      name: string;
      content: string;
      folderId: string | null;
      worldId: string | null;
      tags?: string[];
    }) => {
      if (input.id) {
        const { error } = await supabase
          .from("portal_knowledge_items")
          .update({
            name: input.name,
            content: input.content,
            folder_id: input.folderId,
            world_id: input.worldId,
            tags: input.tags ?? [],
          })
          .eq("id", input.id);
        fail(error);
        void logDocumentEvent({
          itemId: input.id,
          action: "update",
          detail: `Editado: ${input.name}`,
        });
        return;
      }
      const { data, error } = await supabase
        .from("portal_knowledge_items")
        .insert({
          name: input.name,
          content: input.content,
          folder_id: input.folderId,
          world_id: input.worldId,
          kind: "document",
          tags: input.tags ?? [],
        })
        .select("id")
        .single();
      fail(error);
      if (data?.id) {
        void logDocumentEvent({ itemId: data.id, action: "upload", detail: input.name });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.items }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { id: string; storage_path: string | null }) => {
      if (item.storage_path) {
        await supabase.storage.from(KNOWLEDGE_BUCKET).remove([item.storage_path]);
      }
      const { error } = await supabase
        .from("portal_knowledge_items")
        .delete()
        .eq("id", item.id);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.items }),
  });
}

export function useUploadKnowledgeFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      file: File;
      folderId: string | null;
      worldId: string | null;
    }) => {
      const ext = input.file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `knowledge/${input.folderId ?? "root"}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(KNOWLEDGE_BUCKET)
        .upload(path, input.file, {
          contentType: input.file.type || "application/octet-stream",
          upsert: false,
        });
      fail(uploadError);

      const { data, error } = await supabase
        .from("portal_knowledge_items")
        .insert({
          name: input.file.name,
          folder_id: input.folderId,
          world_id: input.worldId,
          kind: "file",
          storage_path: path,
          mime_type: input.file.type || null,
          size_bytes: input.file.size,
        })
        .select("id")
        .single();
      fail(error);
      if (data?.id) {
        void logDocumentEvent({
          itemId: data.id,
          action: "upload",
          detail: input.file.name,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.items }),
  });
}

export async function getSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(KNOWLEDGE_BUCKET)
    .createSignedUrl(path, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/* ----------------------------------------------------------- chat */

export function useConversations() {
  return useQuery({
    queryKey: qk.conversations,
    queryFn: async (): Promise<ConversationRow[]> => {
      const { data, error } = await supabase
        .from("portal_conversations")
        .select("*")
        .order("updated_at", { ascending: false });
      fail(error);
      return data ?? [];
    },
  });
}

export function useMessages(conversationId?: string) {
  return useQuery({
    queryKey: qk.messages(conversationId ?? "none"),
    enabled: !!conversationId,
    queryFn: async (): Promise<MessageRow[]> => {
      const { data, error } = await supabase
        .from("portal_messages")
        .select("*")
        .eq("conversation_id", conversationId as string)
        .order("created_at", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("portal_conversations")
        .insert({ title, created_by: user?.id ?? null })
        .select("*")
        .single();
      fail(error);
      return data as ConversationRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.conversations }),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portal_conversations").delete().eq("id", id);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.conversations }),
  });
}

export async function insertMessage(input: {
  id?: string;
  conversationId: string;
  agentId: string | null;
  role: "user" | "assistant";
  content: string;
}) {
  const { error } = await supabase.from("portal_messages").insert({
    ...(input.id ? { id: input.id } : {}),
    conversation_id: input.conversationId,
    agent_id: input.agentId,
    role: input.role,
    content: input.content,
  });
  fail(error);
}

export type DocumentSearchHit = {
  id: string;
  name: string;
  world_id: string | null;
  folder_id: string | null;
  kind: string;
  snippet: string;
  rank: number;
  updated_at: string;
  access_mode: string;
};

export function useDocumentSearch(
  query: string,
  worldId?: string | null,
  itemIds?: string[] | null,
) {
  const term = query.trim();
  return useQuery({
    queryKey: [
      ROOT,
      "search",
      term,
      worldId ?? "all",
      itemIds && itemIds.length > 0 ? itemIds.join(",") : "none",
    ],
    enabled: term.length >= 2,
    queryFn: async (): Promise<DocumentSearchHit[]> => {
      const { data, error } = await supabase.rpc("portal_search_documents", {
        p_query: term,
        p_world_id: worldId ?? null,
        p_limit: 10,
        p_item_ids: itemIds && itemIds.length > 0 ? itemIds : null,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as DocumentSearchHit[];
    },
  });
}

/* ------------------------------------------------- adjuntos y permisos */

export function useAttachments(conversationId?: string) {
  return useQuery({
    queryKey: qk.attachments(conversationId ?? "none"),
    enabled: !!conversationId,
    queryFn: async (): Promise<AttachmentRow[]> => {
      const { data, error } = await supabase
        .from("portal_attachments")
        .select("*")
        .eq("conversation_id", conversationId as string)
        .order("created_at", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useDocumentGrants(itemId?: string) {
  return useQuery({
    queryKey: qk.grants(itemId ?? "none"),
    enabled: !!itemId,
    queryFn: async (): Promise<DocumentGrantRow[]> => {
      const { data, error } = await supabase
        .from("portal_document_grants")
        .select("*")
        .eq("item_id", itemId as string)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      fail(error);
      return data ?? [];
    },
  });
}

export function useDocumentEvents(itemId?: string) {
  return useQuery({
    queryKey: qk.events(itemId ?? "none"),
    enabled: !!itemId,
    queryFn: async (): Promise<DocumentEventRow[]> => {
      const { data, error } = await supabase
        .from("portal_document_events")
        .select("*")
        .eq("item_id", itemId as string)
        .order("created_at", { ascending: false })
        .limit(25);
      fail(error);
      return data ?? [];
    },
  });
}

export function useWorldDocumentGrants(worldId?: string) {
  return useQuery({
    queryKey: [ROOT, "world-grants", worldId ?? "none"],
    enabled: !!worldId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("portal_document_grants")
        .select("item_id")
        .eq("subject_type", "world")
        .eq("subject_id", worldId as string)
        .is("revoked_at", null);
      fail(error);
      return (data ?? []).map((row) => row.item_id);
    },
  });
}

export function useGrantDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      itemId: string;
      subjectType: "agent" | "world" | "user";
      subjectId: string;
      label: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("portal_document_grants").insert({
        item_id: input.itemId,
        subject_type: input.subjectType,
        subject_id: input.subjectId,
        granted_by: user?.id ?? null,
      });
      fail(error);
      await supabase.from("portal_document_events").insert({
        item_id: input.itemId,
        actor_id: user?.id ?? null,
        action: "grant",
        detail: `Autorizado a ${input.label}`,
      });
    },
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({ queryKey: qk.grants(variables.itemId) });
      qc.invalidateQueries({ queryKey: qk.events(variables.itemId) });
    },
  });
}

export function useRevokeGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      grantId: string;
      itemId: string;
      label: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("portal_document_grants")
        .update({ revoked_at: new Date().toISOString(), revoked_by: user?.id ?? null })
        .eq("id", input.grantId);
      fail(error);
      await supabase.from("portal_document_events").insert({
        item_id: input.itemId,
        actor_id: user?.id ?? null,
        action: "revoke",
        detail: `Revocado a ${input.label}`,
      });
    },
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({ queryKey: qk.grants(variables.itemId) });
      qc.invalidateQueries({ queryKey: qk.events(variables.itemId) });
    },
  });
}

export function useSetItemAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { itemId: string; mode: "world" | "restricted" }) => {
      const { error } = await supabase
        .from("portal_knowledge_items")
        .update({ access_mode: input.mode })
        .eq("id", input.itemId);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.items }),
  });
}

export async function logDocumentEvent(input: {
  itemId: string;
  action: "upload" | "view" | "download" | "grant" | "revoke" | "update" | "restore";
  detail?: string;
}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("portal_document_events").insert({
      item_id: input.itemId,
      actor_id: user?.id ?? null,
      action: input.action,
      detail: input.detail ?? null,
    });
  } catch {
    // La bitácora no debe bloquear la acción principal.
  }
}

/* -------------------------------------------------- núcleo central */

export function useCoreIdentity() {
  return useQuery({
    queryKey: qk.coreIdentity,
    queryFn: async (): Promise<CoreIdentityRow[]> => {
      const { data, error } = await supabase
        .from("portal_core_identity")
        .select("*")
        .order("position", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useCoreRegistry() {
  return useQuery({
    queryKey: qk.coreRegistry,
    queryFn: async (): Promise<CoreRegistryRow[]> => {
      const { data, error } = await supabase
        .from("portal_core_registry")
        .select("*")
        .order("sort_order", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useSaveCoreRegistry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      appKey: string;
      credits: number | null;
      health: string | null;
      note: string | null;
      hidden: boolean;
    }) => {
      const { error } = await supabase.from("portal_core_registry").upsert(
        {
          app_key: input.appKey,
          credits: input.credits,
          health: input.health,
          note: input.note,
          hidden: input.hidden,
        },
        { onConflict: "app_key" },
      );
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.coreRegistry }),
  });
}

export function useSaveCoreIdentity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { section: string; content: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const trimmed = input.content.trim();
      const { error } = await supabase
        .from("portal_core_identity")
        .update({
          content: trimmed || null,
          status: trimmed ? "definido" : "pendiente",
          updated_by: user?.id ?? null,
        })
        .eq("section", input.section);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.coreIdentity }),
  });
}

export function useCoreConversation() {
  return useQuery({
    queryKey: qk.coreConversation,
    queryFn: async (): Promise<ConversationRow | null> => {
      const { data, error } = await supabase
        .from("portal_conversations")
        .select("*")
        .eq("scope", "core")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      fail(error);
      return data ?? null;
    },
  });
}

export function useObjectives() {
  return useQuery({
    queryKey: qk.objectives,
    queryFn: async (): Promise<ObjectiveRow[]> => {
      const { data, error } = await supabase
        .from("portal_objectives")
        .select("*")
        .order("created_at", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useSaveObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      values: {
        title: string;
        description?: string | null;
        horizon: string;
        status: string;
        progress: number;
        due_date?: string | null;
        world_id?: string | null;
      };
    }) => {
      if (input.id) {
        const { error } = await supabase
          .from("portal_objectives")
          .update(input.values)
          .eq("id", input.id);
        fail(error);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("portal_objectives")
        .insert({ ...input.values, created_by: user?.id ?? null });
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.objectives }),
  });
}

export function useDeleteObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portal_objectives").delete().eq("id", id);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.objectives }),
  });
}

export function useAgreements() {
  return useQuery({
    queryKey: qk.agreements,
    queryFn: async (): Promise<AgreementRow[]> => {
      const { data, error } = await supabase
        .from("portal_agreements")
        .select("*")
        .order("decided_at", { ascending: false });
      fail(error);
      return data ?? [];
    },
  });
}

export function useSaveAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      values: {
        title: string;
        decision?: string | null;
        status: string;
        decided_at: string;
        world_id?: string | null;
      };
    }) => {
      if (input.id) {
        const { error } = await supabase
          .from("portal_agreements")
          .update(input.values)
          .eq("id", input.id);
        fail(error);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("portal_agreements")
        .insert({ ...input.values, created_by: user?.id ?? null });
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.agreements }),
  });
}

export function useDeleteAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portal_agreements").delete().eq("id", id);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.agreements }),
  });
}

/* ------------------------------------------------------------- respaldo */

export function useBackupSteps() {
  return useQuery({
    queryKey: qk.backupSteps,
    queryFn: async (): Promise<BackupStepRow[]> => {
      const { data, error } = await supabase
        .from("portal_backup_steps")
        .select("*")
        .order("sort_order", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useSetBackupStepStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("portal_backup_steps")
        .update({ status: input.status, updated_by: user?.id ?? null })
        .eq("id", input.id);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.backupSteps }),
  });
}

/* ------------------------------------------------------------ versiones */

export function useKnowledgeVersions(itemId?: string) {
  return useQuery({
    queryKey: qk.versions(itemId ?? "none"),
    enabled: !!itemId,
    queryFn: async (): Promise<KnowledgeVersionRow[]> => {
      const { data, error } = await supabase
        .from("portal_knowledge_versions")
        .select("*")
        .eq("item_id", itemId as string)
        .order("saved_at", { ascending: false })
        .limit(20);
      fail(error);
      return data ?? [];
    },
  });
}

export function useRestoreVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (version: { item_id: string; name: string; content: string | null; tags: string[] }) => {
      const { error } = await supabase
        .from("portal_knowledge_items")
        .update({
          name: version.name,
          content: version.content,
          tags: version.tags,
        })
        .eq("id", version.item_id);
      fail(error);
      void logDocumentEvent({
        itemId: version.item_id,
        action: "restore",
        detail: `Restaurada versión: ${version.name}`,
      });
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.items });
      qc.invalidateQueries({ queryKey: qk.versions(variables.item_id) });
    },
  });
}

/* --------------------------------------------------------------- tasks */

export function useTasks() {
  return useQuery({
    queryKey: qk.tasks,
    queryFn: async (): Promise<TaskRow[]> => {
      const { data, error } = await supabase
        .from("portal_tasks")
        .select("*")
        .order("created_at", { ascending: false });
      fail(error);
      return data ?? [];
    },
  });
}

export function useSaveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      values: {
        title: string;
        description?: string | null;
        assignee?: string | null;
        status?: string;
        priority?: string;
        due_date?: string | null;
        app_id?: string | null;
        agent_id?: string | null;
      };
    }) => {
      if (input.id) {
        const { error } = await supabase
          .from("portal_tasks")
          .update(input.values)
          .eq("id", input.id);
        fail(error);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("portal_tasks")
        .insert({ ...input.values, created_by: user?.id ?? null });
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tasks }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portal_tasks").delete().eq("id", id);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tasks }),
  });
}

/* -------------------------------------------------------- integrations */

export function useIntegrations() {
  return useQuery({
    queryKey: qk.integrations,
    queryFn: async (): Promise<IntegrationRow[]> => {
      const { data, error } = await supabase
        .from("portal_integrations")
        .select("*")
        .order("name", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useSaveIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      values: {
        name: string;
        kind: string;
        status: string;
        owner?: string | null;
        url?: string | null;
        notes?: string | null;
      };
    }) => {
      if (input.id) {
        const { error } = await supabase
          .from("portal_integrations")
          .update(input.values)
          .eq("id", input.id);
        fail(error);
        return;
      }
      const { error } = await supabase.from("portal_integrations").insert(input.values);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.integrations }),
  });
}

export function useDeleteIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portal_integrations").delete().eq("id", id);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.integrations }),
  });
}

/* ---------------------------------------------------------- workflows */

export function useWorkflows() {
  return useQuery({
    queryKey: qk.workflows,
    queryFn: async (): Promise<WorkflowRow[]> => {
      const { data, error } = await supabase
        .from("portal_workflows")
        .select("*")
        .order("created_at", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useSaveWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      values: {
        name: string;
        objective?: string | null;
        owner?: string | null;
        status?: string;
        steps: WorkflowStep[];
      };
    }) => {
      if (input.id) {
        const { error } = await supabase
          .from("portal_workflows")
          .update(input.values)
          .eq("id", input.id);
        fail(error);
        return;
      }
      const { error } = await supabase.from("portal_workflows").insert(input.values);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.workflows }),
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portal_workflows").delete().eq("id", id);
      fail(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.workflows }),
  });
}

/* ------------------------------------------------------------ profiles */

export function useProfiles() {
  return useQuery({
    queryKey: qk.profiles,
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from("portal_profiles")
        .select("*")
        .order("created_at", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useSetRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; role: Role }) => {
      const { data, error } = await supabase
        .from("portal_profiles")
        .update({ role: input.role })
        .eq("id", input.id)
        .select("id");
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        throw new Error("No tienes permiso para cambiar roles.");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.profiles }),
  });
}

export function useCheckLogs() {
  return useQuery({
    queryKey: qk.logs,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_check_logs")
        .select("*")
        .order("checked_at", { ascending: false })
        .limit(40);
      fail(error);
      return data ?? [];
    },
  });
}

import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];

export type ProfileRow = Tables["portal_profiles"]["Row"];
export type AppRow = Tables["portal_apps"]["Row"];
export type AppInsert = Tables["portal_apps"]["Insert"];
export type AppUpdate = Tables["portal_apps"]["Update"];
export type AgentRow = Tables["portal_agents"]["Row"];
export type AgentInsert = Tables["portal_agents"]["Insert"];
export type ConversationRow = Tables["portal_conversations"]["Row"];
export type MessageRow = Tables["portal_messages"]["Row"];
export type WorldRow = Tables["portal_worlds"]["Row"];
export type FolderRow = Tables["portal_knowledge_folders"]["Row"];
export type KnowledgeItemRow = Tables["portal_knowledge_items"]["Row"];
export type TaskRow = Tables["portal_tasks"]["Row"];
export type IntegrationRow = Tables["portal_integrations"]["Row"];
export type WorkflowRow = Tables["portal_workflows"]["Row"];
export type CheckLogRow = Tables["portal_check_logs"]["Row"];

export type WorkflowStep = {
  title: string;
  detail?: string;
  owner?: string;
};

export type Role = "admin" | "editor" | "viewer";
export type AppStatus = "active" | "unverified" | "pending" | "offline" | "unpublished";
export type TaskStatus = "pendiente" | "en_curso" | "bloqueada" | "hecha";
export type CheckResult = "reachable" | "auth_required" | "unavailable";
export type WorldKind = "personal" | "empresa" | "proyecto" | "tecnologia" | "biblioteca";

export const KNOWLEDGE_BUCKET = "portal-knowledge";

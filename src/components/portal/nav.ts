import {
  BookOpen,
  Bot,
  Cpu,
  GitBranch,
  Home,
  LayoutGrid,
  Link2,
  ListChecks,
  MessageSquare,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  end?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Inicio",
    description: "Vista general de todo el ecosistema",
    icon: Home,
    end: true,
  },
  {
    to: "/aplicaciones",
    label: "Aplicaciones",
    description: "Directorio y administración de sistemas",
    icon: LayoutGrid,
  },
  {
    to: "/nucleos",
    label: "Núcleos",
    description: "Acceso a los núcleos centrales existentes",
    icon: Cpu,
  },
  {
    to: "/agentes",
    label: "Agentes IA",
    description: "Funciones, responsabilidades y permisos",
    icon: Bot,
  },
  {
    to: "/conocimiento",
    label: "Conocimiento",
    description: "Carpetas, documentos y memoria compartida",
    icon: BookOpen,
  },
  {
    to: "/flujos",
    label: "Flujos de trabajo",
    description: "Procesos, pasos y responsables",
    icon: GitBranch,
  },
  {
    to: "/chat",
    label: "Matriz de IA",
    description: "Conversa con varios agentes a la vez",
    icon: MessageSquare,
  },
  {
    to: "/tareas",
    label: "Tareas",
    description: "Actividades, responsables y avances",
    icon: ListChecks,
  },
  {
    to: "/integraciones",
    label: "Integraciones",
    description: "API, conexiones y sincronización",
    icon: Link2,
  },
  {
    to: "/cuentas",
    label: "Cuentas y usuarios",
    description: "Correos, permisos y accesos autorizados",
    icon: Users,
  },
  {
    to: "/configuracion",
    label: "Configuración",
    description: "Administración general del portal",
    icon: Settings,
  },
];

export function navItemForPath(pathname: string): NavItem {
  const exact = NAV_ITEMS.find((item) => item.to === pathname);
  if (exact) return exact;
  const nested = NAV_ITEMS.filter((item) => item.to !== "/").find((item) =>
    pathname.startsWith(item.to),
  );
  return nested ?? NAV_ITEMS[0];
}

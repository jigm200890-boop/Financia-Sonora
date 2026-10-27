import { useMemo, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useTasks } from "@/hooks/use-portal-data";
import { useTheme } from "@/hooks/use-theme";
import { NAV_ITEMS, navItemForPath } from "@/components/portal/nav";
import { ROLE_LABELS } from "@/lib/portal-ui";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function Brand() {
  return (
    <div className="flex items-center gap-3 px-4 py-5">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-info text-sm font-bold tracking-tight text-primary-foreground shadow-glow">
        FS
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Financia Sonora
        </p>
        <p className="truncate text-sm font-semibold leading-tight text-foreground">
          Portal de Acceso Único
        </p>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { data: tasks } = useTasks();
  const openTasks = useMemo(
    () => (tasks ?? []).filter((task) => task.status !== "hecha").length,
    [tasks],
  );

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3 scrollbar-thin">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const badge = item.to === "/tareas" && openTasks > 0 ? openTasks : null;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-primary transition-opacity",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {badge ? (
                  <span className="grid min-w-[22px] place-items-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                    {badge}
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const { profile, user, role, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const email = profile?.email ?? user?.email ?? "";
  const name = profile?.full_name || email.split("@")[0] || "Usuario";

  return (
    <div className="space-y-3 border-t border-sidebar-border p-3">
      <div className="flex items-center gap-2.5 rounded-md bg-sidebar-accent/50 px-2.5 py-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold uppercase text-primary">
          {name.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">{name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {role ? ROLE_LABELS[role] : "Sin rol asignado"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={toggle}
          aria-label="Cambiar tema"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => void signOut()}
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function PortalShell() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = navItemForPath(location.pathname);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Abriendo el portal…
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Brand />
        <NavList />
        <SidebarFooter />
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-[280px] flex-col border-sidebar-border bg-sidebar p-0">
              <Brand />
              <NavList onNavigate={() => setMenuOpen(false)} />
              <SidebarFooter />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Portal de Acceso Único
            </p>
            <h1 className="truncate text-base font-semibold leading-tight text-foreground">
              {current.label}
            </h1>
          </div>

          <p className="hidden max-w-[340px] truncate text-xs text-muted-foreground md:block">
            {current.description}
          </p>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

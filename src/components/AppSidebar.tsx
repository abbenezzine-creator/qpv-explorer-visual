import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Map,
  CalendarDays,
  Building2,
  BookOpen,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  Library,
  ListChecks,
  DatabaseBackup,
  Plug,
  ClipboardList,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import { getUser, logout as authLogout, type AbUser } from "@/lib/auth";

type NavItem = { title: string; to: string; search?: Record<string, string>; icon: React.ComponentType<{ className?: string }> };

const territoire: NavItem[] = [
  { title: "Diagnostic Territorial", to: "/", icon: Map },
  { title: "Résultats & Impacts", to: "/app", search: { page: "resultats" }, icon: TrendingUp },
];

const principal: NavItem[] = [
  { title: "Tableau de bord", to: "/app", search: { page: "dashboard" }, icon: LayoutDashboard },
  { title: "Actions", to: "/app/actions", icon: CalendarDays },
  { title: "Associations", to: "/app/associations", icon: Building2 },
];

const evaluation: NavItem[] = [
  { title: "Évaluations bénéficiaires", to: "/app/evaluations", icon: ClipboardList },
  { title: "Impacts bénéficiaires", to: "/app", search: { page: "impacts-beneficiaires" }, icon: TrendingUp },
];

const ressources: NavItem[] = [
  { title: "Documents", to: "/app", search: { page: "documents" }, icon: FileText },
  { title: "Centre de Ressources", to: "/app", search: { page: "ressources" }, icon: Library },
  { title: "Guide du Référentiel", to: "/app", search: { page: "guide" }, icon: BookOpen },
];

const admin: NavItem[] = [
  { title: "Paramètres", to: "/app", search: { page: "parametres" }, icon: Settings },
  { title: "Sauvegarde & restauration", to: "/app", search: { page: "sauvegarde" }, icon: DatabaseBackup },
  { title: "Connexion", to: "/app", search: { page: "connexion" }, icon: Plug },
  { title: "Questionnaire thématique", to: "/app", search: { page: "questionnaire-thematique" }, icon: ListChecks },
];



export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const search = useRouterState({ select: (r) => r.location.search as { page?: string } });

  const isActive = (it: NavItem) => {
    if (it.to !== path) return false;
    if (!it.search) return !search?.page;
    return search?.page === it.search.page;
  };

  const [user, setUserState] = useState<AbUser | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setUserState(getUser());
    const sync = () => setUserState(getUser());
    window.addEventListener("ab-auth-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ab-auth-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const f = document.querySelector<HTMLIFrameElement>("iframe[title='AssocioBoard']");
      const w = f?.contentWindow as (Window & { doLogout?: () => void }) | null;
      w?.doLogout?.();
    } catch { /* noop */ }
    await authLogout();
    navigate({ to: "/login" });
  };

  const roleLabel: Record<string, string> = {
    superadmin: "Super Admin",
    admin_asso: "Admin Asso",
    agent: "Agent",
    partenaire: "Partenaire",
    viewer: "Lecteur",
  };

  const renderGroup = (label: string, items: NavItem[], extra?: React.ReactNode) => (
    <SidebarGroup>
      <SidebarGroupLabel className="font-bold uppercase tracking-wider text-xs">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        {extra}
        <SidebarMenu>
          {items.map((it) => {
            const active = isActive(it);
            return (
            <SidebarMenuItem key={it.title}>
              <SidebarMenuButton
                asChild
                isActive={active}
                className={
                  active
                    ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary hover:bg-primary/15 hover:text-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                    : ""
                }
              >
                <Link
                  to={it.to}
                  search={it.search as never}
                  className="flex items-center gap-2"
                >
                  <it.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                  {!collapsed && <span>{it.title}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  const isSuperAdmin = user?.role === "superadmin";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            O
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">AssocioBoard</span>
              <span className="text-[11px] text-muted-foreground">Contrat de Ville</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Territoire", territoire)}
        {renderGroup("Principal", principal)}
        {renderGroup("Évaluation", evaluation)}
        {renderGroup("Ressource Documentaire", ressources)}
        {isSuperAdmin && renderGroup("Administration", admin)}
      </SidebarContent>
      <SidebarFooter>
        {mounted && user && !collapsed && (
          <div className="px-2 pb-2">
            <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5">
              <div className="truncate text-xs font-semibold">{user.nom}</div>
              <div className="truncate text-[11px] text-muted-foreground">{roleLabel[user.role] ?? user.role}</div>
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Se déconnecter</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

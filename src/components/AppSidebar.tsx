import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Map,
  CalendarDays,
  Award,
  BookOpen,
  ClipboardList,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  Library,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type NavItem = { title: string; to: string; search?: Record<string, string>; icon: React.ComponentType<{ className?: string }> };

const territoire: NavItem[] = [
  { title: "Diagnostic Territorial", to: "/", icon: Map },
];

const principal: NavItem[] = [
  { title: "Tableau de bord", to: "/app", search: { page: "dashboard" }, icon: LayoutDashboard },
  { title: "Actions", to: "/app", search: { page: "agenda" }, icon: CalendarDays },
  { title: "Référentiel Qualité", to: "/app", search: { page: "qualite" }, icon: Award },
  { title: "Guide du Référentiel", to: "/app", search: { page: "guide" }, icon: BookOpen },
  { title: "Centre de Ressources", to: "/app", search: { page: "ressources" }, icon: Library },
];

const evaluation: NavItem[] = [
  { title: "Questionnaire", to: "/app", search: { page: "questionnaire" }, icon: ClipboardList },
  { title: "Documents", to: "/app", search: { page: "documents" }, icon: FileText },
  { title: "Résultats & Impacts", to: "/app", search: { page: "resultats" }, icon: TrendingUp },
];

const admin: NavItem[] = [
  { title: "Paramètres", to: "/app", search: { page: "parametres" }, icon: Settings },
];

const ASSOCIATIONS = [
  "Toutes les associations",
  "ACTION",
  "PASS'EMPLOI",
  "ASELQO",
  "Familles de France",
  "Maison de l'Emploi",
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

  const handleLogout = () => {
    try {
      const f = document.querySelector<HTMLIFrameElement>("iframe[title='AssocioBoard']");
      const w = f?.contentWindow as (Window & { logout?: () => void; currentUser?: unknown }) | null;
      if (w?.logout) w.logout();
      else if (w) w.location.reload();
    } catch {
      /* noop */
    }
    navigate({ to: "/" });
  };

  const renderGroup = (label: string, items: NavItem[], extra?: React.ReactNode) => (
    <SidebarGroup>
      <SidebarGroupLabel className="font-bold uppercase tracking-wider text-xs">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        {extra}
        <SidebarMenu>
          {items.map((it) => (
            <SidebarMenuItem key={it.title}>
              <SidebarMenuButton asChild isActive={isActive(it)}>
                <Link
                  to={it.to}
                  search={it.search as never}
                  className="flex items-center gap-2"
                >
                  <it.icon className="h-4 w-4" />
                  {!collapsed && <span>{it.title}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  const associationsSelector = !collapsed ? (
    <div className="px-2 pb-2">
      <Select defaultValue="Toutes les associations">
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Associations" />
        </SelectTrigger>
        <SelectContent>
          {ASSOCIATIONS.map((a) => (
            <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null;

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
        {renderGroup("Principal", principal, associationsSelector)}
        {renderGroup("Évaluation", evaluation)}
        {renderGroup("Administration", admin)}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Déconnexion</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

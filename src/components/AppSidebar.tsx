import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Map,
  CalendarDays,
  Award,
  BookOpen,
  ClipboardList,
  Heart,
  TrendingUp,
  FileText,
  Settings,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = { title: string; to: string; search?: Record<string, string>; icon: React.ComponentType<{ className?: string }> };

const territoire: NavItem[] = [
  { title: "Diagnostic Territorial", to: "/", icon: Map },
];

const principal: NavItem[] = [
  { title: "Tableau de bord", to: "/app", search: { page: "dashboard" }, icon: LayoutDashboard },
  { title: "Actions", to: "/app", search: { page: "agenda" }, icon: CalendarDays },
  { title: "Référentiel Qualité", to: "/app", search: { page: "qualite" }, icon: Award },
  { title: "Guide du Référentiel", to: "/app", search: { page: "guide" }, icon: BookOpen },
];

const evaluation: NavItem[] = [
  { title: "Questionnaire", to: "/app", search: { page: "questionnaire" }, icon: ClipboardList },
  { title: "Utilité Sociale", to: "/app", search: { page: "utilite" }, icon: Heart },
  { title: "Documents", to: "/app", search: { page: "documents" }, icon: FileText },
  { title: "Résultats & Impacts", to: "/app", search: { page: "resultats" }, icon: TrendingUp },
];

const admin: NavItem[] = [
  { title: "Paramètres", to: "/app", search: { page: "parametres" }, icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const search = useRouterState({ select: (r) => r.location.search as { page?: string } });

  const isActive = (it: NavItem) => {
    if (it.to !== path) return false;
    if (!it.search) return !search?.page;
    return search?.page === it.search.page;
  };

  const renderGroup = (label: string, items: NavItem[]) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
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
        {renderGroup("Administration", admin)}
      </SidebarContent>
    </Sidebar>
  );
}

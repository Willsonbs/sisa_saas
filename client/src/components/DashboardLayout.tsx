import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, LogOut, PanelLeft, Users, Calendar, CalendarDays,
  CreditCard, Building2, Settings, Lock, Shield, ClipboardList,
  FileBarChart2, Circle
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const getMenuItems = (role: string) => {
  if (role === 'admin') {
    return [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
      { icon: Building2, label: "Gerenciar Salas", path: "/admin/rooms" },
      { icon: CalendarDays, label: "Calendário de Reservas", path: "/admin/calendar" },
      { icon: Lock, label: "Bloqueios de Sala", path: "/admin/room-blocks" },
      { icon: Settings, label: "Regras de Cancelamento", path: "/admin/cancellation-rules" },
      { icon: Users, label: "Profissionais", path: "/admin/professionals" },
      { icon: FileBarChart2, label: "Relatórios", path: "/admin/reports" },
      { icon: Shield, label: "Trilha de Auditoria", path: "/admin/audit" },
      { icon: Settings, label: "Configurações", path: "/admin/settings" },
    ];
  }
  return [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Building2, label: "Salas", path: "/rooms" },
    { icon: Calendar, label: "Minhas Reservas", path: "/bookings" },
    { icon: CreditCard, label: "Créditos", path: "/credits" },
    { icon: ClipboardList, label: "Lista de Espera", path: "/waitlist" },
    { icon: Settings, label: "Configurações", path: "/settings" },
  ];
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F3EF]">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="bg-[#7C5C4A] text-[#F5F3EF] px-4 py-1.5 text-sm font-medium rounded-sm tracking-wide mb-4">
            SISA
          </div>
          <h1 className="text-2xl font-light tracking-tight text-center text-[#3D3D2E]">
            Acesso necessário
          </h1>
          <p className="text-sm text-[#6B6560] text-center max-w-sm font-light">
            Para acessar o painel, é necessário fazer login na sua conta.
          </p>
          <Button
            onClick={() => { window.location.href = "/login"; }}
            size="lg"
            className="w-full rounded-full bg-[#3D3D2E] hover:bg-[#2A2A1E] text-white"
          >
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const menuItems = getMenuItems(user?.role || 'user');
  const activeMenuItem = menuItems.find((item: any) => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        {/* Sidebar with forest-dark background */}
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          {/* Header */}
          <SidebarHeader className="h-16 justify-center border-b border-[#4A4A38]">
            <div className="flex items-center gap-3 px-3 w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-[#4A4A38] rounded-lg transition-colors focus:outline-none shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-[#A8A49E]" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  {/* Terracotta brand pill */}
                  <div className="bg-[#7C5C4A] text-[#F5F3EF] px-3 py-1 text-xs font-medium rounded-sm tracking-wide shrink-0">
                    SISA
                  </div>
                  <span className="text-xs text-[#A8A49E] truncate font-light">
                    {user?.role === 'admin' ? 'Administrador' : 'Profissional'}
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Navigation */}
          <SidebarContent className="gap-0 py-3">
            <SidebarMenu className="px-2">
              {menuItems.map((item: any) => {
                const isActive = location === item.path || location.startsWith(item.path + '/');
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-light rounded-lg
                        ${isActive
                          ? 'bg-[#7C5C4A] text-[#F5F3EF] hover:bg-[#7C5C4A]'
                          : 'text-[#C8C4BE] hover:bg-[#4A4A38] hover:text-[#F5F3EF]'
                        }`}
                    >
                      <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#F5F3EF]' : 'text-[#A8A49E]'}`} />
                      <span className="font-light">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          {/* Footer / User */}
          <SidebarFooter className="p-3 border-t border-[#4A4A38]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#4A4A38] transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 shrink-0 border border-[#7C5C4A]">
                    <AvatarFallback className="text-xs font-medium bg-[#7C5C4A] text-[#F5F3EF]">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-[#F5F3EF]">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-[#A8A49E] truncate mt-1">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#7C5C4A]/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-[#F5F3EF]">
        {/* Mobile header */}
        {isMobile && (
          <div className="flex border-b border-[#E8E4DF] h-14 items-center justify-between bg-white/95 px-4 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <div className="bg-[#7C5C4A] text-[#F5F3EF] px-3 py-1 text-xs font-medium rounded-sm tracking-wide">
                SISA
              </div>
              <span className="text-sm text-[#6B6560] font-light">
                {activeMenuItem?.label ?? "Menu"}
              </span>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </>
  );
}

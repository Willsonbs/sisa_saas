import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import {
  LayoutDashboard, Building2, CreditCard, Users, FileText,
  Shield, ChevronRight, LogOut, Menu, X, Settings,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "./ui/button";

const SISA_DARK  = "#1A1A14";
const SISA_MID   = "#2C2C20";
const SISA_ACCENT = "#7C5C4A";
const SISA_LIGHT = "#EDE8E3";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard",       path: "/sisa/dashboard" },
  { icon: Building2,       label: "Tenants",         path: "/sisa/tenants" },
  { icon: Settings,        label: "Planos",          path: "/sisa/plans" },
  { icon: CreditCard,      label: "Financeiro",      path: "/sisa/billing" },
  { icon: Users,           label: "Usuários",        path: "/sisa/users" },
  { icon: Shield,          label: "Auditoria",       path: "/sisa/audit" },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/login"; },
    onError: () => toast.error("Erro ao sair"),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: SISA_DARK }}>
        <div className="w-8 h-8 border-2 border-[#7C5C4A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "super_admin") {
    setLocation("/login");
    return null;
  }

  const Sidebar = ({ mobile = false }) => (
    <div
      className={`flex flex-col h-full ${mobile ? "w-64" : "w-60"}`}
      style={{ background: SISA_DARK, borderRight: `1px solid ${SISA_MID}` }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: SISA_MID }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white" style={{ background: SISA_ACCENT }}>
            S
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-white uppercase">SISA</p>
            <p className="text-[10px]" style={{ color: "#9A8A7A" }}>Painel de Gestão</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = location === path || location.startsWith(path + "/");
          return (
            <Link key={path} href={path}>
              <a
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all"
                style={{
                  background: active ? SISA_MID : "transparent",
                  color: active ? SISA_LIGHT : "#9A8A7A",
                  fontWeight: active ? 600 : 400,
                }}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
                {active && <ChevronRight className="h-3 w-3 ml-auto" style={{ color: SISA_ACCENT }} />}
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t" style={{ borderColor: SISA_MID }}>
        <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-md" style={{ background: SISA_MID }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: SISA_ACCENT }}>
            {(user.name ?? user.email)[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user.name ?? "Super Admin"}</p>
            <p className="text-[10px] truncate" style={{ color: "#9A8A7A" }}>{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => logoutMutation.mutate()}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors hover:bg-[#2C2C20]"
          style={{ color: "#9A8A7A" }}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F5F3EF" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-white">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5 text-[#3D3D2E]" />
          </button>
          <p className="text-sm font-semibold text-[#3D3D2E]">SISA — Painel de Gestão</p>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

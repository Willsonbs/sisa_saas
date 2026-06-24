import SuperAdminLayout from "@/components/SuperAdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

const FOREST = "#3D3D2E";

const roleLabel: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  professional: "Profissional",
  receptionist: "Recepcionista",
  financial: "Financeiro",
};

const roleColor: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  professional: "bg-green-100 text-green-700",
  receptionist: "bg-amber-100 text-amber-700",
  financial: "bg-gray-100 text-gray-700",
};

export default function SisaUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const { data, isLoading } = trpc.superAdmin.listUsers.useQuery({ search, role: roleFilter || undefined });

  return (
    <SuperAdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: FOREST }}>Usuários</h1>
          <p className="text-sm text-muted-foreground">Todos os usuários cadastrados na plataforma</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["", "super_admin", "admin", "professional", "receptionist", "financial"].map(r => (
              <Button
                key={r}
                variant="outline"
                size="sm"
                className={roleFilter === r ? "border-[#7C5C4A] bg-[#EDE8E3]" : ""}
                onClick={() => setRoleFilter(r)}
              >
                {r === "" ? "Todos" : roleLabel[r]}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-[#D8D0C8] overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8E3DC]" style={{ background: "#F5F3EF" }}>
                  <th className="text-left px-4 py-3 font-medium text-[#3D3D2E]">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-[#3D3D2E]">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-[#3D3D2E]">Perfil</th>
                  <th className="text-left px-4 py-3 font-medium text-[#3D3D2E]">Empresa</th>
                  <th className="text-left px-4 py-3 font-medium text-[#3D3D2E]">Cadastro</th>
                  <th className="text-left px-4 py-3 font-medium text-[#3D3D2E]">Último Acesso</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#E8E3DC]">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : data?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum usuário encontrado</td>
                  </tr>
                ) : data?.map(u => (
                  <tr key={u.id} className="border-b border-[#E8E3DC] hover:bg-[#FAFAF8] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#3D3D2E]">{u.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[u.role] ?? "bg-gray-100 text-gray-700"}`}>
                        {roleLabel[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.tenantName ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleString("pt-BR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}

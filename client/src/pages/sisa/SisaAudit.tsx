import SuperAdminLayout from "@/components/SuperAdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

const FOREST = "#3D3D2E";

const actionColor: Record<string, string> = {
  "tenant.activate": "bg-green-100 text-green-700",
  "tenant.block": "bg-red-100 text-red-700",
  "IMPERSONATE_TENANT": "bg-purple-100 text-purple-700",
  "plan.create": "bg-blue-100 text-blue-700",
  "plan.update": "bg-amber-100 text-amber-700",
  "booking.cancel": "bg-orange-100 text-orange-700",
  "booking.adminCancel": "bg-red-100 text-red-700",
};

export default function SisaAudit() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [limit, setLimit] = useState(100);

  const { data, isLoading } = trpc.superAdmin.listAuditLogs.useQuery({ limit });

  const filtered = data?.filter(log =>
    !search ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    (log.userEmail ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (log.entityType ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SuperAdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: FOREST }}>Auditoria</h1>
          <p className="text-sm text-muted-foreground">Registro de ações críticas na plataforma</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por ação, email ou entidade..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLimit(l => l + 100)}
          >
            Carregar mais
          </Button>
        </div>

        {/* Log list */}
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
            ))
          ) : filtered?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhum registro encontrado</div>
          ) : filtered?.map(log => (
            <Card key={log.id} className="border border-[#D8D0C8]">
              <CardContent className="p-0">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#FAFAF8] transition-colors"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${actionColor[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                    {log.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#3D3D2E] truncate">
                      <span className="font-medium">{log.userEmail}</span>
                      {log.entityType && <span className="text-muted-foreground"> → {log.entityType}{log.entityId ? ` #${log.entityId}` : ""}</span>}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(log.createdAt).toLocaleString("pt-BR")}
                  </span>
                  {expanded === log.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {expanded === log.id && (
                  <div className="px-4 pb-3 border-t border-[#E8E3DC] pt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {log.ipAddress && (
                        <div>
                          <p className="text-muted-foreground">IP</p>
                          <p className="font-mono text-[#3D3D2E]">{log.ipAddress}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Usuário ID</p>
                        <p className="font-mono text-[#3D3D2E]">#{log.userId}</p>
                      </div>
                    </div>
                    {log.before && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Antes</p>
                        <pre className="text-xs bg-[#F5F3EF] rounded p-2 overflow-x-auto text-[#3D3D2E]">
                          {JSON.stringify(JSON.parse(log.before), null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.after && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Depois</p>
                        <pre className="text-xs bg-[#F5F3EF] rounded p-2 overflow-x-auto text-[#3D3D2E]">
                          {JSON.stringify(JSON.parse(log.after), null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
}

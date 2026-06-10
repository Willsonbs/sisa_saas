import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, User, Calendar, FileText } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  "booking.cancel": "bg-red-100 text-red-800",
  "booking.no_show": "bg-orange-100 text-orange-800",
  "booking.confirm": "bg-green-100 text-green-800",
  "room.block": "bg-yellow-100 text-yellow-800",
  "room.unblock": "bg-blue-100 text-blue-800",
  "room.price_change": "bg-purple-100 text-purple-800",
  "credit.manual_add": "bg-emerald-100 text-emerald-800",
  "professional.approve": "bg-teal-100 text-teal-800",
  "professional.block": "bg-red-100 text-red-800",
  "tenant.update": "bg-blue-100 text-blue-800",
};

export default function AuditLogs() {
  const { data: logs, isLoading } = trpc.audit.list.useQuery({ limit: 200 });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trilha de Auditoria</h1>
          <p className="text-gray-500 mt-1">Registro completo de todas as ações críticas do sistema.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Registro de Ações
            </CardTitle>
            <CardDescription>Últimas 200 ações registradas no sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : !logs?.length ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma ação registrada ainda</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: any) => {
                      const actionColor = ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800";
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-sm">{log.userEmail || `#${log.userId}`}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionColor}`}>
                              {log.action}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="text-gray-600">{log.entityType}</span>
                            {log.entityId && <span className="text-gray-400 ml-1">#{log.entityId}</span>}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 max-w-xs">
                            {log.after ? (
                              <details className="cursor-pointer">
                                <summary className="text-blue-600 hover:underline text-xs">Ver detalhes</summary>
                                <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                                  {JSON.stringify(JSON.parse(log.after), null, 2)}
                                </pre>
                              </details>
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

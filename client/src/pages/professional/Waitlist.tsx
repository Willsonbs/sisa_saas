import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, MoreVertical, Bell, CheckCircle2, Clock, Phone, Mail, Calendar, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  waiting: { label: "Aguardando", variant: "secondary" },
  notified: { label: "Notificado", variant: "default" },
  converted: { label: "Convertido", variant: "outline" },
  expired: { label: "Expirado", variant: "destructive" },
};

const DAY_LABELS: Record<string, string> = {
  monday: "Seg", tuesday: "Ter", wednesday: "Qua",
  thursday: "Qui", friday: "Sex", saturday: "Sáb", sunday: "Dom",
};

export default function WaitlistPage() {
  const { user } = useAuth();
  const { data: entries, isLoading, refetch } = trpc.waitlist.list.useQuery();

  const notifyMutation = trpc.waitlist.notify.useMutation({
    onSuccess: () => { toast.success("Paciente marcado como notificado"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const convertMutation = trpc.waitlist.convert.useMutation({
    onSuccess: () => { toast.success("Entrada convertida em consulta"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const copyLink = () => {
    if (!user?.publicProfileSlug) {
      toast.error("Configure seu perfil público primeiro (slug não definido)");
      return;
    }
    const url = `${window.location.origin}/p/${user.publicProfileSlug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para a área de transferência!");
  };

  const formatDays = (daysJson: string | null) => {
    if (!daysJson) return null;
    try {
      const days: string[] = JSON.parse(daysJson);
      return days.map(d => DAY_LABELS[d] || d).join(", ");
    } catch { return null; }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lista de Espera</h1>
            <p className="text-gray-500 mt-1">Pacientes aguardando disponibilidade de horário</p>
          </div>
          <Button onClick={copyLink} variant="outline" className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Copiar link do portal
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Aguardando", value: entries?.filter(e => e.status === "waiting").length || 0, icon: Clock, color: "text-yellow-600" },
            { label: "Notificados", value: entries?.filter(e => e.status === "notified").length || 0, icon: Bell, color: "text-blue-600" },
            { label: "Convertidos", value: entries?.filter(e => e.status === "converted").length || 0, icon: CheckCircle2, color: "text-green-600" },
            { label: "Total", value: entries?.length || 0, icon: Users, color: "text-gray-600" },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Pacientes na Lista</CardTitle>
            <CardDescription>
              Gerencie os pacientes que aguardam disponibilidade de horário.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : !entries?.length ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhum paciente na lista de espera</p>
                <p className="text-sm text-gray-400 mt-1">
                  Compartilhe seu link de portal para que pacientes possam se cadastrar.
                </p>
                <Button onClick={copyLink} variant="outline" className="mt-4">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar link do portal
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Preferências</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map(entry => {
                      const statusInfo = STATUS_LABELS[entry.status] || { label: entry.status, variant: "outline" as const };
                      const days = formatDays(entry.preferredDays);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{entry.patientName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              {entry.contactType === "email" ? <Mail className="h-3.5 w-3.5 text-gray-400" /> : <Phone className="h-3.5 w-3.5 text-gray-400" />}
                              <span className="text-gray-600">{entry.patientContact}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-600 space-y-0.5">
                              {days && <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {days}</div>}
                              {entry.preferredTimeStart && entry.preferredTimeEnd && (
                                <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {entry.preferredTimeStart} – {entry.preferredTimeEnd}</div>
                              )}
                              {!days && !entry.preferredTimeStart && <span className="text-gray-400 text-xs">Sem preferência</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(entry.createdAt).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            {entry.status === "waiting" || entry.status === "notified" ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {entry.status === "waiting" && (
                                    <DropdownMenuItem onClick={() => notifyMutation.mutate({ id: entry.id })}>
                                      <Bell className="h-4 w-4 mr-2" />
                                      Marcar como notificado
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => convertMutation.mutate({ id: entry.id })}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Marcar como convertido
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}
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

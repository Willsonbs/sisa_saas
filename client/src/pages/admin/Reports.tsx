import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BarChart3, Calendar, DollarSign, TrendingUp, Users, Download } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const { data: stats } = trpc.admin.stats.useQuery();
  const { data: rooms } = trpc.rooms.list.useQuery();
  const { data: bookings } = trpc.bookings.list.useQuery();

  const escapeCSV = (val: any) => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const exportCSV = () => {
    if (!bookings || bookings.length === 0) {
      toast.error("Nenhuma reserva para exportar");
      return;
    }

    // Sheet 1: Reservas detalhadas
    const bookingHeaders = ["ID", "Sala ID", "Profissional ID", "Paciente", "Início", "Fim", "Status", "Preço (créditos)"];
    const bookingRows = bookings.map(b => [
      b.id,
      b.roomId,
      b.professionalId,
      b.patientName || "",
      new Date(b.startTime).toLocaleString("pt-BR"),
      new Date(b.endTime).toLocaleString("pt-BR"),
      b.status,
      b.totalPrice,
    ]);

    // Sheet 2: Ocupação por sala
    const occupationHeaders = ["Sala", "Total Reservas Confirmadas", "Taxa de Ocupação (%)"];
    const occupationRows = (rooms || []).map(room => {
      const roomBookings = bookings.filter(b => b.roomId === room.id && b.status === "confirmed");
      const rate = Math.min(100, (roomBookings.length / 30) * 100);
      return [room.name, roomBookings.length, rate.toFixed(1)];
    });

    // Sheet 3: Distribuição por período
    const periodHeaders = ["Período", "Total Reservas"];
    const periodRows = [
      ["Manhã (08-12h)", bookings.filter(b => { const h = new Date(b.startTime).getHours(); return h >= 8 && h < 12; }).length],
      ["Tarde (12-18h)", bookings.filter(b => { const h = new Date(b.startTime).getHours(); return h >= 12 && h < 18; }).length],
      ["Noite (18-22h)", bookings.filter(b => { const h = new Date(b.startTime).getHours(); return h >= 18 && h < 22; }).length],
    ];

    const buildSection = (title: string, headers: string[], rows: any[][]) => [
      [title],
      headers.map(escapeCSV).join(","),
      ...rows.map(r => r.map(escapeCSV).join(",")),
      "",
    ];

    const lines = [
      ...buildSection("RESERVAS DETALHADAS", bookingHeaders, bookingRows),
      ...buildSection("OCUPA\u00c7\u00c3O POR SALA", occupationHeaders, occupationRows),
      ...buildSection("DISTRIBUI\u00c7\u00c3O POR PER\u00cdODO", periodHeaders, periodRows),
    ];

    const csvContent = lines.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio_sisa_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado com sucesso!");
  };

  return (
    <DashboardLayout>
      <div className="container py-8 space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Relatórios Gerenciais</h1>
            <p className="text-muted-foreground mt-2">
              Análise de desempenho e estatísticas do sistema
            </p>
          </div>
          <Button onClick={exportCSV} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Estatísticas Gerais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Salas</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rooms?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {rooms?.filter(r => r.isActive).length || 0} ativas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Reservas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {bookings?.filter(b => b.status === 'confirmed').length || 0} confirmadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profissionais Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalProfessionals || 0}</div>
              <p className="text-xs text-muted-foreground">
                Cadastrados no sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Créditos em Circulação</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Total disponível
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ocupação por Sala */}
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Ocupação por Sala</CardTitle>
            <CardDescription>
              Percentual de ocupação de cada sala no último mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rooms?.map((room) => {
                const roomBookings = bookings?.filter(b => b.roomId === room.id && b.status === 'confirmed') || [];
                const occupationRate = roomBookings.length > 0 ? Math.min(100, (roomBookings.length / 30) * 100) : 0;
                
                return (
                  <div key={room.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{room.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {occupationRate.toFixed(1)}%
                      </div>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${occupationRate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Horários Mais Disputados */}
        <Card>
          <CardHeader>
            <CardTitle>Horários Mais Disputados</CardTitle>
            <CardDescription>
              Períodos com maior número de reservas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Manhã (08:00 - 12:00)</div>
                  <div className="text-sm text-muted-foreground">
                    {bookings?.filter(b => {
                      const hour = new Date(b.startTime).getHours();
                      return hour >= 8 && hour < 12;
                    }).length || 0} reservas
                  </div>
                </div>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Tarde (12:00 - 18:00)</div>
                  <div className="text-sm text-muted-foreground">
                    {bookings?.filter(b => {
                      const hour = new Date(b.startTime).getHours();
                      return hour >= 12 && hour < 18;
                    }).length || 0} reservas
                  </div>
                </div>
                <TrendingUp className="h-5 w-5 text-yellow-500" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Noite (18:00 - 22:00)</div>
                  <div className="text-sm text-muted-foreground">
                    {bookings?.filter(b => {
                      const hour = new Date(b.startTime).getHours();
                      return hour >= 18 && hour < 22;
                    }).length || 0} reservas
                  </div>
                </div>
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Faturamento por Profissional */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Profissionais por Uso</CardTitle>
            <CardDescription>
              Profissionais com mais reservas realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookings && bookings.length > 0 ? (
                (() => {
                  const professionalBookings = bookings.reduce((acc, booking) => {
                    const key = booking.professionalId;
                    if (!acc[key]) {
                      acc[key] = {
                        count: 0,
                        totalCredits: 0,
                      };
                    }
                    acc[key].count++;
                    acc[key].totalCredits += booking.totalPrice;
                    return acc;
                  }, {} as Record<number, { count: number; totalCredits: number }>);

                  const sortedProfessionals = Object.entries(professionalBookings)
                    .sort(([, a], [, b]) => b.count - a.count)
                    .slice(0, 10);

                  return sortedProfessionals.map(([userId, data], index) => (
                    <div key={userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">Profissional #{userId}</div>
                          <div className="text-sm text-muted-foreground">
                            {data.count} reservas
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{data.totalCredits} créditos</div>
                      </div>
                    </div>
                  ));
                })()
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma reserva registrada ainda
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

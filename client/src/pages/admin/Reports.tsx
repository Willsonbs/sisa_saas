import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { BarChart3, Download, Users, DollarSign, Calendar, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

function fmtDate(d: Date) {
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}
function fmtTime(d: Date) {
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function Reports() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(toDateInputValue(firstOfMonth));
  const [endDate, setEndDate] = useState(toDateInputValue(today));
  const [filterRoom, setFilterRoom] = useState<string>("all");

  const parsedStart = useMemo(() => startDate ? new Date(startDate + "T00:00:00") : undefined, [startDate]);
  const parsedEnd = useMemo(() => endDate ? new Date(endDate + "T23:59:59") : undefined, [endDate]);

  const { data: rooms = [] } = trpc.rooms.list.useQuery({ includeInactive: false });
  const { data: reportData = [], isLoading } = trpc.admin.reportByRoom.useQuery(
    { roomId: filterRoom !== "all" ? parseInt(filterRoom) : undefined, startDate: parsedStart, endDate: parsedEnd },
    { refetchOnWindowFocus: false }
  );

  const summary = useMemo(() => {
    const totalBookings = reportData.reduce((s, r) => s + r.totalBookings, 0);
    const totalRevenue = reportData.reduce((s, r) => s + r.totalRevenue, 0);
    const allBookings = reportData.flatMap(r => r.bookings);
    const uniqueProfessionals = new Set(allBookings.map((b: any) => b.professionalId)).size;
    return { totalBookings, totalRevenue, uniqueProfessionals };
  }, [reportData]);

  function printReport() {
    const win = window.open("", "_blank");
    if (!win) return;
    const periodLabel = `${startDate ? fmtDate(new Date(startDate + "T00:00:00")) : "—"} a ${endDate ? fmtDate(new Date(endDate + "T00:00:00")) : "—"}`;
    const roomLabel = filterRoom !== "all" ? rooms.find(r => r.id === parseInt(filterRoom))?.name || "Sala" : "Todas as salas";

    let html = `<html><head><title>Relatório SISA</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #222; padding: 24px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .subtitle { color: #666; margin-bottom: 20px; }
        .summary { display: flex; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
        .summary-card { border: 1px solid #ddd; border-radius: 6px; padding: 12px 20px; min-width: 140px; }
        .summary-card .label { font-size: 11px; color: #888; }
        .summary-card .value { font-size: 18px; font-weight: bold; margin-top: 2px; }
        h2 { font-size: 14px; margin: 20px 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #f5f5f5; text-align: left; padding: 6px 10px; font-size: 11px; border: 1px solid #ddd; }
        td { padding: 6px 10px; border: 1px solid #eee; font-size: 11px; }
        tr:nth-child(even) td { background: #fafafa; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>Relatório de Reservas — SISA</h1>
      <div class="subtitle">Período: ${periodLabel} · Sala: ${roomLabel}</div>
      <div class="summary">
        <div class="summary-card"><div class="label">Total de Reservas</div><div class="value">${summary.totalBookings}</div></div>
        <div class="summary-card"><div class="label">Receita Total</div><div class="value">${formatCurrency(summary.totalRevenue)}</div></div>
        <div class="summary-card"><div class="label">Prestadores Únicos</div><div class="value">${summary.uniqueProfessionals}</div></div>
      </div>`;

    for (const r of reportData) {
      if (r.bookings.length === 0) continue;
      html += `<h2>${r.room.name} — ${r.totalBookings} reserva(s) · ${formatCurrency(r.totalRevenue)}</h2>
      <table><tr><th>Prestador</th><th>Data</th><th>Horário</th><th>Valor</th></tr>`;
      for (const b of r.bookings) {
        const start = new Date(b.startTime);
        const end = new Date(b.endTime);
        html += `<tr><td>${(b as any).professionalName}</td><td>${fmtDate(start)}</td><td>${fmtTime(start)} - ${fmtTime(end)}</td><td>${formatCurrency(b.totalPrice)}</td></tr>`;
      }
      html += `</table>`;
    }
    html += `<div style="margin-top:32px;font-size:10px;color:#aaa">Gerado em ${new Date().toLocaleString("pt-BR")} · SISA Sistema de Gerenciamento de Salas</div></body></html>`;

    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">Análise de ocupação e receita por sala</p>
          </div>
          <Button onClick={printReport} variant="outline" className="gap-2">
            <Download className="h-4 w-4"/> Imprimir / Exportar PDF
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <Label htmlFor="startDate">Data inicial</Label>
                <Input id="startDate" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-40"/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate">Data final</Label>
                <Input id="endDate" type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-40"/>
              </div>
              <div className="space-y-1">
                <Label>Sala</Label>
                <Select value={filterRoom} onValueChange={setFilterRoom}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Todas as salas"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as salas</SelectItem>
                    {rooms.map(r=><SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Reservas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalBookings}</div>
              <p className="text-xs text-muted-foreground">reservas confirmadas no período</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">soma de todas as reservas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Prestadores Únicos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.uniqueProfessionals}</div>
              <p className="text-xs text-muted-foreground">profissionais com reservas</p>
            </CardContent>
          </Card>
        </div>

        {/* Per-room report */}
        {isLoading ? (
          <div className="space-y-3">{[1,2].map(i=><div key={i} className="h-32 bg-muted animate-pulse rounded-lg"/>)}</div>
        ) : reportData.length === 0 ? (
          <Card><CardContent className="text-center py-12">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50"/>
            <p className="text-lg font-medium">Nenhuma reserva no período selecionado</p>
            <p className="text-sm text-muted-foreground mt-1">Ajuste os filtros de data e sala para visualizar os dados</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-6">
            {reportData.map(r => (
              <Card key={r.room.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary"/>
                      <CardTitle className="text-lg">{r.room.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">{r.totalBookings} reserva(s)</span>
                      <span className="font-semibold text-green-600">{formatCurrency(r.totalRevenue)}</span>
                    </div>
                  </div>
                </CardHeader>
                {r.bookings.length > 0 ? (
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-t border-b bg-muted/20">
                          <th className="text-left px-4 py-2 font-medium">Prestador</th>
                          <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Data</th>
                          <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Horário</th>
                          <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Duração</th>
                          <th className="text-right px-4 py-2 font-medium">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.bookings.map((b: any) => {
                          const start = new Date(b.startTime);
                          const end = new Date(b.endTime);
                          const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
                          const durationLabel = durationMin >= 60
                            ? `${Math.floor(durationMin/60)}h${durationMin%60>0?` ${durationMin%60}min`:""}`
                            : `${durationMin}min`;
                          return (
                            <tr key={b.id} className="border-b last:border-0 hover:bg-muted/10">
                              <td className="px-4 py-2 font-medium">{b.professionalName}</td>
                              <td className="px-4 py-2 hidden sm:table-cell text-muted-foreground">{fmtDate(start)}</td>
                              <td className="px-4 py-2 hidden md:table-cell text-muted-foreground">{fmtTime(start)} – {fmtTime(end)}</td>
                              <td className="px-4 py-2 hidden lg:table-cell text-muted-foreground">{durationLabel}</td>
                              <td className="px-4 py-2 text-right font-medium">{formatCurrency(b.totalPrice)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                ) : (
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma reserva confirmada nesta sala no período</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

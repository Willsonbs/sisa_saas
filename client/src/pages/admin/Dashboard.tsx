import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import { Building2, Users, Calendar, Settings, DollarSign, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const TERRACOTTA = "#7C5C4A";
const FOREST = "#3D3D2E";

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();
  const { data: charts, isLoading: chartsLoading } = trpc.admin.dashboardCharts.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground">Visão geral do sistema SISA</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Salas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-12 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalRooms || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.activeRooms || 0} ativas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profissionais</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-12 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-bold">{stats?.totalProfessionals || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Cadastrados no sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reservas Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-12 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-bold">{stats?.bookingsToday ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Confirmadas para hoje
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-bold">{formatCurrency(stats?.revenueThisMonth ?? 0)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Neste mês
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesso rápido às funcionalidades administrativas</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            <Button asChild>
              <Link href="/admin/rooms">
                <Building2 className="mr-2 h-4 w-4" />
                Gerenciar Salas
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/reports">
                <TrendingUp className="mr-2 h-4 w-4" />
                Relatórios
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Reservas por Dia da Semana</CardTitle>
              <CardDescription>Últimos 30 dias — identifique os dias mais parados</CardDescription>
            </CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="h-[220px] bg-muted animate-pulse rounded" />
              ) : charts && charts.byWeekday.some(d => d.total > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={charts.byWeekday}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DC" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip formatter={(v: number) => [v, "Reservas"]} />
                    <Bar dataKey="total" fill={TERRACOTTA} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Sem reservas nos últimos 30 dias</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Horas Reservadas por Sala</CardTitle>
              <CardDescription>Últimos 30 dias — identifique salas ociosas ou saturadas</CardDescription>
            </CardHeader>
            <CardContent>
              {chartsLoading ? (
                <div className="h-[220px] bg-muted animate-pulse rounded" />
              ) : charts && charts.roomHours.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={charts.roomHours} layout="vertical" margin={{ left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DC" />
                    <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="roomName" tick={{ fontSize: 12 }} width={90} />
                    <Tooltip formatter={(v: number) => [`${v}h`, "Horas reservadas"]} />
                    <Bar dataKey="hours" fill={FOREST} radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Sem reservas nos últimos 30 dias</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
}

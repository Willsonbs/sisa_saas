import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Building2, Users, Calendar, Settings, DollarSign, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();
  const { data: rooms } = trpc.rooms.list.useQuery({ includeInactive: true });
  const { data: cancellationRules } = trpc.cancellationRules.list.useQuery();

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
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground mt-1">
                Em desenvolvimento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground mt-1">
                Em desenvolvimento
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
              <Link href="/admin/cancellation-rules">
                <Settings className="mr-2 h-4 w-4" />
                Regras de Cancelamento
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

        {/* Rooms Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Salas Cadastradas</CardTitle>
            <CardDescription>Visão geral de todas as salas do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {rooms && rooms.length > 0 ? (
              <div className="space-y-3">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          room.isActive
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{room.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Capacidade: {room.capacity} • R$ {(room.pricePerHour / 100).toFixed(2)}/h
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          room.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {room.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/rooms/${room.id}/edit`}>Editar</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma sala cadastrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancellation Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Regras de Cancelamento</CardTitle>
            <CardDescription>Políticas de reembolso configuradas</CardDescription>
          </CardHeader>
          <CardContent>
            {cancellationRules && cancellationRules.length > 0 ? (
              <div className="space-y-3">
                {cancellationRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {rule.hoursBeforeBooking}h antes: {rule.refundPercentage}% de reembolso
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {rule.description}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        rule.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {rule.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma regra configurada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

import SuperAdminLayout from "@/components/SuperAdminLayout";
import { trpc } from "@/lib/trpc";
import { Building2, Users, DoorOpen, CalendarCheck, TrendingUp, Clock, BadgeDollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const TERRACOTTA = "#7C5C4A";
const FOREST     = "#3D3D2E";

function KpiCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <Card className="border border-[#D8D0C8]">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold" style={{ color: FOREST }}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="p-2 rounded-lg" style={{ background: "#EDE8E3" }}>
            <Icon className="h-5 w-5" style={{ color: TERRACOTTA }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function SisaDashboard() {
  const { data, isLoading } = trpc.superAdmin.dashboard.useQuery();

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: FOREST }}>Painel de Gestão SISA</h1>
          <p className="text-sm text-muted-foreground">Visão geral da plataforma</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={Building2}       label="Empresas Cadastradas"  value={data.totalTenants}       sub={`${data.activeTenants} ativas`} />
              <KpiCard icon={Users}           label="Profissionais"         value={data.totalProfessionals} />
              <KpiCard icon={DoorOpen}        label="Salas Ativas"          value={data.totalRooms} />
              <KpiCard icon={CalendarCheck}   label="Total de Reservas"     value={data.totalBookings} />
              <KpiCard icon={BadgeDollarSign} label="Receita do Mês"        value={fmt(data.monthlyRevenue)} />
              <KpiCard icon={Clock}           label="Pagamentos Pendentes"  value={data.pendingPayments} />
              <KpiCard icon={TrendingUp}      label="Empresas Ativas"       value={data.activeTenants} sub={`de ${data.totalTenants} cadastradas`} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tenant growth */}
              <Card className="border border-[#D8D0C8]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold" style={{ color: FOREST }}>Novos Clientes (últimos 6 meses)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data.growthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DC" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(v: number) => [v, "Novos tenants"]} />
                      <Bar dataKey="tenants" fill={TERRACOTTA} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Bookings */}
              <Card className="border border-[#D8D0C8]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold" style={{ color: FOREST }}>Reservas por Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={data.growthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DC" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(v: number) => [v, "Reservas"]} />
                      <Line type="monotone" dataKey="bookings" stroke={FOREST} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Revenue */}
              <Card className="border border-[#D8D0C8] md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold" style={{ color: FOREST }}>Faturamento Mensal (R$)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data.growthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DC" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/100).toFixed(0)}`} />
                      <Tooltip formatter={(v: number) => [fmt(v), "Receita"]} />
                      <Bar dataKey="revenue" fill="#5A7A5A" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </SuperAdminLayout>
  );
}

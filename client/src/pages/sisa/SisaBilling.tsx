import SuperAdminLayout from "@/components/SuperAdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BadgeDollarSign, Clock, CheckCircle2, TrendingUp } from "lucide-react";

const TERRACOTTA = "#7C5C4A";
const FOREST     = "#3D3D2E";

function fmt(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const statusLabel: Record<string, string> = { pending: "Pendente", paid: "Pago", refunded: "Reembolsado", chargeback: "Chargeback" };
const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  refunded: "bg-blue-100 text-blue-700",
  chargeback: "bg-red-100 text-red-700",
};

const methodLabel: Record<string, string> = { credit_card: "Cartão", pix: "PIX", manual: "Manual", credits: "Créditos" };

export default function SisaBilling() {
  const { data, isLoading } = trpc.superAdmin.billing.useQuery();

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: FOREST }}>Financeiro</h1>
          <p className="text-sm text-muted-foreground">Receita e pagamentos da plataforma</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : data ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: BadgeDollarSign, label: "Receita do Mês",      value: fmt(data.monthRevenue) },
                { icon: TrendingUp,      label: "Receita Total",       value: fmt(data.totalRevenue) },
                { icon: Clock,           label: "Pagamentos Pendentes", value: data.pendingPayments },
                { icon: CheckCircle2,    label: "Assinaturas Ativas",  value: data.activeSubscriptions },
              ].map(({ icon: Icon, label, value }) => (
                <Card key={label} className="border border-[#D8D0C8]">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className="text-xl font-bold" style={{ color: FOREST }}>{value}</p>
                      </div>
                      <div className="p-2 rounded-lg" style={{ background: "#EDE8E3" }}>
                        <Icon className="h-4 w-4" style={{ color: TERRACOTTA }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Revenue chart */}
            <Card className="border border-[#D8D0C8]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: FOREST }}>Faturamento Mensal (últimos 6 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DC" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 100).toFixed(0)}`} />
                    <Tooltip formatter={(v: number) => [fmt(v), "Receita"]} />
                    <Bar dataKey="revenue" fill={TERRACOTTA} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent payments */}
            <Card className="border border-[#D8D0C8]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: FOREST }}>Pagamentos Recentes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E8E3DC]" style={{ background: "#F5F3EF" }}>
                        <th className="text-left px-4 py-2.5 font-medium text-[#3D3D2E]">ID</th>
                        <th className="text-left px-4 py-2.5 font-medium text-[#3D3D2E]">Valor</th>
                        <th className="text-left px-4 py-2.5 font-medium text-[#3D3D2E]">Método</th>
                        <th className="text-left px-4 py-2.5 font-medium text-[#3D3D2E]">Status</th>
                        <th className="text-left px-4 py-2.5 font-medium text-[#3D3D2E]">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentPayments.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Nenhum pagamento encontrado</td></tr>
                      ) : data.recentPayments.map(p => (
                        <tr key={p.id} className="border-b border-[#E8E3DC] hover:bg-[#FAFAF8]">
                          <td className="px-4 py-2.5 text-muted-foreground">#{p.id}</td>
                          <td className="px-4 py-2.5 font-medium text-[#3D3D2E]">{fmt(p.amount)}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{methodLabel[p.method] ?? p.method}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[p.status] ?? ""}`}>
                              {statusLabel[p.status] ?? p.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {new Date(p.createdAt).toLocaleString("pt-BR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </SuperAdminLayout>
  );
}

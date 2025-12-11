import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import { Search, UserCheck, UserX, Mail, Phone, CreditCard } from "lucide-react";
import { useState } from "react";

export default function Professionals() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: users, isLoading } = trpc.admin.listUsers.useQuery();
  const { data: creditsBalance } = trpc.credits.balance.useQuery();

  const professionals = users?.filter((u: any) => u.role === 'professional') || [];
  
  const filteredProfessionals = professionals.filter((prof: any) => 
    prof.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prof.professionalRegistry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: professionals.length,
    active: professionals.filter((p: any) => p.role === 'professional').length,
    totalCredits: 0, // TODO: calcular total de créditos
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profissionais Cadastrados</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todos os profissionais de saúde cadastrados no sistema
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Profissionais</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Créditos Totais</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCredits}</div>
              <p className="text-xs text-muted-foreground">
                Em circulação no sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Novos Este Mês</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Em desenvolvimento
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar Profissionais</CardTitle>
            <CardDescription>
              Pesquise por nome, email ou registro profissional
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Profissionais */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Profissionais</CardTitle>
            <CardDescription>
              {filteredProfessionals.length} profissional(is) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando profissionais...
              </div>
            ) : filteredProfessionals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum profissional encontrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Créditos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfessionals.map((prof) => (
                    <TableRow key={prof.id}>
                      <TableCell className="font-medium">{prof.name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {prof.email || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {prof.phone || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {prof.registryType && prof.professionalRegistry ? (
                          <Badge variant="outline">
                            {prof.registryType} {prof.professionalRegistry}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={prof.role === 'professional' ? 'default' : 'secondary'}>
                          {prof.role === 'professional' ? 'Ativo' : prof.role === 'admin' ? 'Admin' : prof.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          -
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

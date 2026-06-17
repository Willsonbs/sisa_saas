import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Users, Pencil, Trash2, Eye, Phone, Mail, Award, BookOpen, Search, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function Professionals() {
  const [search, setSearch] = useState("");
  const [viewProf, setViewProf] = useState<any>(null);
  const [editProf, setEditProf] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: professionals = [], isLoading } = trpc.admin.listUsers.useQuery();

  const updateMutation = trpc.admin.updateProfessional.useMutation({
    onSuccess: () => {
      toast.success("Profissional atualizado com sucesso!");
      setEditProf(null);
      utils.admin.listUsers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.admin.deleteProfessional.useMutation({
    onSuccess: () => {
      toast.success("Profissional excluído.");
      utils.admin.listUsers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (professionals as any[]).filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.professionalRegistry?.toLowerCase().includes(search.toLowerCase())
  );

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editProf.id,
      name: (fd.get("name") as string) || undefined,
      email: (fd.get("email") as string) || undefined,
      phone: (fd.get("phone") as string) || undefined,
      specialty: (fd.get("specialty") as string) || undefined,
      professionalRegistry: (fd.get("professionalRegistry") as string) || undefined,
      registryType: (fd.get("registryType") as string) || undefined,
      bio: (fd.get("bio") as string) || undefined,
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Profissionais</h1>
            <p className="text-muted-foreground">Gerencie os prestadores cadastrados no sistema</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input className="pl-9" placeholder="Buscar por nome, e-mail ou registro..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>

        {/* Summary */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{(professionals as any[]).length}</strong> profissional(is) cadastrado(s)</span>
          {search && <span>· <strong className="text-foreground">{filtered.length}</strong> resultado(s)</span>}
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-muted animate-pulse rounded-lg"/>)}</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50"/>
            <p className="text-lg font-medium">{search ? "Nenhum resultado encontrado" : "Nenhum profissional cadastrado"}</p>
          </CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium">Nome</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">E-mail</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Especialidade</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Créditos</th>
                    <th className="text-right px-4 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((prof: any) => (
                    <tr key={prof.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-medium">{prof.name || "—"}</div>
                        <div className="text-xs text-muted-foreground md:hidden">{prof.email}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{prof.email}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {prof.specialty ? <Badge variant="secondary">{prof.specialty}</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell font-medium">
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-3.5 w-3.5 text-muted-foreground"/>
                          {formatCurrency(prof.creditBalance || 0)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Ver detalhes" onClick={()=>setViewProf(prof)}>
                            <Eye className="h-4 w-4"/>
                          </Button>
                          <Button variant="ghost" size="icon" title="Editar" onClick={()=>setEditProf(prof)}>
                            <Pencil className="h-4 w-4"/>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Excluir" className="text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4"/>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir profissional</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir <strong>{prof.name}</strong>? Esta ação não pode ser desfeita.<br/>
                                  <span className="text-xs text-orange-600">Profissionais com reservas registradas não podem ser excluídos.</span>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={()=>deleteMutation.mutate({id:prof.id})}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* View Details Dialog */}
        <Dialog open={!!viewProf} onOpenChange={open=>!open&&setViewProf(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Detalhes do Profissional</DialogTitle>
              <DialogDescription>Informações completas do cadastro</DialogDescription>
            </DialogHeader>
            {viewProf && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary"/>
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{viewProf.name || "Sem nome"}</p>
                    {viewProf.specialty && <Badge variant="secondary">{viewProf.specialty}</Badge>}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4"/>{viewProf.email}</div>
                  {viewProf.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4"/>{viewProf.phone}</div>}
                  {viewProf.professionalRegistry && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Award className="h-4 w-4"/>
                      {viewProf.registryType || "Registro"}: {viewProf.professionalRegistry}
                    </div>
                  )}
                  {viewProf.bio && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <BookOpen className="h-4 w-4 mt-0.5 shrink-0"/>
                      <span>{viewProf.bio}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground"/>
                    <span>Saldo de créditos: </span>
                    <span className="text-primary font-semibold">{formatCurrency(viewProf.creditBalance || 0)}</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={()=>setViewProf(null)}>Fechar</Button>
                  <Button onClick={()=>{setViewProf(null);setEditProf(viewProf);}}>Editar</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editProf} onOpenChange={open=>!open&&setEditProf(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Profissional</DialogTitle>
              <DialogDescription>Atualize os dados do profissional</DialogDescription>
            </DialogHeader>
            {editProf && (
              <form onSubmit={handleEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input id="name" name="name" defaultValue={editProf.name||""} required/>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" name="email" type="email" defaultValue={editProf.email||""} required/>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" name="phone" defaultValue={editProf.phone||""}/>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="specialty">Especialidade</Label>
                    <Input id="specialty" name="specialty" defaultValue={editProf.specialty||""}/>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="registryType">Tipo de registro</Label>
                    <Input id="registryType" name="registryType" placeholder="CRP, CRM, CRO..." defaultValue={editProf.registryType||""}/>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="professionalRegistry">Nº do registro</Label>
                    <Input id="professionalRegistry" name="professionalRegistry" defaultValue={editProf.professionalRegistry||""}/>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="bio">Bio / Apresentação</Label>
                    <Input id="bio" name="bio" defaultValue={editProf.bio||""}/>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={()=>setEditProf(null)}>Cancelar</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending?"Salvando...":"Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

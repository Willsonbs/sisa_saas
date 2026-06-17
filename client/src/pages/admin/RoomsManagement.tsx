import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { Building2, Plus, Pencil, Trash2, LayoutGrid, List } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

function RoomDeleteButton({ room, onSoftDelete, onHardDelete }: { room: any; onSoftDelete: () => void; onHardDelete: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" title="Remover sala">
          <Trash2 className="h-4 w-4"/>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover sala — {room.name}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>Escolha como deseja remover esta sala:</p>
              <div className="rounded border p-3 space-y-1">
                <p className="font-medium">Inativar (recomendado)</p>
                <p className="text-muted-foreground">A sala fica oculta para novos agendamentos, mas o histórico de reservas é preservado.</p>
              </div>
              <div className="rounded border p-3 space-y-1">
                <p className="font-medium text-destructive">Excluir permanentemente</p>
                <p className="text-muted-foreground">Remove a sala do banco de dados. Só é permitido se não houver reservas registradas.</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-orange-500 hover:bg-orange-600 text-white" onClick={onSoftDelete}>
            Inativar sala
          </AlertDialogAction>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onHardDelete}>
            Excluir permanentemente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function RoomsManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  const utils = trpc.useUtils();
  const { data: rooms, isLoading } = trpc.rooms.list.useQuery({ includeInactive: true });

  const createMutation = trpc.rooms.create.useMutation({
    onSuccess: () => { toast.success("Sala criada com sucesso!"); setIsCreateOpen(false); utils.rooms.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.rooms.update.useMutation({
    onSuccess: () => { toast.success("Sala atualizada com sucesso!"); setEditingRoom(null); utils.rooms.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.rooms.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.rooms.list.cancel();
      const prev = utils.rooms.list.getData({ includeInactive: true });
      utils.rooms.list.setData({ includeInactive: true }, (old) => old ? old.filter(r => r.id !== id) : old);
      return { prev };
    },
    onSuccess: () => toast.success("Sala inativada com sucesso!"),
    onError: (e, _v, ctx: any) => { if (ctx?.prev) utils.rooms.list.setData({ includeInactive: true }, ctx.prev); toast.error(e.message); },
    onSettled: () => utils.rooms.list.invalidate(),
  });

  const deleteHardMutation = trpc.rooms.deleteHard.useMutation({
    onMutate: async ({ id }) => {
      await utils.rooms.list.cancel();
      const prev = utils.rooms.list.getData({ includeInactive: true });
      utils.rooms.list.setData({ includeInactive: true }, (old) => old ? old.filter(r => r.id !== id) : old);
      return { prev };
    },
    onSuccess: () => toast.success("Sala excluída permanentemente!"),
    onError: (e, _v, ctx: any) => { if (ctx?.prev) utils.rooms.list.setData({ includeInactive: true }, ctx.prev); toast.error(e.message); },
    onSettled: () => utils.rooms.list.invalidate(),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const equipment = fd.get("equipment")?.toString().split(",").map(s=>s.trim()).filter(Boolean) || [];
    const features = fd.get("features")?.toString().split(",").map(s=>s.trim()).filter(Boolean) || [];
    const data = {
      name: fd.get("name") as string,
      description: fd.get("description") as string,
      capacity: parseInt(fd.get("capacity") as string),
      equipment, features,
      pricePerHour: Math.round(parseFloat(fd.get("pricePerHour") as string) * 100),
      pricePerHalfDay: fd.get("pricePerHalfDay") ? Math.round(parseFloat(fd.get("pricePerHalfDay") as string) * 100) : undefined,
      pricePerDay: fd.get("pricePerDay") ? Math.round(parseFloat(fd.get("pricePerDay") as string) * 100) : undefined,
      availableMonday: fd.get("availableMonday") === "on",
      availableTuesday: fd.get("availableTuesday") === "on",
      availableWednesday: fd.get("availableWednesday") === "on",
      availableThursday: fd.get("availableThursday") === "on",
      availableFriday: fd.get("availableFriday") === "on",
      availableSaturday: fd.get("availableSaturday") === "on",
      availableSunday: fd.get("availableSunday") === "on",
      openTime: fd.get("openTime") as string,
      closeTime: fd.get("closeTime") as string,
      isActive: fd.get("isActive") === "on",
    };
    if (editingRoom) updateMutation.mutate({ id: editingRoom.id, ...data });
    else createMutation.mutate(data);
  };

  const RoomForm = ({ room }: { room?: any }) => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="name">Nome da Sala *</Label><Input id="name" name="name" defaultValue={room?.name} required/></div>
      <div className="space-y-2"><Label htmlFor="description">Descrição</Label><Textarea id="description" name="description" defaultValue={room?.description} rows={3}/></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label htmlFor="capacity">Capacidade *</Label><Input id="capacity" name="capacity" type="number" min="1" defaultValue={room?.capacity||2} required/></div>
        <div className="space-y-2"><Label htmlFor="pricePerHour">Preço/hora (R$) *</Label><Input id="pricePerHour" name="pricePerHour" type="number" step="0.01" min="0" defaultValue={room?(room.pricePerHour/100).toFixed(2):""} required/></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label htmlFor="pricePerHalfDay">Meio período (R$)</Label><Input id="pricePerHalfDay" name="pricePerHalfDay" type="number" step="0.01" min="0" defaultValue={room?.pricePerHalfDay?(room.pricePerHalfDay/100).toFixed(2):""}/></div>
        <div className="space-y-2"><Label htmlFor="pricePerDay">Diária (R$)</Label><Input id="pricePerDay" name="pricePerDay" type="number" step="0.01" min="0" defaultValue={room?.pricePerDay?(room.pricePerDay/100).toFixed(2):""}/></div>
      </div>
      <div className="space-y-2"><Label htmlFor="equipment">Equipamentos (vírgula)</Label><Input id="equipment" name="equipment" placeholder="Divã, Mesa, Cadeiras" defaultValue={room?.equipment?.join(", ")}/></div>
      <div className="space-y-2"><Label htmlFor="features">Características (vírgula)</Label><Input id="features" name="features" placeholder="Silenciosa, Privativa" defaultValue={room?.features?.join(", ")}/></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label htmlFor="openTime">Abertura</Label><Input id="openTime" name="openTime" type="time" defaultValue={room?.openTime||"08:00"}/></div>
        <div className="space-y-2"><Label htmlFor="closeTime">Fechamento</Label><Input id="closeTime" name="closeTime" type="time" defaultValue={room?.closeTime||"18:00"}/></div>
      </div>
      <div className="space-y-3">
        <Label>Dias Disponíveis</Label>
        <div className="grid grid-cols-2 gap-3">
          {[{name:"availableMonday",label:"Segunda"},{name:"availableTuesday",label:"Terça"},{name:"availableWednesday",label:"Quarta"},{name:"availableThursday",label:"Quinta"},{name:"availableFriday",label:"Sexta"},{name:"availableSaturday",label:"Sábado"},{name:"availableSunday",label:"Domingo"}].map(day=>(
            <div key={day.name} className="flex items-center space-x-2">
              <Switch id={day.name} name={day.name} defaultChecked={room?.[day.name]??true}/>
              <Label htmlFor={day.name}>{day.label}</Label>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center space-x-2"><Switch id="isActive" name="isActive" defaultChecked={room?.isActive??true}/><Label htmlFor="isActive">Sala Ativa</Label></div>
      <DialogFooter>
        <Button type="submit" disabled={createMutation.isPending||updateMutation.isPending}>
          {createMutation.isPending||updateMutation.isPending?"Salvando...":"Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Salas</h1>
            <p className="text-muted-foreground">Adicione, edite ou remova salas do sistema</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex border rounded-md overflow-hidden">
              <button className={`p-2 ${viewMode==="card"?"bg-primary text-primary-foreground":"bg-background text-foreground hover:bg-muted"}`} onClick={()=>setViewMode("card")} title="Cards"><LayoutGrid className="h-4 w-4"/></button>
              <button className={`p-2 ${viewMode==="list"?"bg-primary text-primary-foreground":"bg-background text-foreground hover:bg-muted"}`} onClick={()=>setViewMode("list")} title="Lista"><List className="h-4 w-4"/></button>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/>Nova Sala</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Criar Nova Sala</DialogTitle><DialogDescription>Preencha os dados da nova sala</DialogDescription></DialogHeader>
                <RoomForm/>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">{[1,2,3,4].map(i=><div key={i} className="h-64 bg-muted animate-pulse rounded-lg"/>)}</div>
        ) : rooms && rooms.length > 0 ? (
          viewMode === "card" ? (
            <div className="grid gap-6 md:grid-cols-2">
              {rooms.map(room=>(
                <Card key={room.id} className={!room.isActive?"opacity-60":""}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div><CardTitle>{room.name}</CardTitle><CardDescription className="mt-2">{room.description||"Sem descrição"}</CardDescription></div>
                      <span className={`text-xs px-2 py-1 rounded-full ${room.isActive?"bg-green-100 text-green-700":"bg-gray-100 text-gray-700"}`}>{room.isActive?"Ativa":"Inativa"}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Capacidade:</span><p className="font-medium">{room.capacity} pessoas</p></div>
                      <div><span className="text-muted-foreground">Preço/hora:</span><p className="font-medium">{formatCurrency(room.pricePerHour)}</p></div>
                    </div>
                    {room.equipment&&room.equipment.length>0&&<div><span className="text-sm text-muted-foreground">Equipamentos:</span><p className="text-sm mt-1">{room.equipment.join(", ")}</p></div>}
                    <div className="flex gap-2 pt-4 border-t">
                      <Dialog open={editingRoom?.id===room.id} onOpenChange={open=>!open&&setEditingRoom(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1" onClick={()=>setEditingRoom(room)}><Pencil className="mr-2 h-4 w-4"/>Editar</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader><DialogTitle>Editar Sala</DialogTitle><DialogDescription>Atualize os dados da sala</DialogDescription></DialogHeader>
                          {editingRoom?.id===room.id&&<RoomForm room={editingRoom}/>}
                        </DialogContent>
                      </Dialog>
                      <RoomDeleteButton room={room} onSoftDelete={()=>deleteMutation.mutate({id:room.id})} onHardDelete={()=>deleteHardMutation.mutate({id:room.id})}/>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium">Nome</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Capacidade</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Preço/hora</th>
                      <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Horário</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map(room=>(
                      <tr key={room.id} className={`border-b last:border-0 hover:bg-muted/20 ${!room.isActive?"opacity-60":""}`}>
                        <td className="px-4 py-3 font-medium">{room.name}</td>
                        <td className="px-4 py-3 hidden md:table-cell">{room.capacity} pessoas</td>
                        <td className="px-4 py-3 hidden md:table-cell">{formatCurrency(room.pricePerHour)}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{room.openTime} – {room.closeTime}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${room.isActive?"bg-green-100 text-green-700":"bg-gray-100 text-gray-700"}`}>{room.isActive?"Ativa":"Inativa"}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Dialog open={editingRoom?.id===room.id} onOpenChange={open=>!open&&setEditingRoom(null)}>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Editar" onClick={()=>setEditingRoom(room)}><Pencil className="h-4 w-4"/></Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader><DialogTitle>Editar Sala</DialogTitle><DialogDescription>Atualize os dados da sala</DialogDescription></DialogHeader>
                                {editingRoom?.id===room.id&&<RoomForm room={editingRoom}/>}
                              </DialogContent>
                            </Dialog>
                            <RoomDeleteButton room={room} onSoftDelete={()=>deleteMutation.mutate({id:room.id})} onHardDelete={()=>deleteHardMutation.mutate({id:room.id})}/>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50"/>
              <p className="text-lg font-medium mb-2">Nenhuma sala cadastrada</p>
              <p className="text-muted-foreground mb-4">Comece criando sua primeira sala</p>
              <Button onClick={()=>setIsCreateOpen(true)}><Plus className="mr-2 h-4 w-4"/>Criar Primeira Sala</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

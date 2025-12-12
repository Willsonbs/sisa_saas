import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Building2, Plus, Pencil, Trash2, Upload } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

export default function RoomsManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  
  const { data: rooms, isLoading, refetch } = trpc.rooms.list.useQuery({ includeInactive: true });
  const createMutation = trpc.rooms.create.useMutation({
    onSuccess: () => {
      toast.success("Sala criada com sucesso!");
      setIsCreateOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateMutation = trpc.rooms.update.useMutation({
    onSuccess: () => {
      toast.success("Sala atualizada com sucesso!");
      setEditingRoom(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.rooms.delete.useMutation({
    onSuccess: () => {
      toast.success("Sala removida com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const equipment = formData.get("equipment")?.toString().split(",").map(s => s.trim()).filter(Boolean) || [];
    const features = formData.get("features")?.toString().split(",").map(s => s.trim()).filter(Boolean) || [];
    
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      capacity: parseInt(formData.get("capacity") as string),
      equipment,
      features,
      pricePerHour: Math.round(parseFloat(formData.get("pricePerHour") as string) * 100),
      pricePerHalfDay: formData.get("pricePerHalfDay") ? Math.round(parseFloat(formData.get("pricePerHalfDay") as string) * 100) : undefined,
      pricePerDay: formData.get("pricePerDay") ? Math.round(parseFloat(formData.get("pricePerDay") as string) * 100) : undefined,
      availableMonday: formData.get("availableMonday") === "on",
      availableTuesday: formData.get("availableTuesday") === "on",
      availableWednesday: formData.get("availableWednesday") === "on",
      availableThursday: formData.get("availableThursday") === "on",
      availableFriday: formData.get("availableFriday") === "on",
      availableSaturday: formData.get("availableSaturday") === "on",
      availableSunday: formData.get("availableSunday") === "on",
      openTime: formData.get("openTime") as string,
      closeTime: formData.get("closeTime") as string,
      isActive: formData.get("isActive") === "on",
    };

    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const RoomForm = ({ room }: { room?: any }) => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Sala *</Label>
        <Input id="name" name="name" defaultValue={room?.name} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" defaultValue={room?.description} rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacidade *</Label>
          <Input id="capacity" name="capacity" type="number" min="1" defaultValue={room?.capacity || 2} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pricePerHour">Preço por Hora (R$) *</Label>
          <Input id="pricePerHour" name="pricePerHour" type="number" step="0.01" min="0" defaultValue={room ? (room.pricePerHour / 100).toFixed(2) : ""} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pricePerHalfDay">Preço Meio Período (R$)</Label>
          <Input id="pricePerHalfDay" name="pricePerHalfDay" type="number" step="0.01" min="0" defaultValue={room?.pricePerHalfDay ? (room.pricePerHalfDay / 100).toFixed(2) : ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pricePerDay">Preço Diária (R$)</Label>
          <Input id="pricePerDay" name="pricePerDay" type="number" step="0.01" min="0" defaultValue={room?.pricePerDay ? (room.pricePerDay / 100).toFixed(2) : ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="equipment">Equipamentos (separados por vírgula)</Label>
        <Input id="equipment" name="equipment" placeholder="Divã, Mesa, Cadeiras" defaultValue={room?.equipment?.join(", ")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="features">Características (separadas por vírgula)</Label>
        <Input id="features" name="features" placeholder="Silenciosa, Privativa, Iluminação natural" defaultValue={room?.features?.join(", ")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="openTime">Horário Abertura</Label>
          <Input id="openTime" name="openTime" type="time" defaultValue={room?.openTime || "08:00"} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="closeTime">Horário Fechamento</Label>
          <Input id="closeTime" name="closeTime" type="time" defaultValue={room?.closeTime || "18:00"} />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Dias Disponíveis</Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "availableMonday", label: "Segunda" },
            { name: "availableTuesday", label: "Terça" },
            { name: "availableWednesday", label: "Quarta" },
            { name: "availableThursday", label: "Quinta" },
            { name: "availableFriday", label: "Sexta" },
            { name: "availableSaturday", label: "Sábado" },
            { name: "availableSunday", label: "Domingo" },
          ].map((day) => (
            <div key={day.name} className="flex items-center space-x-2">
              <Switch id={day.name} name={day.name} defaultChecked={room?.[day.name] ?? true} />
              <Label htmlFor={day.name}>{day.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="isActive" name="isActive" defaultChecked={room?.isActive ?? true} />
        <Label htmlFor="isActive">Sala Ativa</Label>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
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
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Sala
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova Sala</DialogTitle>
                <DialogDescription>Preencha os dados da nova sala</DialogDescription>
              </DialogHeader>
              <RoomForm />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : rooms && rooms.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {rooms.map((room) => (
              <Card key={room.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{room.name}</CardTitle>
                      <CardDescription className="mt-2">
                        {room.description || "Sem descrição"}
                      </CardDescription>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        room.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {room.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Capacidade:</span>
                      <p className="font-medium">{room.capacity} pessoas</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Preço/hora:</span>
                      <p className="font-medium">{formatCurrency(room.pricePerHour)}</p>
                    </div>
                  </div>

                  {room.equipment && room.equipment.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground">Equipamentos:</span>
                      <p className="text-sm mt-1">{room.equipment.join(", ")}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Link href={`/admin/rooms/${room.id}/edit`}>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja remover a sala "${room.name}"?`)) {
                          deleteMutation.mutate({ id: room.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma sala cadastrada</p>
              <p className="text-muted-foreground mb-4">
                Comece criando sua primeira sala
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Sala
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

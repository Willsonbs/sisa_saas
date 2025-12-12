import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

export default function EditRoom() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const roomId = parseInt(id || "0");

  const { data: room, isLoading } = trpc.rooms.getById.useQuery({ id: roomId });
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    capacity: 1,
    equipment: "",
    pricePerHour: 0,
    pricePerHalfDay: 0,
    pricePerDay: 0,
    isActive: true,
  });

  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name,
        description: room.description || "",
        capacity: room.capacity,
        equipment: room.equipment || "",
        pricePerHour: room.pricePerHour,
        pricePerHalfDay: room.pricePerHalfDay || 0,
        pricePerDay: room.pricePerDay || 0,
        isActive: room.isActive,
      });
    }
  }, [room]);

  const updateMutation = trpc.rooms.update.useMutation({
    onSuccess: () => {
      toast.success("Sala atualizada com sucesso!");
      setLocation("/admin/rooms");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: roomId,
      name: formData.name,
      description: formData.description,
      capacity: formData.capacity,
      equipment: formData.equipment ? formData.equipment.split(',').map(s => s.trim()).filter(Boolean) : [],
      pricePerHour: formData.pricePerHour,
      pricePerHalfDay: formData.pricePerHalfDay || undefined,
      pricePerDay: formData.pricePerDay || undefined,
      isActive: formData.isActive,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!room) {
    return (
      <DashboardLayout>
        <div className="container py-8">
          <Card>
            <CardHeader>
              <CardTitle>Sala não encontrada</CardTitle>
              <CardDescription>A sala solicitada não existe.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation("/admin/rooms")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Salas
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/admin/rooms")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Salas
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Editar Sala</CardTitle>
            <CardDescription>
              Atualize as informações da sala
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Sala *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacidade *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment">Equipamentos</Label>
                <Textarea
                  id="equipment"
                  value={formData.equipment}
                  onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                  placeholder="Ex: Ar condicionado, Wi-Fi, Projetor..."
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="pricePerHour">Preço por Hora (créditos) *</Label>
                  <Input
                    id="pricePerHour"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.pricePerHour}
                    onChange={(e) => setFormData({ ...formData, pricePerHour: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerHalfDay">Preço por Turno (créditos)</Label>
                  <Input
                    id="pricePerHalfDay"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.pricePerHalfDay}
                    onChange={(e) => setFormData({ ...formData, pricePerHalfDay: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricePerDay">Preço por Dia (créditos)</Label>
                  <Input
                    id="pricePerDay"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.pricePerDay}
                    onChange={(e) => setFormData({ ...formData, pricePerDay: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Sala Ativa</Label>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar Alterações
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/admin/rooms")}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

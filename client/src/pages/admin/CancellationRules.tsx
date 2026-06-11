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
import { Settings, Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function CancellationRules() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  
  const { data: rules, isLoading, refetch } = trpc.cancellationRules.list.useQuery();
  const createMutation = trpc.cancellationRules.create.useMutation({
    onSuccess: () => {
      toast.success("Regra criada com sucesso!");
      setIsCreateOpen(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
  
  const updateMutation = trpc.cancellationRules.update.useMutation({
    onSuccess: () => {
      toast.success("Regra atualizada com sucesso!");
      setEditingRule(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.cancellationRules.delete.useMutation({
    onSuccess: () => {
      toast.success("Regra removida com sucesso!");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      hoursBeforeBooking: parseInt(formData.get("hoursBeforeBooking") as string),
      refundPercentage: parseInt(formData.get("refundPercentage") as string),
      description: formData.get("description") as string,
      isActive: formData.get("isActive") === "on",
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const RuleForm = ({ rule }: { rule?: any }) => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="hoursBeforeBooking">Horas Antes da Reserva *</Label>
        <Input 
          id="hoursBeforeBooking" 
          name="hoursBeforeBooking" 
          type="number" 
          min="0" 
          defaultValue={rule?.hoursBeforeBooking || 24} 
          required 
        />
        <p className="text-xs text-muted-foreground">
          Quantas horas antes da reserva esta regra se aplica
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="refundPercentage">Percentual de Reembolso (%) *</Label>
        <Input 
          id="refundPercentage" 
          name="refundPercentage" 
          type="number" 
          min="0" 
          max="100" 
          defaultValue={rule?.refundPercentage || 100} 
          required 
        />
        <p className="text-xs text-muted-foreground">
          Percentual dos créditos que será devolvido (0-100%)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição *</Label>
        <Textarea 
          id="description" 
          name="description" 
          defaultValue={rule?.description} 
          rows={3} 
          required 
          placeholder="Ex: Cancelamento com 24h de antecedência - reembolso total"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="isActive" name="isActive" defaultChecked={rule?.isActive ?? true} />
        <Label htmlFor="isActive">Regra Ativa</Label>
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
            <h1 className="text-3xl font-bold">Regras de Cancelamento</h1>
            <p className="text-muted-foreground">Configure as políticas de reembolso</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Regra</DialogTitle>
                <DialogDescription>Defina uma nova política de cancelamento</DialogDescription>
              </DialogHeader>
              <RuleForm />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Como Funciona</CardTitle>
            <CardDescription>
              As regras de cancelamento determinam quanto crédito será devolvido ao profissional
              baseado no tempo de antecedência do cancelamento. O sistema aplica automaticamente
              a regra mais favorável ao profissional.
            </CardDescription>
          </CardHeader>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : rules && rules.length > 0 ? (
          <div className="space-y-4">
            {rules
              .sort((a, b) => b.hoursBeforeBooking - a.hoursBeforeBooking)
              .map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center" style={{width: '42px', height: '42px'}}>
                              <span className="text-lg font-bold text-primary">
                                {rule.refundPercentage}%
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold">
                                {rule.hoursBeforeBooking}h antes da reserva
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Reembolso de {rule.refundPercentage}%
                              </p>
                            </div>
                          </div>
                          <span
                            className={`ml-auto text-xs px-2 py-1 rounded-full ${
                              rule.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {rule.isActive ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {rule.description}
                        </p>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Dialog open={editingRule?.id === rule.id} onOpenChange={(open) => !open && setEditingRule(null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingRule(rule)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Regra</DialogTitle>
                              <DialogDescription>Atualize a política de cancelamento</DialogDescription>
                            </DialogHeader>
                            <RuleForm rule={editingRule} />
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover regra</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover esta regra de cancelamento? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteMutation.mutate({ id: rule.id })}
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma regra configurada</p>
              <p className="text-muted-foreground mb-4">
                Crie regras para definir as políticas de reembolso
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Regra
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

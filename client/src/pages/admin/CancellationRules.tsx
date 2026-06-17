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
import { Clock, Percent, Plus, Trash2, Pencil, Info, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Lógica das regras de cancelamento:
 *
 * Cada regra define: "Se o cancelamento ocorrer com X ou mais horas de antecedência,
 * o profissional recebe Y% de reembolso."
 *
 * Exemplo de configuração típica:
 *  - 48h ou mais → 100% reembolso (cancelamento gratuito)
 *  - 24h a 48h   → 50% reembolso (multa de 50%)
 *  - Menos de 24h → 0% reembolso (sem reembolso)
 *
 * As regras são avaliadas da maior para a menor antecedência.
 * Se nenhuma regra se aplicar, o reembolso padrão é 0%.
 */

function getRefundBadge(pct: number) {
  if (pct === 100) return { label: "Reembolso total (100%)", color: "text-green-700 bg-green-50 border-green-200" };
  if (pct >= 50) return { label: `${pct}% de reembolso`, color: "text-yellow-700 bg-yellow-50 border-yellow-200" };
  if (pct > 0) return { label: `${pct}% de reembolso`, color: "text-orange-700 bg-orange-50 border-orange-200" };
  return { label: "Sem reembolso (0%)", color: "text-red-700 bg-red-50 border-red-200" };
}

export default function CancellationRules() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: rules = [], isLoading } = trpc.cancellationRules.list.useQuery();

  const createMutation = trpc.cancellationRules.create.useMutation({
    onSuccess: () => { toast.success("Regra criada com sucesso!"); setIsCreateOpen(false); utils.cancellationRules.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.cancellationRules.update.useMutation({
    onSuccess: () => { toast.success("Regra atualizada!"); setEditingRule(null); utils.cancellationRules.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.cancellationRules.delete.useMutation({
    onSuccess: () => { toast.success("Regra removida."); utils.cancellationRules.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      hoursBeforeBooking: parseInt(fd.get("hoursBeforeBooking") as string),
      refundPercentage: parseInt(fd.get("refundPercentage") as string),
      description: fd.get("description") as string,
      isActive: fd.get("isActive") === "on",
    };
    if (editingRule) updateMutation.mutate({ id: editingRule.id, ...data });
    else createMutation.mutate(data);
  };

  // Sort descending by hoursBeforeBooking (most generous first)
  const sorted = [...rules].sort((a, b) => b.hoursBeforeBooking - a.hoursBeforeBooking);

  const RuleForm = ({ rule }: { rule?: any }) => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="hoursBeforeBooking">Antecedência mínima (horas) *</Label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input id="hoursBeforeBooking" name="hoursBeforeBooking" type="number" min="0" className="pl-9"
              defaultValue={rule?.hoursBeforeBooking ?? 48} required/>
          </div>
          <p className="text-xs text-muted-foreground">Cancelamentos com pelo menos este prazo se qualificam</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="refundPercentage">Percentual de reembolso (%) *</Label>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input id="refundPercentage" name="refundPercentage" type="number" min="0" max="100" className="pl-9"
              defaultValue={rule?.refundPercentage ?? 100} required/>
          </div>
          <p className="text-xs text-muted-foreground">0 = sem reembolso · 100 = reembolso total</p>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Descrição *</Label>
        <Textarea id="description" name="description" rows={2} required
          placeholder="Ex: Cancelamento com 48h de antecedência — reembolso total"
          defaultValue={rule?.description ?? ""}/>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="isActive" name="isActive" defaultChecked={rule?.isActive ?? true}/>
        <Label htmlFor="isActive">Regra ativa</Label>
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Regras de Cancelamento</h1>
            <p className="text-muted-foreground">Defina o reembolso conforme a antecedência do cancelamento</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4"/>Nova Regra</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Regra</DialogTitle>
                <DialogDescription>Defina uma nova política de cancelamento</DialogDescription>
              </DialogHeader>
              <RuleForm/>
            </DialogContent>
          </Dialog>
        </div>

        {/* Explanation */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600"/>
              <CardTitle className="text-base text-blue-800">Como funciona</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-blue-700 space-y-2">
            <p>Cada regra define: <strong>"Se o cancelamento ocorrer com X ou mais horas de antecedência, o profissional recebe Y% de reembolso."</strong></p>
            <p>As regras são avaliadas da maior para a menor antecedência. A primeira que se encaixar no prazo será aplicada. Se nenhuma se aplicar, o reembolso é 0%.</p>
            <p className="font-medium">Exemplo típico de configuração:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>48h ou mais → 100% de reembolso (cancelamento gratuito)</li>
              <li>24h a 48h → 50% de reembolso (multa de 50%)</li>
              <li>Menos de 24h → 0% de reembolso (sem reembolso)</li>
            </ul>
          </CardContent>
        </Card>

        {/* Rules list */}
        <Card>
          <CardHeader>
            <CardTitle>Regras Configuradas</CardTitle>
            <CardDescription>Ordenadas da maior para a menor antecedência</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-16 bg-muted animate-pulse rounded-lg"/>)}</div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-10">
                <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40"/>
                <p className="font-medium">Nenhuma regra configurada</p>
                <p className="text-sm text-muted-foreground mt-1">Sem regras, todos os cancelamentos resultam em 0% de reembolso</p>
                <Button className="mt-4" onClick={()=>setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4"/>Criar Primeira Regra
                </Button>
              </div>
            ) : (
              sorted.map((rule, idx) => {
                const nextRule = sorted[idx + 1];
                const rangeLabel = nextRule
                  ? `De ${nextRule.hoursBeforeBooking}h a ${rule.hoursBeforeBooking}h de antecedência`
                  : `${rule.hoursBeforeBooking}h ou mais de antecedência`;
                const { label, color } = getRefundBadge(rule.refundPercentage);
                return (
                  <div key={rule.id} className={`flex items-start gap-4 p-4 rounded-lg border ${!rule.isActive?"opacity-50 bg-muted/20":""}`}>
                    {/* Icon */}
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5 text-primary"/>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{rangeLabel}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>{label}</span>
                        {!rule.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inativa</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Dialog open={editingRule?.id===rule.id} onOpenChange={open=>!open&&setEditingRule(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={()=>setEditingRule(rule)}>
                            <Pencil className="h-4 w-4"/>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Regra</DialogTitle>
                            <DialogDescription>Atualize a política de cancelamento</DialogDescription>
                          </DialogHeader>
                          {editingRule?.id===rule.id && <RuleForm rule={editingRule}/>}
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover regra</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover a regra de <strong>{rule.hoursBeforeBooking}h → {rule.refundPercentage}% de reembolso</strong>?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={()=>deleteMutation.mutate({id:rule.id})}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Summary table */}
        {sorted.filter(r=>r.isActive).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tabela de Referência</CardTitle>
              <CardDescription>Resumo das regras ativas para consulta rápida</CardDescription>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Antecedência do cancelamento</th>
                    <th className="text-right py-2 font-medium">Reembolso</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.filter(r=>r.isActive).map((rule, idx) => {
                    const activeRules = sorted.filter(r=>r.isActive);
                    const nextRule = activeRules[idx + 1];
                    const rangeLabel = nextRule
                      ? `De ${nextRule.hoursBeforeBooking}h a ${rule.hoursBeforeBooking}h`
                      : `${rule.hoursBeforeBooking}h ou mais`;
                    const { label, color } = getRefundBadge(rule.refundPercentage);
                    return (
                      <tr key={rule.id} className="border-b last:border-0">
                        <td className="py-2">{rangeLabel}</td>
                        <td className="py-2 text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>{label}</span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="py-2 text-muted-foreground">
                      Menos de {sorted.filter(r=>r.isActive).at(-1)?.hoursBeforeBooking ?? 0}h
                    </td>
                    <td className="py-2 text-right">
                      <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-red-700 bg-red-50 border-red-200">Sem reembolso (0%)</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

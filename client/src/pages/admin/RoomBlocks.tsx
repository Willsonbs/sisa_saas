import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Lock, AlertTriangle, Wrench } from "lucide-react";
import { toast } from "sonner";

const REASON_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  maintenance: { label: "Manutenção", icon: Wrench, color: "bg-yellow-100 text-yellow-800" },
  manager_reserve: { label: "Reservado pelo Gestor", icon: Lock, color: "bg-blue-100 text-blue-800" },
  other: { label: "Outro", icon: AlertTriangle, color: "bg-gray-100 text-gray-800" },
};

export default function RoomBlocks() {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    d.setHours(23, 59, 59, 999);
    return d;
  });
  const [form, setForm] = useState({
    roomId: 0,
    startTime: "",
    endTime: "",
    reason: "maintenance" as "maintenance" | "manager_reserve" | "other",
    notes: "",
  });

  const { data: rooms } = trpc.rooms.list.useQuery();
  const { data: blocks, refetch } = trpc.roomBlocks.list.useQuery({
    startDate,
    endDate,
  });

  const createMutation = trpc.roomBlocks.create.useMutation({
    onSuccess: () => {
      toast.success("Bloqueio criado com sucesso!");
      setOpen(false);
      refetch();
      setForm({ roomId: 0, startTime: "", endTime: "", reason: "maintenance", notes: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.roomBlocks.delete.useMutation({
    onSuccess: () => {
      toast.success("Bloqueio removido!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!form.roomId || !form.startTime || !form.endTime) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createMutation.mutate({
      roomId: form.roomId,
      startTime: new Date(form.startTime),
      endTime: new Date(form.endTime),
      reason: form.reason,
      notes: form.notes || undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bloqueios de Sala</h1>
            <p className="text-gray-500 mt-1">Gerencie períodos de manutenção e reservas especiais.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Novo Bloqueio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Bloqueio de Sala</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Sala *</Label>
                  <Select
                    value={form.roomId ? form.roomId.toString() : ""}
                    onValueChange={v => setForm(p => ({ ...p, roomId: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma sala" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms?.map(room => (
                        <SelectItem key={room.id} value={room.id.toString()}>{room.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início *</Label>
                    <Input
                      type="datetime-local"
                      value={form.startTime}
                      onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim *</Label>
                    <Input
                      type="datetime-local"
                      value={form.endTime}
                      onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Motivo *</Label>
                  <Select
                    value={form.reason}
                    onValueChange={v => setForm(p => ({ ...p, reason: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                      <SelectItem value="manager_reserve">Reservado pelo Gestor</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Detalhes sobre o bloqueio..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {createMutation.isPending ? "Criando..." : "Criar Bloqueio"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bloqueios Ativos</CardTitle>
            <CardDescription>Próximos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {!blocks?.length ? (
              <div className="text-center py-10">
                <Lock className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum bloqueio ativo no período</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sala</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocks.map((block: any) => {
                    const reasonInfo = REASON_LABELS[block.reason] || REASON_LABELS.other;
                    const room = rooms?.find(r => r.id === block.roomId);
                    return (
                      <TableRow key={block.id}>
                        <TableCell className="font-medium">{room?.name || `Sala #${block.roomId}`}</TableCell>
                        <TableCell className="text-sm">
                          <div>{new Date(block.startTime).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</div>
                          <div className="text-gray-400">até {new Date(block.endTime).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${reasonInfo.color}`}>
                            <reasonInfo.icon className="h-3 w-3" />
                            {reasonInfo.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                          {block.notes || "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteMutation.mutate({ id: block.id })}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

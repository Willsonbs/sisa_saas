import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { CreditCard, QrCode } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// Reabre o checkout de uma reserva 'pending_payment' (ex: o profissional
// fechou a aba do Stripe sem terminar de pagar). Usado tanto na grade de
// Fazer Reserva quanto em Minhas Reservas.
export function ResumePaymentDialog({ bookingId, onClose }: { bookingId: number | null; onClose: () => void }) {
  const resumeMutation = trpc.bookings.resumeCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={!!bookingId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Concluir pagamento</DialogTitle>
          <DialogDescription>Essa reserva está aguardando pagamento. Escolha como pagar para confirmá-la.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            disabled={resumeMutation.isPending}
            onClick={() => bookingId && resumeMutation.mutate({ bookingId, paymentMethod: "card" })}
          >
            <CreditCard className="h-4 w-4" /> Pagar com cartão
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            disabled={resumeMutation.isPending}
            onClick={() => bookingId && resumeMutation.mutate({ bookingId, paymentMethod: "pix" })}
          >
            <QrCode className="h-4 w-4" /> Pagar com PIX
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={resumeMutation.isPending}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

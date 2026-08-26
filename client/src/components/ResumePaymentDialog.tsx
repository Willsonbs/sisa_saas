import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { CreditCard, QrCode, Wallet, BadgeCheck, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

// Reabre o checkout de uma reserva 'pending_payment' (ex: o profissional
// fechou a aba do Stripe sem terminar de pagar). Mesmas opções de pagamento
// da tela de nova reserva (BookRoom.tsx) — só "Usar créditos" está
// funcional; cartão/PIX aparecem visíveis (gateway ainda a definir) mas
// mostram "Em breve" ao clicar. Usado tanto na grade de Fazer Reserva
// quanto em Minhas Reservas.
export function ResumePaymentDialog({
  bookingId,
  totalPrice,
  onClose,
  onConfirmed,
}: {
  bookingId: number | null;
  totalPrice?: number;
  onClose: () => void;
  onConfirmed?: () => void;
}) {
  const { data: balance } = trpc.credits.balance.useQuery(undefined, { enabled: !!bookingId });
  const cost = totalPrice ?? 0;
  const hasEnoughCredits = balance !== undefined && balance >= cost && cost > 0;

  const confirmWithCreditsMutation = trpc.bookings.confirmPendingWithCredits.useMutation({
    onSuccess: () => {
      toast.success("Reserva confirmada com créditos!");
      onConfirmed?.();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={!!bookingId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Concluir pagamento</DialogTitle>
          <DialogDescription>Essa reserva está aguardando pagamento. Escolha a forma de pagamento para confirmá-la.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => bookingId && hasEnoughCredits && confirmWithCreditsMutation.mutate({ bookingId })}
            disabled={confirmWithCreditsMutation.isPending || !hasEnoughCredits}
            className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-primary bg-primary/5 text-left disabled:cursor-not-allowed"
          >
            <Wallet className="h-5 w-5 flex-shrink-0 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Usar créditos</p>
              <p className="text-xs text-muted-foreground">
                Saldo disponível:{" "}
                <span className={balance !== undefined && balance < cost ? "text-destructive font-semibold" : "font-semibold"}>
                  {formatCurrency(balance || 0)}
                </span>
              </p>
            </div>
            {hasEnoughCredits ? (
              <BadgeCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => toast.info("Pagamento com cartão em breve. Por enquanto, use créditos.")}
            className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-border text-left opacity-60 cursor-not-allowed"
          >
            <CreditCard className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Cartão de crédito</p>
              <p className="text-xs text-muted-foreground">Checkout seguro online</p>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">Em breve</span>
          </button>

          <button
            type="button"
            onClick={() => toast.info("Pagamento com PIX em breve. Por enquanto, use créditos.")}
            className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-border text-left opacity-60 cursor-not-allowed"
          >
            <QrCode className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">PIX</p>
              <p className="text-xs text-muted-foreground">Pagamento instantâneo via QR Code</p>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">Em breve</span>
          </button>
        </div>

        {!hasEnoughCredits && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Saldo insuficiente. Você precisa de mais {formatCurrency(Math.max(cost - (balance || 0), 0))} em créditos.
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={confirmWithCreditsMutation.isPending}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

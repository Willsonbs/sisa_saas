/**
 * Stripe Products Configuration
 * Define credit packages available for purchase
 */

export interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credits: number; // Amount in cents
  price: number; // Price in cents (BRL)
  stripePriceId?: string; // Will be set when creating in Stripe
  popular?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits_500",
    name: "Pacote Inicial",
    description: "500 créditos para começar",
    credits: 50000, // R$ 500 in cents
    price: 50000, // R$ 500
    popular: false,
  },
  {
    id: "credits_1000",
    name: "Pacote Profissional",
    description: "1.000 créditos com desconto",
    credits: 100000, // R$ 1.000 in cents
    price: 95000, // R$ 950 (5% discount)
    popular: true,
  },
  {
    id: "credits_2000",
    name: "Pacote Premium",
    description: "2.000 créditos com melhor desconto",
    credits: 200000, // R$ 2.000 in cents
    price: 180000, // R$ 1.800 (10% discount)
    popular: false,
  },
  {
    id: "credits_5000",
    name: "Pacote Empresarial",
    description: "5.000 créditos com máximo desconto",
    credits: 500000, // R$ 5.000 in cents
    price: 425000, // R$ 4.250 (15% discount)
    popular: false,
  },
];

export function getCreditPackageById(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find(pkg => pkg.id === id);
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

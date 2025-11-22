import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Building2, CreditCard, Zap, Droplet, Wifi, Phone, Tv } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import LanguageSwitcher from "@/components/ui/language-switcher.tsx";
import { useTranslation } from "react-i18next";

const paymentSchema = z.object({
  billType: z.enum(["ELECTRICITY", "WATER", "INTERNET", "PHONE", "TV", "OTHER"]),
  provider: z.string().min(1, "Sélectionnez un fournisseur"),
  billReference: z.string().min(1, "Référence de facture requise"),
  accountNumber: z.string().optional(),
  customerName: z.string().min(2, "Nom requis"),
  customerPhone: z.string().min(8, "Numéro de téléphone valide requis"),
  customerEmail: z.string().email("Email invalide").optional().or(z.literal("")),
  amount: z.string().min(1, "Montant requis"),
  currency: z.enum(["XOF", "GNF"]),
});

type PaymentForm = z.infer<typeof paymentSchema>;

const billTypeIcons: Record<string, React.ReactNode> = {
  ELECTRICITY: <Zap className="h-5 w-5" />,
  WATER: <Droplet className="h-5 w-5" />,
  INTERNET: <Wifi className="h-5 w-5" />,
  PHONE: <Phone className="h-5 w-5" />,
  TV: <Tv className="h-5 w-5" />,
  OTHER: <CreditCard className="h-5 w-5" />,
};

const billTypeLabels: Record<string, string> = {
  ELECTRICITY: "Électricité",
  WATER: "Eau",
  INTERNET: "Internet",
  PHONE: "Téléphone",
  TV: "Télévision",
  OTHER: "Autre",
};

export default function PublicPaymentPage() {
  const { t } = useTranslation(["payment", "common"]);
  const navigate = useNavigate();
  const [selectedBillType, setSelectedBillType] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const providers = useQuery(
    api.billPayments.getBillProviders,
    selectedBillType
      ? { billType: selectedBillType as "ELECTRICITY" | "WATER" | "INTERNET" | "PHONE" | "TV" | "OTHER" }
      : "skip"
  );

  const initiateBillPayment = useMutation(api.billPayments.initiateBillPayment);
  const processBillPayment = useMutation(api.billPayments.processBillPayment);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      currency: "XOF",
    },
  });

  const billType = watch("billType");
  const amount = watch("amount");
  const currency = watch("currency");

  // Calculate fees and total
  const numAmount = parseFloat(amount) || 0;
  const fees = Math.round(numAmount * 0.02);
  const totalAmount = numAmount + fees;

  const onSubmit = async (data: PaymentForm) => {
    setIsProcessing(true);
    try {
      // Step 1: Initiate payment
      const result = await initiateBillPayment({
        billType: data.billType,
        provider: data.provider,
        billReference: data.billReference,
        accountNumber: data.accountNumber,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || undefined,
        amount: parseFloat(data.amount),
        currency: data.currency,
      });

      // Step 2: Process payment through SAYELE gate
      await processBillPayment({
        paymentId: result.paymentId,
      });

      // Navigate to success page
      navigate(`/pay/success?ref=${result.paymentReference}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors du traitement du paiement"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <nav className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">SAYELE Hub</span>
            <span className="ml-2 text-muted-foreground">• {t("app.billPayment", { ns: "common" })}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Payer vos Factures</h1>
            <p className="text-muted-foreground">
              Paiement rapide et sécurisé via SAYELE gate
            </p>
          </div>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Informations de Paiement</CardTitle>
              <CardDescription>
                Remplissez les informations ci-dessous pour effectuer votre paiement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Bill Type Selection */}
                <div className="space-y-2">
                  <Label>Type de Facture *</Label>
                  <Select
                    value={billType}
                    onValueChange={(value) => {
                      setValue("billType", value as PaymentForm["billType"]);
                      setSelectedBillType(value);
                      setValue("provider", ""); // Reset provider when bill type changes
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez le type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(billTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            {billTypeIcons[value]}
                            <span>{label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.billType && (
                    <p className="text-sm text-red-500">{errors.billType.message}</p>
                  )}
                </div>

                {/* Provider */}
                {billType && (
                  <div className="space-y-2">
                    <Label>Fournisseur *</Label>
                    <Select
                      value={watch("provider")}
                      onValueChange={(value) => setValue("provider", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez le fournisseur" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers?.map((provider) => (
                          <SelectItem key={provider} value={provider}>
                            {provider}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.provider && (
                      <p className="text-sm text-red-500">{errors.provider.message}</p>
                    )}
                  </div>
                )}

                {/* Bill Reference */}
                <div className="space-y-2">
                  <Label htmlFor="billReference">Référence de Facture *</Label>
                  <Input
                    id="billReference"
                    {...register("billReference")}
                    placeholder="Ex: 123456789"
                  />
                  {errors.billReference && (
                    <p className="text-sm text-red-500">
                      {errors.billReference.message}
                    </p>
                  )}
                </div>

                {/* Account Number (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Numéro de Compte (optionnel)</Label>
                  <Input
                    id="accountNumber"
                    {...register("accountNumber")}
                    placeholder="Ex: ACC123456"
                  />
                </div>

                {/* Customer Name */}
                <div className="space-y-2">
                  <Label htmlFor="customerName">Nom Complet *</Label>
                  <Input
                    id="customerName"
                    {...register("customerName")}
                    placeholder="Ex: Jean Dupont"
                  />
                  {errors.customerName && (
                    <p className="text-sm text-red-500">
                      {errors.customerName.message}
                    </p>
                  )}
                </div>

                {/* Customer Phone */}
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Téléphone *</Label>
                  <Input
                    id="customerPhone"
                    {...register("customerPhone")}
                    placeholder="Ex: +224 123 456 789"
                  />
                  {errors.customerPhone && (
                    <p className="text-sm text-red-500">
                      {errors.customerPhone.message}
                    </p>
                  )}
                </div>

                {/* Customer Email (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email (optionnel)</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    {...register("customerEmail")}
                    placeholder="exemple@email.com"
                  />
                  {errors.customerEmail && (
                    <p className="text-sm text-red-500">
                      {errors.customerEmail.message}
                    </p>
                  )}
                </div>

                {/* Amount and Currency */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Montant *</Label>
                    <Input
                      id="amount"
                      type="number"
                      {...register("amount")}
                      placeholder="10000"
                    />
                    {errors.amount && (
                      <p className="text-sm text-red-500">{errors.amount.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Devise *</Label>
                    <Select
                      value={currency}
                      onValueChange={(value) =>
                        setValue("currency", value as "XOF" | "GNF")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="XOF">XOF (Franc CFA)</SelectItem>
                        <SelectItem value="GNF">GNF (Franc Guinéen)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Payment Summary */}
                {numAmount > 0 && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Montant</span>
                          <span className="font-medium">
                            {numAmount.toLocaleString()} {currency}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Frais (2%)</span>
                          <span className="font-medium">
                            {fees.toLocaleString()} {currency}
                          </span>
                        </div>
                        <div className="h-px bg-border my-2" />
                        <div className="flex justify-between">
                          <span className="font-semibold">Total à Payer</span>
                          <span className="text-xl font-bold text-primary">
                            {totalAmount.toLocaleString()} {currency}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Traitement en cours...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payer Maintenant
                    </span>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Paiement sécurisé via SAYELE gate
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Informations importantes :</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Les paiements sont traités instantanément</li>
                  <li>Un reçu vous sera envoyé après le paiement</li>
                  <li>Conservez votre référence de paiement pour toute réclamation</li>
                  <li>Des frais de 2% s'appliquent à chaque transaction</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

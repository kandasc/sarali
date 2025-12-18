import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
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
import { Building2, CreditCard, Zap, Droplet, Wifi, Phone, Tv, Package, ArrowLeft, LogIn, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import LanguageSwitcher from "@/components/ui/language-switcher.tsx";
import { useTranslation } from "react-i18next";
import Footer from "@/components/footer.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Authenticated, Unauthenticated } from "convex/react";
import { useAuth } from "@/hooks/use-auth.ts";

const paymentSchema = z.object({
  billReference: z.string().min(1, "Référence de facture requise"),
  accountNumber: z.string().optional(),
  customerName: z.string().min(2, "Nom requis"),
  customerPhone: z.string().min(8, "Numéro de téléphone valide requis"),
  customerEmail: z.string().email("Email invalide").optional().or(z.literal("")),
  amount: z.string().min(1, "Montant requis"),
  currency: z.enum(["XOF", "GNF"]),
});

type PaymentForm = z.infer<typeof paymentSchema>;

type BillCategory = "ELECTRICITY" | "WATER" | "INTERNET" | "PHONE" | "TV" | "OTHER";

const categoryIcons: Record<BillCategory, React.ReactNode> = {
  ELECTRICITY: <Zap className="h-8 w-8" />,
  WATER: <Droplet className="h-8 w-8" />,
  INTERNET: <Wifi className="h-8 w-8" />,
  PHONE: <Phone className="h-8 w-8" />,
  TV: <Tv className="h-8 w-8" />,
  OTHER: <Package className="h-8 w-8" />,
};

const categoryLabels: Record<BillCategory, string> = {
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
  const { agencyCode } = useParams<{ agencyCode?: string }>();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<BillCategory | null>(null);
  const [selectedBiller, setSelectedBiller] = useState<{
    id: Id<"billers">;
    name: string;
    category: BillCategory;
    logoUrl: string | null;
    feePercentage?: number;
    feeFixed?: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get current user for dashboard link - only when authenticated
  const { user } = useAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    user ? {} : "skip"
  );

  // Check if agencyCode is actually a route (not an agency)
  const isKnownRoute = ["dashboard", "master", "manager", "agency", "cashier", "success"].includes(
    agencyCode || ""
  );

  // Get agency branding if agency code is provided and not a known route
  const agencyBranding = useQuery(
    api.agencies.getAgencyBranding,
    agencyCode && !isKnownRoute ? { agencyCode } : "skip"
  );

  // Default branding
  const brandName = agencyBranding?.brandName || "SAYELE Hub";
  const brandLogoUrl = agencyBranding?.brandLogoUrl;
  const brandPrimaryColor = agencyBranding?.brandPrimaryColor;
  const brandWebsite = agencyBranding?.brandWebsite;

  // Get active billers for selected category
  const billers = useQuery(
    api.billers.listActiveBillers,
    selectedCategory ? { category: selectedCategory } : "skip"
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

  const amount = watch("amount");
  const currency = watch("currency");

  // Calculate fees and total
  const numAmount = parseFloat(amount) || 0;
  const feePercentage = selectedBiller?.feePercentage || 2;
  const feeFixed = selectedBiller?.feeFixed || 0;
  const fees = Math.round((numAmount * feePercentage) / 100) + feeFixed;
  const totalAmount = numAmount + fees;

  const onSubmit = async (data: PaymentForm) => {
    if (!selectedBiller) {
      toast.error("Veuillez sélectionner un fournisseur");
      return;
    }

    setIsProcessing(true);
    try {
      // Step 1: Initiate payment
      const result = await initiateBillPayment({
        billType: selectedBiller.category,
        provider: selectedBiller.name,
        billerId: selectedBiller.id,
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
      const currentLang = location.pathname.split("/")[1];
      navigate(`/${currentLang}/success?ref=${result.paymentReference}`);
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

  // Reset selections when going back
  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedBiller(null);
  };

  const handleBackToBillers = () => {
    setSelectedBiller(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      {/* Header */}
      <nav className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {brandLogoUrl ? (
              <img
                src={brandLogoUrl}
                alt={brandName}
                className="h-8 w-8 object-contain"
              />
            ) : (
              <Building2 className="h-8 w-8 text-primary" />
            )}
            <span className="text-2xl font-bold" style={brandPrimaryColor ? { color: brandPrimaryColor } : {}}>
              {brandName}
            </span>
            <span className="ml-2 text-muted-foreground">• {t("app.billPayment", { ns: "common" })}</span>
          </div>
          <div className="flex items-center gap-3">
            <Unauthenticated>
              <SignInButton variant="outline" size="sm">
                <LogIn className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Connexion Agent</span>
                <span className="sm:hidden">Connexion</span>
              </SignInButton>
            </Unauthenticated>
            <Authenticated>
              {currentUser && (() => {
                const lang = location.pathname.split("/")[1] || "fr";
                let dashboardPath = `/${lang}/cashier`;
                
                // Route based on role
                switch (currentUser.role) {
                  case "SUPER_ADMIN":
                    dashboardPath = `/${lang}/superadmin`;
                    break;
                  case "MASTER":
                    dashboardPath = `/${lang}/master`;
                    break;
                  case "MANAGER":
                    dashboardPath = `/${lang}/manager`;
                    break;
                  case "CHEF_AGENCE":
                    dashboardPath = `/${lang}/agency`;
                    break;
                  case "CAISSIER":
                    dashboardPath = `/${lang}/cashier`;
                    break;
                }
                
                return (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={dashboardPath}>
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Dashboard</span>
                      <span className="sm:hidden">Dashboard</span>
                    </Link>
                  </Button>
                );
              })()}
            </Authenticated>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Payer vos Factures</h1>
            <p className="text-muted-foreground">
              Paiement rapide et sécurisé via SAYELE gate
            </p>
            {brandWebsite && (
              <p className="text-sm">
                <a
                  href={brandWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Visitez notre site web
                </a>
              </p>
            )}
          </div>

          {/* Step 1: Category Selection */}
          {!selectedCategory && (
            <Card>
              <CardHeader>
                <CardTitle>Sélectionnez une Catégorie</CardTitle>
                <CardDescription>
                  Choisissez le type de facture que vous souhaitez payer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(Object.entries(categoryLabels) as [BillCategory, string][]).map(([category, label]) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-muted hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <div className="p-3 rounded-full bg-primary/10 text-primary">
                        {categoryIcons[category]}
                      </div>
                      <span className="font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Biller Selection */}
          {selectedCategory && !selectedBiller && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToCategories}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour
                  </Button>
                </div>
                <CardTitle>Sélectionnez un Fournisseur</CardTitle>
                <CardDescription>
                  Choisissez votre fournisseur de {categoryLabels[selectedCategory].toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {billers === undefined ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Chargement des fournisseurs...
                  </div>
                ) : billers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      Aucun fournisseur disponible pour cette catégorie
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {billers.map((biller) => (
                      <button
                        key={biller._id}
                        onClick={() =>
                          setSelectedBiller({
                            id: biller._id,
                            name: biller.name,
                            category: biller.category,
                            logoUrl: biller.logoUrl,
                            feePercentage: biller.feePercentage,
                            feeFixed: biller.feeFixed,
                          })
                        }
                        className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-muted hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        {biller.logoUrl ? (
                          <div className="h-20 w-20 flex items-center justify-center">
                            <img
                              src={biller.logoUrl}
                              alt={biller.name}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                            <Building2 className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium text-center">{biller.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Payment Form */}
          {selectedBiller && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToBillers}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  {selectedBiller.logoUrl ? (
                    <img
                      src={selectedBiller.logoUrl}
                      alt={selectedBiller.name}
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <Building2 className="h-12 w-12 text-muted-foreground" />
                  )}
                  <div>
                    <CardTitle>Paiement {selectedBiller.name}</CardTitle>
                    <CardDescription>
                      Remplissez les informations ci-dessous pour effectuer votre paiement
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                            <span className="text-muted-foreground">
                              Frais {feePercentage > 0 && `(${feePercentage}%)`}
                              {feeFixed > 0 && feePercentage > 0 && " + "}
                              {feeFixed > 0 && `${feeFixed} ${currency}`}
                            </span>
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
                    style={brandPrimaryColor ? { backgroundColor: brandPrimaryColor } : {}}
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
          )}

          {/* Info */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Informations importantes :</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Les paiements sont traités instantanément</li>
                  <li>Un reçu vous sera envoyé après le paiement</li>
                  <li>Conservez votre référence de paiement pour toute réclamation</li>
                  <li>Des frais s'appliquent selon le fournisseur sélectionné</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

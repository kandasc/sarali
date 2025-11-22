import { useEffect } from "react";
import { useSearchParams, Link, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Building2, CheckCircle, Download, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import LanguageSwitcher from "@/components/ui/language-switcher.tsx";
import Footer from "@/components/footer.tsx";

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const paymentReference = searchParams.get("ref");
  const currentLang = location.pathname.split("/")[1];

  const payment = useQuery(
    api.billPayments.getPaymentByReference,
    paymentReference ? { paymentReference } : "skip"
  );

  const billTypeLabels: Record<string, string> = {
    ELECTRICITY: "Électricité",
    WATER: "Eau",
    INTERNET: "Internet",
    PHONE: "Téléphone",
    TV: "Télévision",
    OTHER: "Autre",
  };

  const handlePrint = () => {
    window.print();
  };

  if (!paymentReference) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Référence de paiement manquante
            </p>
            <div className="flex justify-center mt-4">
              <Button asChild>
                <Link to={`/${currentLang}`}>Retour au paiement</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (payment === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <nav className="border-b bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">SAYELE Hub</span>
            </div>
            <LanguageSwitcher />
          </div>
        </nav>
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-2xl space-y-4">
            <Skeleton className="h-60 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">Paiement introuvable</p>
            <Button asChild>
              <Link to={`/${currentLang}`}>Retour au paiement</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSuccessful = payment.status === "COMPLETED";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <nav className="border-b bg-background/80 backdrop-blur-sm print:hidden">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">SAYELE Hub</span>
            <span className="ml-2 text-muted-foreground">• Confirmation de Paiement</span>
          </div>
          <LanguageSwitcher />
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Success Message */}
          <Card
            className={
              isSuccessful
                ? "border-green-200 bg-green-50 dark:bg-green-950"
                : "border-orange-200 bg-orange-50 dark:bg-orange-950"
            }
          >
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div
                  className={`rounded-full p-4 ${
                    isSuccessful
                      ? "bg-green-100 dark:bg-green-900"
                      : "bg-orange-100 dark:bg-orange-900"
                  }`}
                >
                  <CheckCircle
                    className={`h-12 w-12 ${
                      isSuccessful
                        ? "text-green-600 dark:text-green-400"
                        : "text-orange-600 dark:text-orange-400"
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold">
                    {isSuccessful ? "Paiement Réussi !" : "Paiement en Traitement"}
                  </h1>
                  <p className="text-muted-foreground">
                    {isSuccessful
                      ? "Votre paiement a été traité avec succès"
                      : "Votre paiement est en cours de traitement"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Détails du Paiement</CardTitle>
              <CardDescription>
                Référence: <span className="font-mono">{payment.paymentReference}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Type de Facture</p>
                  <p className="font-medium">{billTypeLabels[payment.billType]}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Fournisseur</p>
                  <p className="font-medium">{payment.provider}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Référence Facture</p>
                  <p className="font-medium font-mono">{payment.billReference}</p>
                </div>

                {payment.accountNumber && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Numéro de Compte</p>
                    <p className="font-medium font-mono">{payment.accountNumber}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Nom du Client</p>
                  <p className="font-medium">{payment.customerName}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{payment.customerPhone}</p>
                </div>

                {payment.sayeleTransactionId && (
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-sm text-muted-foreground">ID Transaction SAYELE</p>
                    <p className="font-medium font-mono text-primary">
                      {payment.sayeleTransactionId}
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(payment._creationTime), "PPpp", { locale: fr })}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      payment.status === "COMPLETED"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : payment.status === "FAILED"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                    }`}
                  >
                    {payment.status}
                  </span>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="h-px bg-border my-4" />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-medium">
                    {payment.amount.toLocaleString()} {payment.currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frais</span>
                  <span className="font-medium">
                    {payment.fees.toLocaleString()} {payment.currency}
                  </span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between">
                  <span className="font-semibold">Total Payé</span>
                  <span className="text-xl font-bold text-primary">
                    {payment.totalAmount.toLocaleString()} {payment.currency}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 print:hidden">
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Imprimer le Reçu
            </Button>
            <Button asChild className="flex-1">
              <Link to={`/${currentLang}`}>
                <Home className="mr-2 h-4 w-4" />
                Nouveau Paiement
              </Link>
            </Button>
          </div>

          {/* Important Notice */}
          <Card className="border-primary/20 bg-primary/5 print:hidden">
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Informations importantes :</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    Conservez cette référence:{" "}
                    <span className="font-mono font-semibold">
                      {payment.paymentReference}
                    </span>
                  </li>
                  <li>Un reçu a été envoyé à votre numéro de téléphone</li>
                  <li>Pour toute réclamation, contactez-nous avec votre référence</li>
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

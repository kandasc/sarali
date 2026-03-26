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
import { CheckCircle, Download, Home, XCircle, Ban } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Footer from "@/components/footer.tsx";
import { PaymentTopNav } from "./_components/payment-top-nav.tsx";
import { useTranslation } from "react-i18next";

export default function PaymentSuccessPage() {
  const { t } = useTranslation("payment");
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
        <PaymentTopNav />
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

  const status = payment.status;
  const isSuccessful = status === "COMPLETED";
  const isCancelled = status === "CANCELLED";
  const isFailed = status === "FAILED";
  const isProcessing =
    status === "PROCESSING" || status === "PENDING";

  const statusBadgeClass =
    status === "COMPLETED"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      : status === "FAILED"
        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
        : status === "CANCELLED"
          ? "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";

  const statusLabelFr =
    status === "COMPLETED"
      ? "Réussi"
      : status === "FAILED"
        ? "Échoué"
        : status === "CANCELLED"
          ? "Annulé"
          : status === "PROCESSING"
            ? "En traitement"
            : status === "PENDING"
              ? "En attente"
              : status;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Test Mode Banner */}
      {payment.isTest && (
        <div className="bg-yellow-500 text-yellow-950 text-center py-2 text-sm font-medium print:hidden">
          🧪 MODE TEST - Cette transaction n'est pas réelle
        </div>
      )}
      
      {/* Header */}
      <PaymentTopNav />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Success Message */}
          <Card
            className={
              isSuccessful
                ? "border-green-200 bg-green-50 dark:bg-green-950"
                : isCancelled
                  ? "border-slate-300 bg-slate-50 dark:bg-slate-950 dark:border-slate-700"
                  : isFailed
                    ? "border-red-200 bg-red-50 dark:bg-red-950"
                    : "border-orange-200 bg-orange-50 dark:bg-orange-950"
            }
          >
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div
                  className={`rounded-full p-4 ${
                    isSuccessful
                      ? "bg-green-100 dark:bg-green-900"
                      : isCancelled
                        ? "bg-slate-200 dark:bg-slate-800"
                        : isFailed
                          ? "bg-red-100 dark:bg-red-900"
                          : "bg-orange-100 dark:bg-orange-900"
                  }`}
                >
                  {isSuccessful ? (
                    <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                  ) : isCancelled ? (
                    <Ban className="h-12 w-12 text-slate-700 dark:text-slate-300" />
                  ) : isFailed ? (
                    <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                  ) : (
                    <CheckCircle className="h-12 w-12 text-orange-600 dark:text-orange-400" />
                  )}
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold">
                    {isSuccessful
                      ? "Paiement Réussi !"
                      : isCancelled
                        ? "Paiement annulé"
                        : isFailed
                          ? "Paiement échoué"
                          : isProcessing
                            ? "Paiement en traitement"
                            : "Statut du paiement"}
                  </h1>
                  <p className="text-muted-foreground">
                    {isSuccessful
                      ? "Votre paiement a été traité avec succès"
                      : isCancelled
                        ? "Ce paiement a été annulé. Aucun débit n’a été effectué."
                        : isFailed
                          ? payment.errorMessage ||
                            "Le paiement n’a pas pu être finalisé."
                          : isProcessing
                            ? "Votre paiement est en cours de traitement"
                            : "Consultez le statut ci-dessous."}
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

                {payment.saraliTransactionId && (
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-sm text-muted-foreground">{t("success.saraliId")}</p>
                    <p className="font-medium font-mono text-primary">
                      {payment.saraliTransactionId}
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
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusBadgeClass}`}
                  >
                    {statusLabelFr}
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

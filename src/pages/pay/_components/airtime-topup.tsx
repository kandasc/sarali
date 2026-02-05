import { useState, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  ArrowLeft,
  Loader2,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils.ts";

type Country = "GN" | "CI" | "SN";

type Operator = {
  id: number;
  name: string;
  logoUrls: string[];
  denominationType: string;
  minAmount: number | null;
  maxAmount: number | null;
  localMinAmount: number | null;
  localMaxAmount: number | null;
  fixedAmounts: number[];
  localFixedAmounts: number[];
  currencyCode: string;
  localCurrencyCode: string;
  supportsLocalAmounts: boolean;
  data: boolean;
};

type AirtimeTopupProps = {
  country: Country;
  currency: "XOF" | "GNF";
  onBack: () => void;
  onSuccess: (reference: string) => void;
  brandPrimaryColor?: string;
};

const countryPhonePrefixes: Record<Country, { prefix: string; flag: string; length: number; placeholder: string }> = {
  GN: { prefix: "+224", flag: "🇬🇳", length: 9, placeholder: "6XX XXX XXX" },
  CI: { prefix: "+225", flag: "🇨🇮", length: 10, placeholder: "07 XX XX XX XX" },
  SN: { prefix: "+221", flag: "🇸🇳", length: 9, placeholder: "7X XXX XX XX" },
};

export default function AirtimeTopup({
  country,
  currency,
  onBack,
  onSuccess,
  brandPrimaryColor,
}: AirtimeTopupProps) {
  const { t } = useTranslation(["payment", "common"]);
  
  // State
  const [step, setStep] = useState<"operators" | "amount" | "confirm" | "processing" | "success" | "error">("operators");
  const [operators, setOperators] = useState<Operator[]>([]);
  const [isLoadingOperators, setIsLoadingOperators] = useState(true);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionResult, setTransactionResult] = useState<{
    transactionId?: number;
    deliveredAmount?: number;
    deliveredCurrency?: string;
    operatorName?: string;
    reference?: string;
  } | null>(null);

  // Actions
  const getOperators = useAction(api.reloadly.getOperators);
  const makeTopup = useAction(api.reloadly.makeTopup);
  const recordAirtimeTopup = useMutation(api.billPayments.initiateBillPayment);

  // Load operators on mount
  useEffect(() => {
    const loadOperators = async () => {
      setIsLoadingOperators(true);
      try {
        const result = await getOperators({
          countryCode: country,
          isProduction: true, // Use production mode with live credentials
        });

        if (result.success && result.operators) {
          // Filter out data-only operators for airtime
          const airtimeOperators = result.operators.filter((op) => !op.data);
          setOperators(airtimeOperators);
        } else {
          setError(result.error || "Failed to load operators");
          toast.error("Erreur lors du chargement des opérateurs");
        }
      } catch (err) {
        console.error("Error loading operators:", err);
        setError("Failed to load operators");
        toast.error("Erreur lors du chargement des opérateurs");
      } finally {
        setIsLoadingOperators(false);
      }
    };

    loadOperators();
  }, [country, getOperators]);

  // Get the final amount to use
  const getFinalAmount = (): number => {
    if (selectedAmount) return selectedAmount;
    if (customAmount) return parseFloat(customAmount);
    return 0;
  };

  // Check if amount is valid
  const isAmountValid = (): boolean => {
    const amount = getFinalAmount();
    if (!selectedOperator || amount <= 0) return false;

    // Check range if applicable
    if (selectedOperator.denominationType === "RANGE") {
      const min = selectedOperator.supportsLocalAmounts
        ? selectedOperator.localMinAmount
        : selectedOperator.minAmount;
      const max = selectedOperator.supportsLocalAmounts
        ? selectedOperator.localMaxAmount
        : selectedOperator.maxAmount;

      if (min !== null && amount < min) return false;
      if (max !== null && amount > max) return false;
    }

    return true;
  };

  // Handle operator selection
  const handleSelectOperator = (operator: Operator) => {
    setSelectedOperator(operator);
    setSelectedAmount(null);
    setCustomAmount("");
    setStep("amount");
  };

  // Handle amount selection
  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  // Handle confirm step
  const handleProceedToConfirm = () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      toast.error("Veuillez entrer un numéro de téléphone valide");
      return;
    }
    if (!isAmountValid()) {
      toast.error("Veuillez sélectionner ou entrer un montant valide");
      return;
    }
    setStep("confirm");
  };

  // Process the top-up
  const handleConfirmTopup = async () => {
    if (!selectedOperator) return;

    setIsProcessing(true);
    setStep("processing");
    setError(null);

    const amount = getFinalAmount();
    const useLocalAmount = selectedOperator.supportsLocalAmounts;

    try {
      // First, record the payment in our database
      const paymentRecord = await recordAirtimeTopup({
        billType: "AIRTIME",
        provider: selectedOperator.name,
        billReference: `AIRTIME-${Date.now()}`,
        customerName: "Airtime Customer",
        customerPhone: phoneNumber,
        amount: amount,
        currency: currency,
        isTest: false, // Production mode
      });

      // Then make the actual top-up via Reloadly
      const result = await makeTopup({
        operatorId: selectedOperator.id,
        amount: amount,
        phoneNumber: phoneNumber,
        countryCode: country,
        useLocalAmount: useLocalAmount,
        isProduction: true, // Use production mode
        customIdentifier: paymentRecord.paymentReference,
      });

      if (result.success) {
        setTransactionResult({
          transactionId: result.transactionId,
          deliveredAmount: result.deliveredAmount,
          deliveredCurrency: result.deliveredCurrency,
          operatorName: result.operatorName,
          reference: paymentRecord.paymentReference,
        });
        setStep("success");
        toast.success("Recharge effectuée avec succès!");
      } else {
        setError(result.error || "La recharge a échoué");
        setStep("error");
        toast.error(result.error || "La recharge a échoué");
      }
    } catch (err) {
      console.error("Topup error:", err);
      const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMessage);
      setStep("error");
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle success navigation
  const handleSuccessClose = () => {
    if (transactionResult?.reference) {
      onSuccess(transactionResult.reference);
    }
  };

  // Format phone number display
  const formatPhoneDisplay = (phone: string) => {
    const prefix = countryPhonePrefixes[country];
    return `${prefix.flag} ${prefix.prefix} ${phone}`;
  };

  // Get available amounts for the operator
  const getAvailableAmounts = (): number[] => {
    if (!selectedOperator) return [];

    if (selectedOperator.denominationType === "FIXED") {
      return selectedOperator.supportsLocalAmounts
        ? selectedOperator.localFixedAmounts
        : selectedOperator.fixedAmounts;
    }

    // For RANGE type, suggest some common amounts
    const min = selectedOperator.supportsLocalAmounts
      ? selectedOperator.localMinAmount || 100
      : selectedOperator.minAmount || 1;
    const max = selectedOperator.supportsLocalAmounts
      ? selectedOperator.localMaxAmount || 50000
      : selectedOperator.maxAmount || 100;

    // Generate suggested amounts
    const suggestions: number[] = [];
    const step = Math.floor((max - min) / 5);
    for (let i = 0; i < 5; i++) {
      const amount = Math.round((min + step * i) / 100) * 100;
      if (amount >= min && amount <= max) {
        suggestions.push(amount);
      }
    }
    if (!suggestions.includes(max)) {
      suggestions.push(max);
    }

    return suggestions;
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          {step !== "processing" && step !== "success" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (step === "operators") {
                  onBack();
                } else if (step === "amount") {
                  setStep("operators");
                  setSelectedOperator(null);
                } else if (step === "confirm" || step === "error") {
                  setStep("amount");
                }
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle>{t("airtime.title", "Recharge Mobile")}</CardTitle>
            <CardDescription>
              {step === "operators" && t("airtime.selectOperator", "Sélectionnez votre opérateur")}
              {step === "amount" && t("airtime.selectAmount", "Choisissez le montant de la recharge")}
              {step === "confirm" && t("airtime.confirmTopup", "Confirmez votre recharge")}
              {step === "processing" && t("airtime.processing", "Traitement en cours...")}
              {step === "success" && t("airtime.success", "Recharge réussie!")}
              {step === "error" && t("airtime.error", "Erreur de recharge")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Operator Selection */}
        {step === "operators" && (
          <>
            {isLoadingOperators ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Chargement des opérateurs...</p>
              </div>
            ) : operators.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Aucun opérateur disponible pour ce pays
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {operators.map((operator) => (
                  <button
                    key={operator.id}
                    onClick={() => handleSelectOperator(operator)}
                    className="flex flex-col items-center gap-3 p-4 rounded-lg border-2 border-muted hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    {operator.logoUrls && operator.logoUrls.length > 0 ? (
                      <img
                        src={operator.logoUrls[0]}
                        alt={operator.name}
                        className="h-16 w-16 object-contain"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <Smartphone className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <span className="font-medium text-sm text-center">
                      {operator.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Step 2: Amount Selection */}
        {step === "amount" && selectedOperator && (
          <>
            {/* Selected Operator Display */}
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              {selectedOperator.logoUrls?.[0] ? (
                <img
                  src={selectedOperator.logoUrls[0]}
                  alt={selectedOperator.name}
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <Smartphone className="h-10 w-10 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">{selectedOperator.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedOperator.supportsLocalAmounts
                    ? selectedOperator.localCurrencyCode
                    : selectedOperator.currencyCode}
                </p>
              </div>
            </div>

            {/* Phone Number Input */}
            <div className="space-y-2">
              <Label htmlFor="phone">Numéro de téléphone *</Label>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 bg-muted rounded-md border">
                  <span className="text-lg">{countryPhonePrefixes[country].flag}</span>
                  <span className="text-sm font-medium">{countryPhonePrefixes[country].prefix}</span>
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={countryPhonePrefixes[country].placeholder}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                  maxLength={countryPhonePrefixes[country].length}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Amount Selection */}
            <div className="space-y-3">
              <Label>{t("airtime.amount", "Montant de la recharge")} *</Label>

              {/* Fixed amounts */}
              <div className="grid grid-cols-3 gap-2">
                {getAvailableAmounts().slice(0, 6).map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handleSelectAmount(amount)}
                    className={cn(
                      "p-3 rounded-lg border-2 text-center transition-all",
                      selectedAmount === amount
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    {amount.toLocaleString()} {currency}
                  </button>
                ))}
              </div>

              {/* Custom amount for RANGE type */}
              {selectedOperator.denominationType === "RANGE" && (
                <div className="space-y-2">
                  <Label htmlFor="customAmount">Ou entrez un montant personnalisé</Label>
                  <div className="flex gap-2">
                    <Input
                      id="customAmount"
                      type="number"
                      placeholder={`${selectedOperator.supportsLocalAmounts ? selectedOperator.localMinAmount : selectedOperator.minAmount} - ${selectedOperator.supportsLocalAmounts ? selectedOperator.localMaxAmount : selectedOperator.maxAmount}`}
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setSelectedAmount(null);
                      }}
                    />
                    <span className="flex items-center px-3 bg-muted rounded-md border text-sm font-medium">
                      {currency}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Min: {(selectedOperator.supportsLocalAmounts ? selectedOperator.localMinAmount : selectedOperator.minAmount)?.toLocaleString()} {currency} -
                    Max: {(selectedOperator.supportsLocalAmounts ? selectedOperator.localMaxAmount : selectedOperator.maxAmount)?.toLocaleString()} {currency}
                  </p>
                </div>
              )}
            </div>

            {/* Proceed Button */}
            <Button
              className="w-full"
              size="lg"
              disabled={!phoneNumber || !isAmountValid()}
              onClick={handleProceedToConfirm}
              style={brandPrimaryColor ? { backgroundColor: brandPrimaryColor } : {}}
            >
              Continuer
            </Button>
          </>
        )}

        {/* Step 3: Confirmation */}
        {step === "confirm" && selectedOperator && (
          <>
            <div className="space-y-4">
              {/* Summary Card */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Opérateur</span>
                    <div className="flex items-center gap-2">
                      {selectedOperator.logoUrls?.[0] && (
                        <img
                          src={selectedOperator.logoUrls[0]}
                          alt={selectedOperator.name}
                          className="h-6 w-6 object-contain"
                        />
                      )}
                      <span className="font-medium">{selectedOperator.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Numéro</span>
                    <span className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {formatPhoneDisplay(phoneNumber)}
                    </span>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Montant à recharger</span>
                    <span className="text-xl font-bold text-primary">
                      {getFinalAmount().toLocaleString()} {currency}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Warning */}
              <div className="flex items-start gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Vérifiez les informations
                  </p>
                  <p className="text-amber-700 dark:text-amber-300">
                    Une fois confirmée, la recharge ne peut pas être annulée.
                  </p>
                </div>
              </div>
            </div>

            {/* Confirm Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleConfirmTopup}
              style={brandPrimaryColor ? { backgroundColor: brandPrimaryColor } : {}}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Confirmer la recharge
            </Button>
          </>
        )}

        {/* Processing State */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Traitement en cours...</p>
            <p className="text-muted-foreground">
              Veuillez patienter pendant que nous traitons votre recharge
            </p>
          </div>
        )}

        {/* Success State */}
        {step === "success" && transactionResult && (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <p className="text-xl font-bold text-green-600">Recharge réussie!</p>
              <p className="text-muted-foreground">
                {transactionResult.deliveredAmount?.toLocaleString()} {transactionResult.deliveredCurrency} ont été crédités
              </p>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Opérateur</span>
                  <span className="font-medium">{transactionResult.operatorName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Numéro</span>
                  <span className="font-medium">{formatPhoneDisplay(phoneNumber)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Référence</span>
                  <span className="font-mono text-xs">{transactionResult.reference}</span>
                </div>
                {transactionResult.transactionId && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ID Transaction</span>
                    <span className="font-mono text-xs">{transactionResult.transactionId}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSuccessClose}
              style={brandPrimaryColor ? { backgroundColor: brandPrimaryColor } : {}}
            >
              Terminer
            </Button>
          </div>
        )}

        {/* Error State */}
        {step === "error" && (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
              <p className="text-xl font-bold text-red-600">Échec de la recharge</p>
              <p className="text-muted-foreground text-center px-4">
                {error || "Une erreur est survenue lors de la recharge"}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setStep("confirm");
                  setError(null);
                }}
              >
                Réessayer
              </Button>
              <Button
                className="flex-1"
                onClick={onBack}
              >
                Retour à l'accueil
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

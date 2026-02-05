import { useState, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
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
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  ArrowLeft,
  Loader2,
  Tv,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  MapPin,
  Package,
  Phone,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

type Country = "GN" | "CI" | "SN";

type CanalPlusSubscriptionProps = {
  country: Country;
  currency: "XOF" | "GNF";
  billerId: Id<"billers">;
  billerName: string;
  billerLogoUrl: string | null;
  onBack: () => void;
  onSuccess: (reference: string) => void;
  brandPrimaryColor?: string;
};

type Subscriber = {
  decoderNumber: string;
  contractNumber: string;
  name: string;
  status: string;
  currentOffer: string;
  expiryDate: string;
  city: string;
  address: string;
  exists: boolean;
  unique: boolean;
};

type CanalPackage = {
  id: string;
  displayName: string;
};

type PackageDetails = {
  packageId: string;
  options: Array<{ name: string; price: string }>;
  periods: Array<{ duration: string; price: string }>;
};

const countryPhonePrefixes: Record<Country, { prefix: string; flag: string; length: number; placeholder: string }> = {
  GN: { prefix: "+224", flag: "🇬🇳", length: 9, placeholder: "6XX XXX XXX" },
  CI: { prefix: "+225", flag: "🇨🇮", length: 10, placeholder: "07 XX XX XX XX" },
  SN: { prefix: "+221", flag: "🇸🇳", length: 9, placeholder: "7X XXX XX XX" },
};

// Parse price string to number (e.g., "83,540 GNF" -> 83540)
function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) || 0;
}

export default function CanalPlusSubscription({
  country,
  currency,
  billerId,
  billerName,
  billerLogoUrl,
  onBack,
  onSuccess,
  brandPrimaryColor,
}: CanalPlusSubscriptionProps) {
  // Steps: verify -> packages -> details -> confirm -> processing -> success/error
  const [step, setStep] = useState<"verify" | "packages" | "details" | "confirm" | "processing" | "success" | "error">("verify");
  
  // Form state
  const [decoderNumber, setDecoderNumber] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  
  // Packages state
  const [packages, setPackages] = useState<CanalPackage[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CanalPackage | null>(null);
  
  // Package details state
  const [packageDetails, setPackageDetails] = useState<PackageDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  // Contact info
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionResult, setTransactionResult] = useState<{
    message: string;
    reference: string;
    executionTime?: string;
  } | null>(null);
  
  // Actions
  const checkDecoder = useAction(api.canalPlus.checkDecoder);
  const getAllPackages = useAction(api.canalPlus.getAllPackages);
  const getPackageDetails = useAction(api.canalPlus.getPackageDetails);
  const processReabonnement = useAction(api.canalPlus.processReabonnement);
  const recordPayment = useMutation(api.billPayments.initiateBillPayment);

  // Handle decoder verification
  const handleVerifyDecoder = async () => {
    if (!decoderNumber || decoderNumber.length < 8) {
      toast.error("Veuillez entrer un numéro de décodeur valide");
      return;
    }
    
    setIsVerifying(true);
    setError(null);
    
    try {
      const result = await checkDecoder({
        decoderNumber: decoderNumber,
        isProduction: false, // Using TEST mode
      });
      
      if (result.success && result.subscriber) {
        setSubscriber(result.subscriber);
        // Load packages after successful verification
        await loadPackages();
        setStep("packages");
      } else {
        setError(result.error || "Abonné non trouvé");
        toast.error(result.error || "Abonné non trouvé");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur de vérification";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Load all packages
  const loadPackages = async () => {
    setIsLoadingPackages(true);
    try {
      const result = await getAllPackages({ isProduction: false });
      if (result.success && result.packages) {
        setPackages(result.packages);
      } else {
        toast.error(result.error || "Erreur lors du chargement des packages");
      }
    } catch (err) {
      toast.error("Erreur lors du chargement des packages");
    } finally {
      setIsLoadingPackages(false);
    }
  };
  
  // Handle package selection
  const handleSelectPackage = async (pkg: CanalPackage) => {
    setSelectedPackage(pkg);
    setIsLoadingDetails(true);
    setSelectedDuration(null);
    setSelectedOption(null);
    
    try {
      const result = await getPackageDetails({
        packageId: pkg.id,
        isProduction: false,
      });
      
      if (result.success && result.packageDetails) {
        setPackageDetails(result.packageDetails);
        setStep("details");
      } else {
        toast.error(result.error || "Erreur lors du chargement des détails");
      }
    } catch (err) {
      toast.error("Erreur lors du chargement des détails du package");
    } finally {
      setIsLoadingDetails(false);
    }
  };
  
  // Get selected price
  const getSelectedPrice = (): number => {
    if (!packageDetails || !selectedDuration) return 0;
    
    const period = packageDetails.periods.find((p) => p.duration.includes(selectedDuration));
    let totalPrice = period ? parsePrice(period.price) : 0;
    
    // Add option price if selected
    if (selectedOption) {
      const option = packageDetails.options.find((o) => o.name === selectedOption);
      if (option) {
        totalPrice += parsePrice(option.price);
      }
    }
    
    return totalPrice;
  };
  
  // Handle proceed to confirm
  const handleProceedToConfirm = () => {
    if (!phoneNumber || phoneNumber.length < 8) {
      toast.error("Veuillez entrer un numéro de téléphone valide");
      return;
    }
    if (!selectedDuration) {
      toast.error("Veuillez sélectionner une durée");
      return;
    }
    setStep("confirm");
  };
  
  // Process the renewal
  const handleConfirmRenewal = async () => {
    if (!subscriber || !selectedPackage || !selectedDuration) return;
    
    setIsProcessing(true);
    setStep("processing");
    setError(null);
    
    const amount = getSelectedPrice();
    
    try {
      // Record payment in database first
      const paymentRecord = await recordPayment({
        billType: "TV",
        provider: billerName,
        billerId: billerId,
        billReference: `CANAL-${subscriber.decoderNumber}-${Date.now()}`,
        accountNumber: subscriber.contractNumber,
        customerName: subscriber.name,
        customerPhone: phoneNumber,
        amount: amount,
        currency: currency,
        isTest: true, // TEST mode
      });
      
      // Process the renewal via Canal+ API
      const result = await processReabonnement({
        decoderNumber: subscriber.decoderNumber,
        offre: selectedPackage.id,
        duree: selectedDuration,
        option: selectedOption || undefined,
        phoneNumber: phoneNumber,
        isProduction: false,
      });
      
      if (result.success && result.result) {
        setTransactionResult({
          message: result.result.message,
          reference: paymentRecord.paymentReference,
          executionTime: result.result.executionTime,
        });
        setStep("success");
        toast.success("Réabonnement effectué avec succès!");
      } else {
        setError(result.error || "Le réabonnement a échoué");
        setStep("error");
        toast.error(result.error || "Le réabonnement a échoué");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMsg);
      setStep("error");
      toast.error(errorMsg);
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
  
  // Go back handler
  const handleGoBack = () => {
    if (step === "verify") {
      onBack();
    } else if (step === "packages") {
      setStep("verify");
      setSubscriber(null);
    } else if (step === "details") {
      setStep("packages");
      setSelectedPackage(null);
      setPackageDetails(null);
    } else if (step === "confirm" || step === "error") {
      setStep("details");
    }
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          {step !== "processing" && step !== "success" && (
            <Button variant="ghost" size="sm" onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {billerLogoUrl ? (
            <img src={billerLogoUrl} alt={billerName} className="h-12 w-12 object-contain" />
          ) : (
            <div className="p-3 rounded-full bg-primary/10">
              <Tv className="h-8 w-8 text-primary" />
            </div>
          )}
          <div>
            <CardTitle>{billerName}</CardTitle>
            <CardDescription>
              {step === "verify" && "Entrez votre numéro de décodeur"}
              {step === "packages" && "Sélectionnez votre formule"}
              {step === "details" && "Configurez votre abonnement"}
              {step === "confirm" && "Confirmez votre réabonnement"}
              {step === "processing" && "Traitement en cours..."}
              {step === "success" && "Réabonnement réussi!"}
              {step === "error" && "Erreur de réabonnement"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Decoder Verification */}
        {step === "verify" && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="decoder">Numéro de décodeur *</Label>
                <Input
                  id="decoder"
                  type="text"
                  placeholder="Ex: 24510062007092"
                  value={decoderNumber}
                  onChange={(e) => setDecoderNumber(e.target.value.replace(/\D/g, ""))}
                  maxLength={14}
                />
                <p className="text-xs text-muted-foreground">
                  Entrez le numéro à 14 chiffres inscrit sur votre décodeur
                </p>
              </div>
              
              {error && (
                <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
            </div>
            
            <Button
              className="w-full"
              size="lg"
              disabled={!decoderNumber || decoderNumber.length < 8 || isVerifying}
              onClick={handleVerifyDecoder}
              style={brandPrimaryColor ? { backgroundColor: brandPrimaryColor } : {}}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Vérification...
                </>
              ) : (
                "Vérifier le décodeur"
              )}
            </Button>
          </>
        )}

        {/* Step 2: Package Selection */}
        {step === "packages" && subscriber && (
          <>
            {/* Subscriber Info Card */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{subscriber.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Tv className="h-4 w-4 text-muted-foreground" />
                  <span>Décodeur: {subscriber.decoderNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>Offre actuelle: <strong>{subscriber.currentOffer}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Expire le: <strong>{subscriber.expiryDate}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{subscriber.city}</span>
                </div>
                <div className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                  subscriber.status === "Active" 
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                )}>
                  {subscriber.status}
                </div>
              </CardContent>
            </Card>
            
            {/* Package Selection */}
            <div className="space-y-3">
              <Label>Sélectionnez une formule</Label>
              {isLoadingPackages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => handleSelectPackage(pkg)}
                      disabled={isLoadingDetails}
                      className={cn(
                        "p-4 rounded-lg border-2 text-center transition-all",
                        "hover:border-primary hover:bg-primary/5",
                        isLoadingDetails && selectedPackage?.id === pkg.id
                          ? "border-primary bg-primary/10"
                          : "border-muted"
                      )}
                    >
                      {isLoadingDetails && selectedPackage?.id === pkg.id ? (
                        <Loader2 className="h-5 w-5 mx-auto animate-spin text-primary" />
                      ) : (
                        <span className="font-semibold">{pkg.displayName}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Step 3: Package Details */}
        {step === "details" && selectedPackage && packageDetails && (
          <>
            {/* Selected Package */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="font-medium">{selectedPackage.displayName}</span>
              <Button variant="ghost" size="sm" onClick={() => setStep("packages")}>
                Changer
              </Button>
            </div>
            
            {/* Duration Selection */}
            <div className="space-y-3">
              <Label>Durée de l'abonnement *</Label>
              <div className="grid grid-cols-2 gap-3">
                {packageDetails.periods.map((period, idx) => {
                  const durationMatch = period.duration.match(/(\d+)/);
                  const duration = durationMatch ? durationMatch[1] : String(idx + 1);
                  
                  return (
                    <button
                      key={period.duration}
                      onClick={() => setSelectedDuration(duration)}
                      className={cn(
                        "p-4 rounded-lg border-2 text-center transition-all",
                        selectedDuration === duration
                          ? "border-primary bg-primary/10"
                          : "border-muted hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Clock className="h-4 w-4" />
                        <span className="font-semibold">{duration} Mois</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{period.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Options Selection */}
            {packageDetails.options.length > 0 && (
              <div className="space-y-3">
                <Label>Options supplémentaires (optionnel)</Label>
                <div className="space-y-2">
                  {packageDetails.options.map((option) => (
                    <button
                      key={option.name}
                      onClick={() => setSelectedOption(
                        selectedOption === option.name ? null : option.name
                      )}
                      className={cn(
                        "w-full p-4 rounded-lg border-2 flex items-center justify-between transition-all",
                        selectedOption === option.name
                          ? "border-primary bg-primary/10"
                          : "border-muted hover:border-primary/50"
                      )}
                    >
                      <span className="font-medium">{option.name}</span>
                      <span className="text-sm text-muted-foreground">+{option.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Phone Number */}
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
              <p className="text-xs text-muted-foreground">
                Un SMS de confirmation sera envoyé à ce numéro
              </p>
            </div>
            
            {/* Price Summary */}
            {selectedDuration && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total à payer</span>
                    <span className="text-xl font-bold text-primary">
                      {getSelectedPrice().toLocaleString()} {currency}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Button
              className="w-full"
              size="lg"
              disabled={!selectedDuration || !phoneNumber}
              onClick={handleProceedToConfirm}
              style={brandPrimaryColor ? { backgroundColor: brandPrimaryColor } : {}}
            >
              Continuer
            </Button>
          </>
        )}

        {/* Step 4: Confirmation */}
        {step === "confirm" && subscriber && selectedPackage && (
          <>
            <Card className="bg-muted/50">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Abonné</span>
                  <span className="font-medium">{subscriber.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Décodeur</span>
                  <span className="font-medium">{subscriber.decoderNumber}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Formule</span>
                  <span className="font-medium">{selectedPackage.displayName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Durée</span>
                  <span className="font-medium">{selectedDuration} Mois</span>
                </div>
                {selectedOption && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Option</span>
                    <span className="font-medium">{selectedOption}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Téléphone</span>
                  <span className="font-medium flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {countryPhonePrefixes[country].flag} {countryPhonePrefixes[country].prefix} {phoneNumber}
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">
                    {getSelectedPrice().toLocaleString()} {currency}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex items-start gap-2 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Vérifiez les informations
                </p>
                <p className="text-amber-700 dark:text-amber-300">
                  Une fois confirmé, le paiement ne peut pas être annulé.
                </p>
              </div>
            </div>
            
            <Button
              className="w-full"
              size="lg"
              onClick={handleConfirmRenewal}
              style={brandPrimaryColor ? { backgroundColor: brandPrimaryColor } : {}}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Confirmer le réabonnement
            </Button>
          </>
        )}

        {/* Processing State */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Traitement en cours...</p>
            <p className="text-muted-foreground text-center">
              Cette opération peut prendre jusqu'à 30 secondes.
              <br />
              Veuillez ne pas fermer cette page.
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
              <p className="text-xl font-bold text-green-600">Réabonnement réussi!</p>
              <p className="text-muted-foreground text-center">
                {transactionResult.message}
              </p>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Référence</span>
                  <span className="font-mono text-xs">{transactionResult.reference}</span>
                </div>
                {transactionResult.executionTime && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Temps d'exécution</span>
                    <span className="text-xs">{transactionResult.executionTime}</span>
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
              <p className="text-xl font-bold text-red-600">Échec du réabonnement</p>
              <p className="text-muted-foreground text-center px-4">
                {error || "Une erreur est survenue"}
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
              <Button className="flex-1" onClick={onBack}>
                Retour à l'accueil
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

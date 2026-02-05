import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import { useMutation, useQuery, useAction } from "convex/react";
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
import { Building2, CreditCard, Zap, Droplet, Wifi, Tv, Package, ArrowLeft, LogIn, LayoutDashboard, Search, Sparkles, Loader2, Shield, Car, Heart, Plane, Home, GraduationCap, Users, MapPin, Smartphone, Phone } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import Footer from "@/components/footer.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Authenticated, Unauthenticated } from "convex/react";
import { useDebounce } from "@/hooks/use-debounce.ts";
import AirtimeTopup from "./_components/airtime-topup.tsx";
import CanalPlusSubscription from "./_components/canal-plus-subscription.tsx";

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

type BillCategory = "ELECTRICITY" | "WATER" | "INTERNET" | "PHONE" | "TV" | "AIRTIME" | "INSURANCE" | "OTHER";

const categoryIcons: Record<BillCategory, React.ReactNode> = {
  ELECTRICITY: <Zap className="h-8 w-8" />,
  WATER: <Droplet className="h-8 w-8" />,
  INTERNET: <Wifi className="h-8 w-8" />,
  PHONE: <Phone className="h-8 w-8" />,
  TV: <Tv className="h-8 w-8" />,
  AIRTIME: <Smartphone className="h-8 w-8" />,
  INSURANCE: <Shield className="h-8 w-8" />,
  OTHER: <Package className="h-8 w-8" />,
};

const categoryLabels: Record<BillCategory, string> = {
  ELECTRICITY: "Électricité",
  WATER: "Eau",
  INTERNET: "Internet",
  PHONE: "Téléphone",
  TV: "Télévision",
  AIRTIME: "Recharge Mobile",
  INSURANCE: "Assurance",
  OTHER: "Autre",
};

type Country = "GN" | "CI" | "SN";

const countryConfig: Record<Country, { name: string; flag: string; currency: "XOF" | "GNF" }> = {
  GN: { name: "Guinée", flag: "🇬🇳", currency: "GNF" },
  CI: { name: "Côte d'Ivoire", flag: "🇨🇮", currency: "XOF" },
  SN: { name: "Sénégal", flag: "🇸🇳", currency: "XOF" },
};

// Featured content by country
const featuredByCountry: Record<Country, {
  company: string;
  description: string;
  color: string;
  website: string;
  products: Array<{ name: string; icon: React.ReactNode; desc: string }>;
} | null> = {
  CI: {
    company: "Leadway Assurance",
    description: "Assurance de confiance en Côte d'Ivoire",
    color: "emerald",
    website: "https://ci.leadway.com",
    products: [
      { name: "Auto / Moto", icon: <Car className="h-5 w-5" />, desc: "Assurance automobile" },
      { name: "Santé", icon: <Heart className="h-5 w-5" />, desc: "Couverture santé" },
      { name: "Voyage", icon: <Plane className="h-5 w-5" />, desc: "Assurance voyage" },
      { name: "Habitation", icon: <Home className="h-5 w-5" />, desc: "Protection maison" },
      { name: "Éducation", icon: <GraduationCap className="h-5 w-5" />, desc: "Épargne éducation" },
      { name: "Vie", icon: <Users className="h-5 w-5" />, desc: "Assurance vie" },
      { name: "Retraite", icon: <Shield className="h-5 w-5" />, desc: "Prévoyance" },
      { name: "Queen", icon: <Heart className="h-5 w-5" />, desc: "Pour les femmes" },
    ],
  },
  GN: {
    company: "Crédit Rural de Guinée",
    description: "Institution de microfinance leader en Guinée",
    color: "amber",
    website: "https://creditruralguinee.org",
    products: [
      { name: "Épargne", icon: <Shield className="h-5 w-5" />, desc: "Comptes d'épargne" },
      { name: "Crédit Agricole", icon: <Users className="h-5 w-5" />, desc: "Financement agricole" },
      { name: "Microfinance", icon: <CreditCard className="h-5 w-5" />, desc: "Micro-crédits" },
      { name: "Transfert", icon: <Phone className="h-5 w-5" />, desc: "Transferts d'argent" },
      { name: "PME/PMI", icon: <Building2 className="h-5 w-5" />, desc: "Crédits entreprises" },
      { name: "Habitat", icon: <Home className="h-5 w-5" />, desc: "Crédits immobiliers" },
      { name: "Éducation", icon: <GraduationCap className="h-5 w-5" />, desc: "Prêts scolaires" },
      { name: "Commerce", icon: <Package className="h-5 w-5" />, desc: "Crédits commerce" },
    ],
  },
  SN: null, // No featured content for Senegal yet
};

export default function PublicPaymentPage() {
  const { t } = useTranslation(["payment", "common"]);
  const navigate = useNavigate();
  const { agencyCode } = useParams<{ agencyCode?: string }>();
  const location = useLocation();
  const [selectedCountry, setSelectedCountry] = useState<Country>("GN");
  const [isDetectingCountry, setIsDetectingCountry] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<BillCategory | null>(null);
  const [showAirtimeFlow, setShowAirtimeFlow] = useState(false);
  const [showCanalPlusFlow, setShowCanalPlusFlow] = useState(false);
  const [selectedBiller, setSelectedBiller] = useState<{
    id: Id<"billers">;
    name: string;
    category: BillCategory;
    logoUrl: string | null;
    feePercentage?: number;
    feeFixed?: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    category: string | null;
    suggestions: Array<{ billerId: string; name: string; category: string; confidence: number }>;
    response: string;
  } | null>(null);
  
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);

  // Detect user's country from IP on mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        const countryCode = data.country_code;
        
        // Check if detected country is in our supported list
        if (countryCode === "GN" || countryCode === "CI" || countryCode === "SN") {
          setSelectedCountry(countryCode as Country);
        }
        // Default to GN if not in supported countries
      } catch (error) {
        console.error("Could not detect country:", error);
        // Keep default (GN)
      } finally {
        setIsDetectingCountry(false);
      }
    };
    
    detectCountry();
  }, []);

  // Get current user for dashboard link - safe for unauthenticated users
  const currentUser = useQuery(api.users.getCurrentUserOrNull);

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
  const brandName = agencyBranding?.brandName || "SAYELE";
  const brandLogoUrl = agencyBranding?.brandLogoUrl;
  const brandPrimaryColor = agencyBranding?.brandPrimaryColor;
  const brandWebsite = agencyBranding?.brandWebsite;

  // Get active billers for selected category and country
  const billers = useQuery(
    api.billers.listActiveBillers,
    selectedCategory ? { category: selectedCategory, country: selectedCountry } : "skip"
  );
  
  // Get all billers for search filtering (filtered by country)
  const allBillers = useQuery(api.billers.listActiveBillers, { country: selectedCountry });
  
  // AI search action
  const searchBillersWithAI = useAction(api.billerSearch.searchBillersWithAI);
  
  // SayeleGate payment action
  const createPaymentIntent = useAction(api.sayeleGate.createPaymentIntent);

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
      currency: countryConfig[selectedCountry].currency,
    },
  });

  const amount = watch("amount");
  const currency = watch("currency");
  
  // Update currency when country changes
  useEffect(() => {
    setValue("currency", countryConfig[selectedCountry].currency);
    // Reset selections when country changes
    setSelectedCategory(null);
    setSelectedBiller(null);
    setShowAirtimeFlow(false);
    setShowCanalPlusFlow(false);
    setSearchQuery("");
    setSearchResults(null);
  }, [selectedCountry, setValue]);

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

      // Step 2: Process payment
      const processResult = await processBillPayment({
        paymentId: result.paymentId,
      });

      // Step 3: Handle gateway redirect if required
      if (processResult.requiresGateway && processResult.gatewayType === "SAYELE_GATE" && processResult.paymentDetails) {
        const currentLang = location.pathname.split("/")[1];
        const baseUrl = window.location.origin;
        
        // Create payment intent with SayeleGate
        const gatewayResult = await createPaymentIntent({
          paymentId: result.paymentId,
          amount: processResult.paymentDetails.amount,
          currency: processResult.paymentDetails.currency,
          customerName: processResult.paymentDetails.customerName,
          customerPhone: processResult.paymentDetails.customerPhone,
          customerEmail: processResult.paymentDetails.customerEmail,
          description: processResult.paymentDetails.description,
          reference: processResult.paymentDetails.reference,
          returnUrl: `${baseUrl}/${currentLang}/success?ref=${result.paymentReference}`,
          cancelUrl: `${baseUrl}/${currentLang}?cancelled=true`,
        });

        if (gatewayResult.success && gatewayResult.checkoutUrl) {
          // Redirect to SayeleGate checkout
          window.location.href = gatewayResult.checkoutUrl;
          return;
        } else {
          toast.error(gatewayResult.error || "Erreur lors de la création du paiement");
          return;
        }
      }

      // Navigate to success page for non-gateway payments
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
    setShowAirtimeFlow(false);
    setShowCanalPlusFlow(false);
  };

  const handleBackToBillers = () => {
    setSelectedBiller(null);
    setShowCanalPlusFlow(false);
  };
  
  // Handle AI search
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearchQuery.length < 3) {
        setSearchResults(null);
        return;
      }
      
      setIsSearching(true);
      try {
        const results = await searchBillersWithAI({ 
          query: debouncedSearchQuery,
          country: selectedCountry,
        });
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        toast.error("Erreur lors de la recherche");
      } finally {
        setIsSearching(false);
      }
    };
    
    performSearch();
  }, [debouncedSearchQuery, searchBillersWithAI, selectedCountry]);
  
  // Handle search result selection
  const handleSelectSearchResult = (billerId: string) => {
    const biller = allBillers?.find((b) => b._id === billerId);
    if (biller) {
      setSelectedCategory(biller.category as BillCategory);
      setSelectedBiller({
        id: biller._id,
        name: biller.name,
        category: biller.category as BillCategory,
        logoUrl: biller.logoUrl,
        feePercentage: biller.feePercentage,
        feeFixed: biller.feeFixed,
      });
      setSearchQuery("");
      setSearchResults(null);
      
      // Check if Canal+ biller to show special flow
      if (biller.code === "CANAL_PLUS_GN" || biller.code === "CANAL_PLUS_CI" || biller.code === "CANAL_PLUS_SN") {
        setShowCanalPlusFlow(true);
      }
    }
  };
  
  // Simple text filtering (when AI search hasn't triggered yet)
  const filteredBillers = searchQuery.length > 0 && searchQuery.length < 3 && allBillers
    ? allBillers.filter((b) =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

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
              <img src="/sarali-logo.png" alt="SAYELE" className="h-8 w-8 object-contain" />
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
                  case "BILLER":
                    dashboardPath = `/${lang}/biller`;
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
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("subtitle")}
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
          
          {/* Country Selector - Dropdown */}
          {!selectedBiller && !showAirtimeFlow && !showCanalPlusFlow && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={selectedCountry}
                  onValueChange={(value) => setSelectedCountry(value as Country)}
                  disabled={isDetectingCountry}
                >
                  <SelectTrigger className="w-[200px]">
                    {isDetectingCountry ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Détection...
                      </span>
                    ) : (
                      <SelectValue>
                        <span className="flex items-center gap-2">
                          <span className="text-lg">{countryConfig[selectedCountry].flag}</span>
                          <span>{t(`country.${selectedCountry}`)}</span>
                        </span>
                      </SelectValue>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(countryConfig) as [Country, typeof countryConfig[Country]][]).map(([code, config]) => (
                      <SelectItem key={code} value={code}>
                        <span className="flex items-center gap-2">
                          <span className="text-lg">{config.flag}</span>
                          <span>{t(`country.${code}`)}</span>
                          <span className="text-xs text-muted-foreground">({config.currency})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {/* AI Search Bar */}
          {!selectedBiller && !showAirtimeFlow && !showCanalPlusFlow && (
            <Card className="border-primary/30 shadow-lg">
              <CardContent className="pt-6">
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder={t("search.placeholder")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-10 h-12 text-base"
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                      {searchQuery && !isSearching && (
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setSearchResults(null);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <Button
                      variant="default"
                      size="lg"
                      disabled={!searchQuery || isSearching}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      {isSearching ? t("search.searching") : "AI"}
                    </Button>
                  </div>
                  
                  {/* Search Results */}
                  {(searchResults || filteredBillers) && (
                    <div className="mt-4 space-y-3">
                      {searchResults?.response && (
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                          <div className="flex items-start gap-2">
                            <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-primary mb-1">
                                {t("search.aiResponse")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {searchResults.response}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {searchResults?.suggestions && searchResults.suggestions.length > 0 && (
                        <div className="grid gap-2">
                          {searchResults.suggestions.slice(0, 5).map((suggestion) => {
                            const biller = allBillers?.find((b) => b._id === suggestion.billerId);
                            if (!biller) return null;
                            
                            return (
                              <button
                                key={suggestion.billerId}
                                onClick={() => handleSelectSearchResult(suggestion.billerId)}
                                className="flex items-center gap-4 p-4 rounded-lg border-2 border-muted hover:border-primary hover:bg-primary/5 transition-all text-left"
                              >
                                {biller.logoUrl ? (
                                  <img
                                    src={biller.logoUrl}
                                    alt={biller.name}
                                    className="h-12 w-12 object-contain"
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                    <Building2 className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <p className="font-medium">{biller.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {categoryLabels[biller.category as BillCategory]}
                                  </p>
                                </div>
                                <span className="text-xs text-primary">
                                  {t("search.selectBiller")} →
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      
                      {filteredBillers && filteredBillers.length > 0 && !searchResults && (
                        <div className="grid gap-2">
                          {filteredBillers.slice(0, 5).map((biller) => (
                            <button
                              key={biller._id}
                              onClick={() => handleSelectSearchResult(biller._id)}
                              className="flex items-center gap-4 p-4 rounded-lg border-2 border-muted hover:border-primary hover:bg-primary/5 transition-all text-left"
                            >
                              {biller.logoUrl ? (
                                <img
                                  src={biller.logoUrl}
                                  alt={biller.name}
                                  className="h-12 w-12 object-contain"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                  <Building2 className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="font-medium">{biller.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {categoryLabels[biller.category as BillCategory]}
                                </p>
                              </div>
                              <span className="text-xs text-primary">
                                {t("search.selectBiller")} →
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {searchResults?.suggestions && searchResults.suggestions.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          {t("search.noResults")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Featured Section - Dynamic by country */}
          {!selectedBiller && !selectedCategory && !showAirtimeFlow && !showCanalPlusFlow && featuredByCountry[selectedCountry] && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  {t("featured.title")}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {t("featured.subtitle")} - {countryConfig[selectedCountry].flag} {countryConfig[selectedCountry].name}
                </p>
              </div>
              
              {(() => {
                const featured = featuredByCountry[selectedCountry]!;
                const colorClass = selectedCountry === "CI" ? "emerald" : "amber";
                
                return (
                  <Card className={`border-2 border-${colorClass}-200 bg-gradient-to-br from-${colorClass}-50/50 to-${colorClass === "emerald" ? "green" : "orange"}-50/30 dark:from-${colorClass}-950/20 dark:to-${colorClass === "emerald" ? "green" : "orange"}-950/10 dark:border-${colorClass}-800`}
                    style={{
                      borderColor: selectedCountry === "CI" ? "rgb(167 243 208)" : "rgb(253 230 138)",
                      background: selectedCountry === "CI" 
                        ? "linear-gradient(to bottom right, rgba(236, 253, 245, 0.5), rgba(240, 253, 244, 0.3))"
                        : "linear-gradient(to bottom right, rgba(255, 251, 235, 0.5), rgba(255, 247, 237, 0.3))",
                    }}
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Company Branding */}
                        <div className="flex-shrink-0 text-center md:text-left">
                          <div 
                            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-3"
                            style={{ backgroundColor: selectedCountry === "CI" ? "rgb(5 150 105)" : "rgb(217 119 6)" }}
                          >
                            <Shield className="h-10 w-10 text-white" />
                          </div>
                          <h3 
                            className="text-2xl font-bold mb-1"
                            style={{ color: selectedCountry === "CI" ? "rgb(4 120 87)" : "rgb(180 83 9)" }}
                          >
                            {featured.company}
                          </h3>
                          <p 
                            className="text-sm mb-3"
                            style={{ color: selectedCountry === "CI" ? "rgb(5 150 105)" : "rgb(217 119 6)" }}
                          >
                            {featured.description}
                          </p>
                          <a
                            href={featured.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs hover:underline"
                            style={{ color: selectedCountry === "CI" ? "rgb(5 150 105)" : "rgb(217 119 6)" }}
                          >
                            {featured.website.replace("https://", "")} →
                          </a>
                        </div>
                        
                        {/* Products Grid */}
                        <div className="flex-1">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {featured.products.map((product, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  toast.info(`${product.name}`, {
                                    description: product.desc,
                                  });
                                  window.open(featured.website, "_blank");
                                }}
                                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white dark:bg-slate-900 border hover:shadow-md transition-all group"
                                style={{
                                  borderColor: selectedCountry === "CI" ? "rgb(167 243 208)" : "rgb(253 230 138)",
                                }}
                              >
                                <div 
                                  className="p-2 rounded-full transition-colors"
                                  style={{
                                    backgroundColor: selectedCountry === "CI" ? "rgb(209 250 229)" : "rgb(254 243 199)",
                                    color: selectedCountry === "CI" ? "rgb(5 150 105)" : "rgb(217 119 6)",
                                  }}
                                >
                                  {product.icon}
                                </div>
                                <div className="text-center">
                                  <p className="font-medium text-sm text-foreground">{product.name}</p>
                                  <p className="text-xs text-muted-foreground">{product.desc}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                          
                          <div 
                            className="mt-4 flex items-center justify-center gap-2 text-xs"
                            style={{ color: selectedCountry === "CI" ? "rgb(5 150 105)" : "rgb(217 119 6)" }}
                          >
                            <Shield className="h-4 w-4" />
                            <span>
                              {selectedCountry === "CI" 
                                ? "Protection complète • Devis instantané • Service Leely WhatsApp"
                                : "Services disponibles • Paiement sécurisé • Support local"
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          )}

          {/* Step 1: Category Selection */}
          {!selectedCategory && !showAirtimeFlow && !showCanalPlusFlow && (
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
                      onClick={() => {
                        if (category === "AIRTIME") {
                          setShowAirtimeFlow(true);
                        } else {
                          setSelectedCategory(category);
                        }
                      }}
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

          {/* Airtime Top-up Flow */}
          {showAirtimeFlow && (
            <AirtimeTopup
              country={selectedCountry}
              currency={countryConfig[selectedCountry].currency}
              onBack={() => setShowAirtimeFlow(false)}
              onSuccess={(reference) => {
                const currentLang = location.pathname.split("/")[1];
                navigate(`/${currentLang}/success?ref=${reference}`);
              }}
              brandPrimaryColor={brandPrimaryColor}
            />
          )}

          {/* Canal+ Subscription Flow */}
          {showCanalPlusFlow && selectedBiller && (
            <CanalPlusSubscription
              country={selectedCountry}
              currency={countryConfig[selectedCountry].currency}
              billerId={selectedBiller.id}
              billerName={selectedBiller.name}
              billerLogoUrl={selectedBiller.logoUrl}
              onBack={() => {
                setShowCanalPlusFlow(false);
                setSelectedBiller(null);
              }}
              onSuccess={(reference) => {
                const currentLang = location.pathname.split("/")[1];
                navigate(`/${currentLang}/success?ref=${reference}`);
              }}
              brandPrimaryColor={brandPrimaryColor}
            />
          )}

          {/* Step 2: Biller Selection */}
          {selectedCategory && !selectedBiller && !showAirtimeFlow && (
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
                        onClick={() => {
                          setSelectedBiller({
                            id: biller._id,
                            name: biller.name,
                            category: biller.category,
                            logoUrl: biller.logoUrl,
                            feePercentage: biller.feePercentage,
                            feeFixed: biller.feeFixed,
                          });
                          // Check if Canal+ biller to show special flow
                          if (biller.code === "CANAL_PLUS_GN" || biller.code === "CANAL_PLUS_CI" || biller.code === "CANAL_PLUS_SN") {
                            setShowCanalPlusFlow(true);
                          }
                        }}
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
          {selectedBiller && !showCanalPlusFlow && (
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
          {!showAirtimeFlow && (
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
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

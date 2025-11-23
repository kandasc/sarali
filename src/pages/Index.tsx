import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Navigate, useParams } from "react-router-dom";
import { Building2, Users, Wallet, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import LanguageSwitcher from "@/components/ui/language-switcher.tsx";
import { useTranslation } from "react-i18next";

function LandingPage() {
  const { t } = useTranslation("common");
  const { lng } = useParams<{ lng: string }>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">{t("app.name")}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <SignInButton />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-balance">
            {t("app.tagline")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {lng === "fr"
              ? "Centralisez tous vos services financiers dans une seule interface. Gérez vos agences, vos équipes et vos transactions en temps réel."
              : "Centralize all your financial services in one interface. Manage your agencies, teams and transactions in real time."}
          </p>
          <div className="flex gap-4 justify-center">
            <SignInButton />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
          <div className="p-6 rounded-xl bg-card border space-y-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">
              {lng === "fr" ? "Gestion Hiérarchique" : "Hierarchical Management"}
            </h3>
            <p className="text-muted-foreground">
              {lng === "fr"
                ? "Structure Master → Managers → Chefs d'agence → Caissiers avec permissions granulaires"
                : "Master → Managers → Agency Heads → Cashiers structure with granular permissions"}
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card border space-y-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">
              {lng === "fr" ? "Gestion du Crédit" : "Credit Management"}
            </h3>
            <p className="text-muted-foreground">
              {lng === "fr"
                ? "Distribution et suivi des crédits transactionnels en temps réel avec alertes automatiques"
                : "Real-time distribution and tracking of transactional credits with automatic alerts"}
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card border space-y-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">
              {lng === "fr" ? "Reporting Avancé" : "Advanced Reporting"}
            </h3>
            <p className="text-muted-foreground">
              {lng === "fr"
                ? "Tableaux de bord personnalisables avec analytics et exports PDF/Excel"
                : "Customizable dashboards with analytics and PDF/Excel exports"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardRouter() {
  const { lng } = useParams<{ lng: string }>();
  const currentUser = useQuery(api.users.getCurrentUser);
  const activeSimulation = useQuery(api.roleSimulation.getActiveSimulation);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-20 w-full max-w-md" />
      </div>
    );
  }

  const langPrefix = lng ? `/${lng}` : "/fr";

  // If Master is simulating a role, redirect to that role's dashboard
  if (currentUser.role === "MASTER" && activeSimulation) {
    if (activeSimulation.simulatedRole === "MANAGER") {
      return <Navigate to={`${langPrefix}/manager`} replace />;
    } else if (activeSimulation.simulatedRole === "CHEF_AGENCE") {
      return <Navigate to={`${langPrefix}/agency`} replace />;
    } else if (activeSimulation.simulatedRole === "CAISSIER") {
      return <Navigate to={`${langPrefix}/cashier`} replace />;
    }
  }

  // Route based on role
  if (currentUser.role === "SUPER_ADMIN") {
    return <Navigate to={`${langPrefix}/superadmin`} replace />;
  } else if (currentUser.role === "MASTER") {
    return <Navigate to={`${langPrefix}/master`} replace />;
  } else if (currentUser.role === "MANAGER") {
    return <Navigate to={`${langPrefix}/manager`} replace />;
  } else if (currentUser.role === "CHEF_AGENCE") {
    return <Navigate to={`${langPrefix}/agency`} replace />;
  } else if (currentUser.role === "CAISSIER") {
    return <Navigate to={`${langPrefix}/cashier`} replace />;
  }

  return <Navigate to={`${langPrefix}/setup`} replace />;
}

export default function Index() {
  return (
    <>
      <Unauthenticated>
        <LandingPage />
      </Unauthenticated>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">
          <Skeleton className="h-20 w-full max-w-md" />
        </div>
      </AuthLoading>
      <Authenticated>
        <DashboardRouter />
      </Authenticated>
    </>
  );
}

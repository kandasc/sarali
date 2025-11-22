import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Navigate } from "react-router-dom";
import { Building2, Users, Wallet, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">FinanceHub</span>
          </div>
          <SignInButton />
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-balance">
            Plateforme d'Agrégation de Services Financiers
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Centralisez tous vos services financiers dans une seule interface.
            Gérez vos agences, vos équipes et vos transactions en temps réel.
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
            <h3 className="text-xl font-semibold">Gestion Hiérarchique</h3>
            <p className="text-muted-foreground">
              Structure Master → Managers → Chefs d'agence → Caissiers avec
              permissions granulaires
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card border space-y-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Gestion du Crédit</h3>
            <p className="text-muted-foreground">
              Distribution et suivi des crédits transactionnels en temps réel
              avec alertes automatiques
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card border space-y-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Reporting Avancé</h3>
            <p className="text-muted-foreground">
              Tableaux de bord personnalisables avec analytics et exports
              PDF/Excel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardRouter() {
  const currentUser = useQuery(api.users.getCurrentUser);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-20 w-full max-w-md" />
      </div>
    );
  }

  // Route based on role
  if (currentUser.role === "MASTER") {
    return <Navigate to="/master" replace />;
  } else if (currentUser.role === "MANAGER") {
    return <Navigate to="/manager" replace />;
  } else if (currentUser.role === "CHEF_AGENCE") {
    return <Navigate to="/agency" replace />;
  } else if (currentUser.role === "CAISSIER") {
    return <Navigate to="/cashier" replace />;
  }

  return <Navigate to="/setup" replace />;
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

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import DashboardLayout from "@/components/dashboard-layout.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Store, BarChart3, Receipt, AlertCircle } from "lucide-react";
import OverviewTab from "./_components/overview-tab.tsx";
import TransactionsTab from "./_components/transactions-tab.tsx";
import ReportsTab from "./_components/reports-tab.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Navigate, useParams } from "react-router-dom";

function BillerDashboardContent() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const billerInfo = useQuery(api.billerDashboard.getBillerInfo);
  const activeSimulation = useQuery(api.roleSimulation.getActiveSimulation);
  const { lng } = useParams<{ lng: string }>();

  const langPrefix = lng ? `/${lng}` : "/fr";

  if (currentUser === undefined || billerInfo === undefined || activeSimulation === undefined) {
    return (
      <DashboardLayout title="Espace Fournisseur">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Accès Refusé
            </CardTitle>
            <CardDescription>
              Utilisateur non trouvé. Veuillez vous reconnecter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignInButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is a biller or simulating a biller
  const isSimulatingBiller = activeSimulation?.simulatedRole === "BILLER";
  const isBillerRole = currentUser.role === "BILLER";
  
  // Redirect to appropriate dashboard if not a biller
  if (!isBillerRole && !isSimulatingBiller) {
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
    return <Navigate to={`${langPrefix}/dashboard`} replace />;
  }

  if (!billerInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Configuration Incomplète
            </CardTitle>
            <CardDescription>
              Votre compte n'est pas associé à un fournisseur. Contactez l'administrateur.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout title="Espace Fournisseur">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          {billerInfo.logoUrl ? (
            <img 
              src={billerInfo.logoUrl} 
              alt={billerInfo.name}
              className="h-12 w-12 object-contain rounded-lg border"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg border bg-muted flex items-center justify-center">
              <Store className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {billerInfo.name}
            </h1>
            <p className="text-muted-foreground">
              Tableau de bord fournisseur • {billerInfo.code}
            </p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Aperçu
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Rapports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <TransactionsTab />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <ReportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default function BillerDashboard() {
  return (
    <>
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Connexion Requise</CardTitle>
              <CardDescription>
                Vous devez vous connecter pour accéder à l'espace fournisseur.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignInButton />
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">
          <Skeleton className="h-96 w-full max-w-4xl" />
        </div>
      </AuthLoading>
      <Authenticated>
        <BillerDashboardContent />
      </Authenticated>
    </>
  );
}

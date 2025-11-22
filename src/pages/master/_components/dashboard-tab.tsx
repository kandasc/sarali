import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Building2,
  Users,
  Wallet,
  TrendingUp,
  AlertCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "react-router-dom";
import { RoleSimulationControls } from "@/components/role-simulation-controls.tsx";

export default function DashboardTab() {
  const globalStats = useQuery(api.agenciesStats.getGlobalStats, {});
  const creditOverview = useQuery(api.credits.getCreditOverview, {});
  const lowCreditAlerts = useQuery(api.credits.getLowCreditAlerts, {
    threshold: 10000,
  });
  const recentTransactions = useQuery(api.credits.getTransactionHistory, {
    limit: 5,
  });
  const currentUser = useQuery(api.users.getCurrentUser);

  if (
    globalStats === undefined ||
    creditOverview === undefined ||
    lowCreditAlerts === undefined ||
    recentTransactions === undefined ||
    currentUser === undefined ||
    currentUser === null
  ) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      minimumFractionDigits: 0,
    }).format(amount) + " " + currency;
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-bold">
          Bienvenue, {currentUser.name || "Master"}
        </h2>
        <p className="text-muted-foreground mt-1">
          Voici un aperçu de votre réseau d'agences
        </p>
      </div>

      {/* Role Simulation Controls */}
      <RoleSimulationControls />

      {/* Key Metrics Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Agences Actives
              <Building2 className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-bold">{globalStats.activeAgencies}</p>
              <p className="text-xs text-muted-foreground">
                sur {globalStats.totalAgencies} agences
              </p>
              <div className="flex items-center gap-1 text-green-600 text-xs mt-2">
                <TrendingUp className="h-3 w-3" />
                <span>
                  {Math.round(
                    (globalStats.activeAgencies / globalStats.totalAgencies) *
                      100
                  )}
                  % actives
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Utilisateurs
              <Users className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-bold">{globalStats.activeUsers}</p>
              <p className="text-xs text-muted-foreground">
                {globalStats.totalUsers} au total
              </p>
              <div className="flex items-center gap-1 text-blue-600 text-xs mt-2">
                <Activity className="h-3 w-3" />
                <span>
                  {globalStats.managers} Managers, {globalStats.chefs} Chefs,{" "}
                  {globalStats.caissiers} Caissiers
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Crédit Total
              <Wallet className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {formatCurrency(
                  creditOverview.totalSystemCredit,
                  creditOverview.currency
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Système complet
              </p>
              <div className="flex items-center gap-1 text-purple-600 text-xs mt-2">
                <Wallet className="h-3 w-3" />
                <span>
                  Agences:{" "}
                  {formatCurrency(
                    creditOverview.totalAgencyCredit,
                    creditOverview.currency
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Alertes
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-orange-600">
                {lowCreditAlerts.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Crédits faibles
              </p>
              {lowCreditAlerts.length > 0 && (
                <div className="flex items-center gap-1 text-orange-600 text-xs mt-2">
                  <AlertCircle className="h-3 w-3" />
                  <span>Nécessitent attention</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transactions Récentes</span>
              <Button variant="ghost" size="sm" asChild>
                <a href="#credits">Voir tout</a>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucune transaction récente
              </p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx._id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          tx.type === "DEPOSIT"
                            ? "bg-green-100 dark:bg-green-900"
                            : "bg-blue-100 dark:bg-blue-900"
                        }`}
                      >
                        {tx.type === "DEPOSIT" ? (
                          <ArrowDownRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {tx.type === "DEPOSIT" ? "Dépôt" : "Transfert"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {formatCurrency(tx.amount, tx.currency)}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          tx.status === "COMPLETED"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Credit Alerts */}
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Alertes Crédit
              </span>
              <Button variant="ghost" size="sm" asChild>
                <a href="#credits">Voir tout</a>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowCreditAlerts.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 mb-3">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Tous les utilisateurs ont un crédit suffisant
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowCreditAlerts.slice(0, 4).map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.role}
                        {user.agency && ` • ${user.agency.name}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-600">
                        {formatCurrency(user.creditBalance, user.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">Solde</p>
                    </div>
                  </div>
                ))}
                {lowCreditAlerts.length > 4 && (
                  <p className="text-xs text-center text-muted-foreground">
                    +{lowCreditAlerts.length - 4} autres alertes
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle>État du Système</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Taux d'Agences Actives
                </span>
                <span className="text-sm font-semibold">
                  {Math.round(
                    (globalStats.activeAgencies / globalStats.totalAgencies) *
                      100
                  )}
                  %
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${(globalStats.activeAgencies / globalStats.totalAgencies) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Taux d'Utilisateurs Actifs
                </span>
                <span className="text-sm font-semibold">
                  {Math.round(
                    (globalStats.activeUsers / globalStats.totalUsers) * 100
                  )}
                  %
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${(globalStats.activeUsers / globalStats.totalUsers) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Crédit Distribué
                </span>
                <span className="text-sm font-semibold">
                  {creditOverview.totalSystemCredit > 0
                    ? Math.round(
                        (creditOverview.totalUserCredit /
                          creditOverview.totalSystemCredit) *
                          100
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{
                    width:
                      creditOverview.totalSystemCredit > 0
                        ? `${(creditOverview.totalUserCredit / creditOverview.totalSystemCredit) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

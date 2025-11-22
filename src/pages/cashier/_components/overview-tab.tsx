import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { 
  WalletIcon, 
  BuildingIcon, 
  TrendingUpIcon, 
  ActivityIcon,
  ArrowDownIcon,
  UserIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";

export default function OverviewTab() {
  const overview = useQuery(api.cashierDashboard.getCashierOverview);

  if (!overview) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ` ${currency}`;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-bold">Bienvenue, {overview.user.name}</h2>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary">{overview.user.role}</Badge>
          {overview.agency && (
            <span className="text-muted-foreground">• {overview.agency.name}</span>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mon Solde</CardTitle>
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(overview.creditBalance, overview.currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Crédit disponible</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reçu Aujourd'hui</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(overview.todayReceived, overview.currency)}
            </div>
            <p className="text-xs text-muted-foreground">Crédits reçus</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activités</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.activitiesToday}</div>
            <p className="text-xs text-muted-foreground">Aujourd'hui</p>
          </CardContent>
        </Card>
      </div>

      {/* Agency & Manager Info */}
      <div className="grid gap-4 md:grid-cols-2">
        {overview.agency && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BuildingIcon className="h-5 w-5 text-primary" />
                <CardTitle>Mon Agence</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-medium">{overview.agency.name}</p>
                <p className="text-xs text-muted-foreground">{overview.agency.code}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {overview.agency.address}, {overview.agency.city}
                </p>
                <p className="text-xs text-muted-foreground">{overview.agency.country}</p>
              </div>
              {overview.agency.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">{overview.agency.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {overview.manager && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                <CardTitle>Mon Superviseur</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-medium">{overview.manager.name}</p>
                <Badge variant="outline">{overview.manager.role}</Badge>
              </div>
              {overview.manager.email && (
                <p className="text-xs text-muted-foreground">{overview.manager.email}</p>
              )}
              {overview.manager.phone && (
                <p className="text-xs text-muted-foreground">{overview.manager.phone}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions Récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune transaction récente
            </p>
          ) : (
            <div className="space-y-4">
              {overview.recentTransactions.map((tx) => (
                <div key={tx._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      tx.type === "DEPOSIT" ? "bg-green-100 dark:bg-green-900/20" :
                      tx.type === "TRANSFER" ? "bg-blue-100 dark:bg-blue-900/20" :
                      "bg-orange-100 dark:bg-orange-900/20"
                    }`}>
                      <ArrowDownIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.reason || "Transfert"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx._creationTime).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">
                      +{formatCurrency(tx.amount, tx.currency)}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiques Rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Transactions</span>
              <span className="text-sm font-bold">{overview.totalTransactions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Statut</span>
              <Badge variant={overview.user.status === "ACTIVE" ? "default" : "secondary"}>
                {overview.user.status === "ACTIVE" ? "Actif" : "Inactif"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Devise</span>
              <Badge variant="outline">{overview.currency}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

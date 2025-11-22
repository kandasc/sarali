import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { 
  BuildingIcon, 
  UsersIcon, 
  CreditCardIcon, 
  ActivityIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";

export default function OverviewTab() {
  const overview = useQuery(api.agencyDashboard.getAgencyOverview);

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
        <h2 className="text-3xl font-bold">{overview.agency.name}</h2>
        <p className="text-muted-foreground">
          {overview.agency.address}, {overview.agency.city} - {overview.agency.country}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Caissiers Actifs</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalCashiers}</div>
            <p className="text-xs text-muted-foreground">Membres de votre équipe</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crédit Agence</CardTitle>
            <BuildingIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(overview.agencyCreditBalance, overview.currency)}
            </div>
            <p className="text-xs text-muted-foreground">Disponible pour distribution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crédit Distribué</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(overview.totalCreditInUsers, overview.currency)}
            </div>
            <p className="text-xs text-muted-foreground">Chez les caissiers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activités Aujourd'hui</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.activitiesToday}</div>
            <p className="text-xs text-muted-foreground">Actions effectuées</p>
          </CardContent>
        </Card>
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
                      {tx.type === "DEPOSIT" || tx.toId === overview.agency._id ? (
                        <ArrowDownIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowUpIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx._creationTime).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      tx.toId === overview.agency._id ? "text-green-600" : "text-orange-600"
                    }`}>
                      {tx.toId === overview.agency._id ? "+" : "-"}
                      {formatCurrency(tx.amount, tx.currency)}
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

      {/* Credit Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition du Crédit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Crédit Agence</span>
                <span className="text-sm font-bold">
                  {formatCurrency(overview.agencyCreditBalance, overview.currency)}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${(overview.agencyCreditBalance / overview.totalCredit) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Crédit Caissiers</span>
                <span className="text-sm font-bold">
                  {formatCurrency(overview.totalCreditInUsers, overview.currency)}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${(overview.totalCreditInUsers / overview.totalCredit) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">Crédit Total</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(overview.totalCredit, overview.currency)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

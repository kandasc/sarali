import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { 
  TrendingUpIcon, 
  CalendarIcon, 
  ActivityIcon,
  CreditCardIcon
} from "lucide-react";

export default function StatsTab() {
  const stats = useQuery(api.cashierDashboard.getCashierStats);
  const overview = useQuery(api.cashierDashboard.getCashierOverview);

  if (!stats || !overview) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
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
      <div>
        <h2 className="text-2xl font-bold">Statistiques Détaillées</h2>
        <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
      </div>

      {/* Current Balance */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5 text-primary" />
            Solde Actuel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">
            {formatCurrency(overview.creditBalance, overview.currency)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">Crédit disponible</p>
        </CardContent>
      </Card>

      {/* Overall Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Statistiques Globales</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reçu</CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalReceived, stats.currency)}
              </div>
              <p className="text-xs text-muted-foreground">Depuis le début</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions Totales</CardTitle>
              <ActivityIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground">Toutes périodes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Moyenne</CardTitle>
              <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalTransactions > 0
                  ? formatCurrency(
                      stats.totalReceived / stats.totalTransactions,
                      stats.currency
                    )
                  : formatCurrency(0, stats.currency)}
              </div>
              <p className="text-xs text-muted-foreground">Par transaction</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Weekly Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Cette Semaine
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reçu</CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.weekReceived, stats.currency)}
              </div>
              <p className="text-xs text-muted-foreground">7 derniers jours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <ActivityIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.weekTransactions}</div>
              <p className="text-xs text-muted-foreground">7 derniers jours</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Monthly Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Ce Mois
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reçu</CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.monthReceived, stats.currency)}
              </div>
              <p className="text-xs text-muted-foreground">30 derniers jours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <ActivityIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthTransactions}</div>
              <p className="text-xs text-muted-foreground">30 derniers jours</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Indicateurs de Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Activité Hebdomadaire</span>
                <span className="text-sm font-bold">
                  {stats.totalTransactions > 0
                    ? Math.round((stats.weekTransactions / stats.totalTransactions) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      stats.totalTransactions > 0
                        ? (stats.weekTransactions / stats.totalTransactions) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Activité Mensuelle</span>
                <span className="text-sm font-bold">
                  {stats.totalTransactions > 0
                    ? Math.round((stats.monthTransactions / stats.totalTransactions) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      stats.totalTransactions > 0
                        ? (stats.monthTransactions / stats.totalTransactions) * 100
                        : 0
                    }%`,
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

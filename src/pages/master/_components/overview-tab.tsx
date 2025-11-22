import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Building2,
  Users,
  Wallet,
  TrendingUp,
  Globe,
  Award,
} from "lucide-react";

export default function OverviewTab() {
  const stats = useQuery(api.agenciesStats.getGlobalStats, {});
  const countriesData = useQuery(api.agenciesStats.getAgenciesByCountry, {});

  if (stats === undefined || countriesData === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string) => {
    return (
      new Intl.NumberFormat("fr-FR", {
        style: "decimal",
        minimumFractionDigits: 0,
      }).format(amount) +
      " " +
      currency
    );
  };

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Vue d'ensemble</h2>
        <p className="text-muted-foreground">
          Statistiques globales du réseau d'agences
        </p>
      </div>

      {/* Main Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agences actives</p>
                <p className="text-3xl font-bold">{stats.activeAgencies}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  sur {stats.totalAgencies} total
                </p>
              </div>
              <Building2 className="h-10 w-10 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Utilisateurs actifs
                </p>
                <p className="text-3xl font-bold">{stats.activeUsers}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  sur {stats.totalUsers} total
                </p>
              </div>
              <Users className="h-10 w-10 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Crédit XOF</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.credits.totalXOF, "XOF")}
                </p>
              </div>
              <Wallet className="h-10 w-10 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Crédit GNF</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.credits.totalGNF, "GNF")}
                </p>
              </div>
              <Wallet className="h-10 w-10 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Distribution des utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Managers</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(stats.managers / stats.totalUsers) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-8 text-right">
                    {stats.managers}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Chefs d'agence
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${(stats.chefs / stats.totalUsers) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-8 text-right">
                    {stats.chefs}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Caissiers</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-500"
                      style={{
                        width: `${(stats.caissiers / stats.totalUsers) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-8 text-right">
                    {stats.caissiers}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Countries Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Répartition géographique
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {countriesData.map((countryData: { country: string; count: number }) => (
                <div
                  key={countryData.country}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-muted-foreground">
                    {countryData.country}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${(countryData.count / stats.totalAgencies) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-8 text-right">
                      {countryData.count}
                    </span>
                  </div>
                </div>
              ))}
              {countriesData.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Aucune agence enregistrée
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Credit Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Distribution du crédit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">XOF</span>
                <span className="text-sm font-semibold">
                  {formatCurrency(stats.credits.totalXOF, "XOF")}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">• Agences</span>
                  <span>
                    {formatCurrency(stats.credits.agencyCreditsXOF, "XOF")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">• Utilisateurs</span>
                  <span>
                    {formatCurrency(stats.credits.userCreditsXOF, "XOF")}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">GNF</span>
                <span className="text-sm font-semibold">
                  {formatCurrency(stats.credits.totalGNF, "GNF")}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">• Agences</span>
                  <span>
                    {formatCurrency(stats.credits.agencyCreditsGNF, "GNF")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">• Utilisateurs</span>
                  <span>
                    {formatCurrency(stats.credits.userCreditsGNF, "GNF")}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Agency */}
        {stats.topAgency && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Agence la plus active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-2xl font-bold mb-1">
                  {stats.topAgency.name}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Code: {stats.topAgency.code}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                  <span className="font-semibold">
                    {stats.topAgency.userCount} utilisateurs
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

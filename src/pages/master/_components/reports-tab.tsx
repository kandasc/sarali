import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { DownloadIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6"];

export default function ReportsTab() {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [selectedAgencyId, setSelectedAgencyId] = useState<Id<"agencies"> | undefined>(undefined);

  const agencies = useQuery(api.agencies.listAgencies, {});

  // Calculate date range
  const getDateRange = () => {
    const endDate = Date.now();
    let startDate = endDate - 30 * 24 * 60 * 60 * 1000; // default 30 days

    switch (dateRange) {
      case "7d":
        startDate = endDate - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30d":
        startDate = endDate - 30 * 24 * 60 * 60 * 1000;
        break;
      case "90d":
        startDate = endDate - 90 * 24 * 60 * 60 * 1000;
        break;
      case "1y":
        startDate = endDate - 365 * 24 * 60 * 60 * 1000;
        break;
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  const transactionAnalytics = useQuery(api.analytics.getTransactionAnalytics, {
    startDate,
    endDate,
    agencyId: selectedAgencyId,
  });

  const agencyPerformance = useQuery(api.analytics.getAgencyPerformance, {
    startDate,
    endDate,
  });

  const userPerformance = useQuery(api.analytics.getUserPerformance, {
    startDate,
    endDate,
    agencyId: selectedAgencyId,
  });

  const financialSummary = useQuery(api.analytics.getFinancialSummary, {
    startDate,
    endDate,
  });

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ` ${currency}`;
  };

  const exportToCSV = (data: object[], filename: string) => {
    if (data.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) => Object.values(row).join(","));
    const csv = [headers, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();

    toast.success("Rapport exporté avec succès");
  };

  if (!transactionAnalytics || !agencyPerformance || !userPerformance || !financialSummary || !agencies) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-96" />
        ))}
      </div>
    );
  }

  const pieChartData = [
    { name: "Dépôts", value: transactionAnalytics.summary.depositCount },
    { name: "Retraits", value: transactionAnalytics.summary.withdrawalCount },
    { name: "Transferts", value: transactionAnalytics.summary.transferCount },
    { name: "Paiements", value: transactionAnalytics.summary.paymentCount },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Rapports & Analytics</h2>
          <p className="text-muted-foreground">
            Analyse détaillée des performances et transactions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={dateRange}
            onValueChange={(value: "7d" | "30d" | "90d" | "1y") => setDateRange(value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">90 derniers jours</SelectItem>
              <SelectItem value="1y">1 an</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedAgencyId || "all"}
            onValueChange={(value) => setSelectedAgencyId(value === "all" ? undefined : value as Id<"agencies">)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Toutes les agences" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les agences</SelectItem>
              {agencies.map((agency) => (
                <SelectItem key={agency._id} value={agency._id}>
                  {agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactionAnalytics.summary.totalTransactions.toLocaleString("fr-FR")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(
                transactionAnalytics.summary.totalAmount,
                transactionAnalytics.summary.currency
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frais Collectés</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                transactionAnalytics.summary.totalFees,
                transactionAnalytics.summary.currency
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((transactionAnalytics.summary.totalFees / transactionAnalytics.summary.totalAmount) * 100).toFixed(2)}% du montant total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant Moyen</CardTitle>
            <TrendingDownIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                transactionAnalytics.summary.avgTransactionAmount,
                transactionAnalytics.summary.currency
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Par transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crédit Total</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                financialSummary.overview.totalCreditInjected,
                financialSummary.overview.currency
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Injecté dans le système</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Tendances</TabsTrigger>
          <TabsTrigger value="types">Par Type</TabsTrigger>
          <TabsTrigger value="agencies">Agences</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="financial">Financier</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Volume de Transactions</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(transactionAnalytics.timeSeries, "transactions-trends")}
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Exporter CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={transactionAnalytics.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Transactions" />
                  <Line type="monotone" dataKey="totalAmount" stroke="#10b981" name="Montant Total" />
                  <Line type="monotone" dataKey="totalFees" stroke="#f59e0b" name="Frais" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Types Tab */}
        <TabsContent value="types" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribution par Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Volume par Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={transactionAnalytics.timeSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="deposits" fill="#10b981" name="Dépôts" />
                    <Bar dataKey="withdrawals" fill="#f59e0b" name="Retraits" />
                    <Bar dataKey="transfers" fill="#3b82f6" name="Transferts" />
                    <Bar dataKey="payments" fill="#8b5cf6" name="Paiements" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agencies Tab */}
        <TabsContent value="agencies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Performance des Agences</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(agencyPerformance, "agency-performance")}
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Exporter CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Agence</th>
                      <th className="text-left p-2">Pays/Ville</th>
                      <th className="text-right p-2">Transactions</th>
                      <th className="text-right p-2">Montant Total</th>
                      <th className="text-right p-2">Frais</th>
                      <th className="text-right p-2">Utilisateurs</th>
                      <th className="text-right p-2">Crédit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agencyPerformance.map((agency) => (
                      <tr key={agency.agencyId} className="border-b hover:bg-accent/50">
                        <td className="p-2 font-medium">{agency.agencyName}</td>
                        <td className="p-2 text-muted-foreground">
                          {agency.country} / {agency.city}
                        </td>
                        <td className="p-2 text-right">{agency.totalTransactions}</td>
                        <td className="p-2 text-right">
                          {formatCurrency(agency.totalAmount, agency.currency)}
                        </td>
                        <td className="p-2 text-right">
                          {formatCurrency(agency.totalFees, agency.currency)}
                        </td>
                        <td className="p-2 text-right">{agency.activeUsers}</td>
                        <td className="p-2 text-right">
                          {formatCurrency(agency.creditBalance, agency.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Performance des Utilisateurs</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(userPerformance, "user-performance")}
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Exporter CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Nom</th>
                      <th className="text-left p-2">Rôle</th>
                      <th className="text-left p-2">Agence</th>
                      <th className="text-right p-2">Transactions</th>
                      <th className="text-right p-2">Montant Total</th>
                      <th className="text-right p-2">Frais Collectés</th>
                      <th className="text-right p-2">Crédit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userPerformance.map((user) => (
                      <tr key={user.userId} className="border-b hover:bg-accent/50">
                        <td className="p-2 font-medium">{user.userName}</td>
                        <td className="p-2">{user.userRole}</td>
                        <td className="p-2 text-muted-foreground">{user.agencyName}</td>
                        <td className="p-2 text-right">{user.totalTransactions}</td>
                        <td className="p-2 text-right">
                          {formatCurrency(user.totalAmount, user.currency)}
                        </td>
                        <td className="p-2 text-right">
                          {formatCurrency(user.totalFees, user.currency)}
                        </td>
                        <td className="p-2 text-right">
                          {formatCurrency(user.creditBalance, user.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Résumé Financier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Transactions</span>
                  <span className="text-sm">{financialSummary.overview.totalTransactions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Montant Total</span>
                  <span className="text-sm font-bold">
                    {formatCurrency(financialSummary.overview.totalAmount, financialSummary.overview.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Frais Totaux</span>
                  <span className="text-sm font-bold text-green-600">
                    {formatCurrency(financialSummary.overview.totalFees, financialSummary.overview.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Crédit Injecté</span>
                  <span className="text-sm font-bold">
                    {formatCurrency(financialSummary.overview.totalCreditInjected, financialSummary.overview.currency)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Par Type de Transaction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Dépôts</span>
                    <span className="font-medium">{financialSummary.byType.deposits.count} transactions</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Montant: {formatCurrency(financialSummary.byType.deposits.amount, financialSummary.overview.currency)}</span>
                    <span>Frais: {formatCurrency(financialSummary.byType.deposits.fees, financialSummary.overview.currency)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Retraits</span>
                    <span className="font-medium">{financialSummary.byType.withdrawals.count} transactions</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Montant: {formatCurrency(financialSummary.byType.withdrawals.amount, financialSummary.overview.currency)}</span>
                    <span>Frais: {formatCurrency(financialSummary.byType.withdrawals.fees, financialSummary.overview.currency)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Transferts</span>
                    <span className="font-medium">{financialSummary.byType.transfers.count} transactions</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Montant: {formatCurrency(financialSummary.byType.transfers.amount, financialSummary.overview.currency)}</span>
                    <span>Frais: {formatCurrency(financialSummary.byType.transfers.fees, financialSummary.overview.currency)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Paiements</span>
                    <span className="font-medium">{financialSummary.byType.payments.count} transactions</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Montant: {formatCurrency(financialSummary.byType.payments.amount, financialSummary.overview.currency)}</span>
                    <span>Frais: {formatCurrency(financialSummary.byType.payments.fees, financialSummary.overview.currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

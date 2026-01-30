import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
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
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Download, TrendingUp, Calendar } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ReportsTab() {
  const [period, setPeriod] = useState<"7" | "14" | "30" | "90">("30");

  const dailyReport = useQuery(api.billerDashboard.getDailyReport, {
    days: parseInt(period),
  });
  const dashboardStats = useQuery(api.billerDashboard.getDashboardStats);

  const handleExportCSV = () => {
    if (!dailyReport) return;

    const headers = ["Date", "Transactions", "Montant (XOF)", "Frais (XOF)"];
    const rows = dailyReport.map((day) => [
      day.date,
      day.count.toString(),
      day.amount.toString(),
      day.fees.toString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `rapport-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (dailyReport === undefined || dashboardStats === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Calculate totals for the period
  const periodTotals = dailyReport.reduce(
    (acc, day) => ({
      transactions: acc.transactions + day.count,
      amount: acc.amount + day.amount,
      fees: acc.fees + day.fees,
    }),
    { transactions: 0, amount: 0, fees: 0 }
  );

  // Format data for charts
  const chartData = dailyReport.map((day) => ({
    date: format(new Date(day.date), "dd MMM", { locale: fr }),
    transactions: day.count,
    montant: day.amount,
    frais: day.fees,
  }));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Période:</span>
              <Select value={period} onValueChange={(v) => setPeriod(v as "7" | "14" | "30" | "90")}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 derniers jours</SelectItem>
                  <SelectItem value="14">14 derniers jours</SelectItem>
                  <SelectItem value="30">30 derniers jours</SelectItem>
                  <SelectItem value="90">90 derniers jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Period Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periodTotals.transactions}</div>
            <p className="text-xs text-muted-foreground">
              Sur les {period} derniers jours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {periodTotals.amount.toLocaleString()}{" "}
              <span className="text-sm font-normal">XOF</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Montant total traité
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Frais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {periodTotals.fees.toLocaleString()}{" "}
              <span className="text-sm font-normal">XOF</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Frais collectés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Évolution des Transactions
          </CardTitle>
          <CardDescription>
            Nombre de transactions par jour
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="transactions"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Transactions"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Aucune donnée disponible pour cette période
            </p>
          )}
        </CardContent>
      </Card>

      {/* Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Volume et Frais</CardTitle>
          <CardDescription>
            Montants traités par jour (en XOF)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString() + " XOF"}
                />
                <Legend />
                <Bar dataKey="montant" fill="#82ca9d" name="Montant" />
                <Bar dataKey="frais" fill="#ffc658" name="Frais" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Aucune donnée disponible pour cette période
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

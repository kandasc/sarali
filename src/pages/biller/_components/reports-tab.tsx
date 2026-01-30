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
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Download, TrendingUp, Calendar, TestTube, FileText } from "lucide-react";
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ReportsTab() {
  const [period, setPeriod] = useState<"7" | "14" | "30" | "90">("30");
  const [includeTest, setIncludeTest] = useState(true);

  const dailyReport = useQuery(api.billerDashboard.getDailyReport, {
    days: parseInt(period),
    includeTest,
    includeAllStatuses: true,
  });
  const dashboardStats = useQuery(api.billerDashboard.getDashboardStats);
  const billerInfo = useQuery(api.billerDashboard.getBillerInfo);

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

  const handleExportPDF = () => {
    if (!dailyReport || !billerInfo) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentDate = format(new Date(), "dd MMMM yyyy", { locale: fr });

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Rapport de Transactions", pageWidth / 2, 20, { align: "center" });

    // Biller info
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Fournisseur: ${billerInfo.name}`, 20, 35);
    doc.text(`Code: ${billerInfo.code}`, 20, 42);
    doc.text(`Date du rapport: ${currentDate}`, 20, 49);
    doc.text(`Période: ${period} derniers jours`, 20, 56);
    
    // Line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 62, pageWidth - 20, 62);

    // Calculate totals for the period
    const periodTotals = dailyReport.reduce(
      (acc, day) => ({
        transactions: acc.transactions + day.count,
        amount: acc.amount + day.amount,
        fees: acc.fees + day.fees,
      }),
      { transactions: 0, amount: 0, fees: 0 }
    );

    // Summary section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Résumé", 20, 75);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Transactions: ${periodTotals.transactions}`, 20, 85);
    doc.text(`Volume Total: ${periodTotals.amount.toLocaleString()} XOF`, 20, 92);
    doc.text(`Frais Collectés: ${periodTotals.fees.toLocaleString()} XOF`, 20, 99);

    // Table
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Détail par jour", 20, 115);

    autoTable(doc, {
      startY: 120,
      head: [["Date", "Transactions", "Montant (XOF)", "Frais (XOF)"]],
      body: dailyReport.map((day) => [
        format(new Date(day.date), "dd MMM yyyy", { locale: fr }),
        day.count.toString(),
        day.amount.toLocaleString(),
        day.fees.toLocaleString(),
      ]),
      foot: [[
        "TOTAL",
        periodTotals.transactions.toString(),
        periodTotals.amount.toLocaleString(),
        periodTotals.fees.toLocaleString(),
      ]],
      theme: "striped",
      headStyles: { 
        fillColor: [59, 130, 246], 
        textColor: 255,
        fontStyle: "bold",
        halign: "center"
      },
      footStyles: { 
        fillColor: [243, 244, 246], 
        textColor: [0, 0, 0],
        fontStyle: "bold" 
      },
      columnStyles: {
        0: { halign: "left" },
        1: { halign: "center" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
      styles: {
        fontSize: 10,
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    // Footer with signature
    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
    
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(`Généré le ${currentDate} par Sarali, by SAYELE (sayele.co)`, pageWidth / 2, finalY, { align: "center" });
    doc.text("Ce document est généré automatiquement et ne nécessite pas de signature.", pageWidth / 2, finalY + 6, { align: "center" });

    // Save PDF
    doc.save(`rapport-${billerInfo.code}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
              <div className="flex items-center gap-2">
                <Switch
                  id="include-test"
                  checked={includeTest}
                  onCheckedChange={setIncludeTest}
                />
                <Label htmlFor="include-test" className="flex items-center gap-1 text-sm cursor-pointer">
                  <TestTube className="h-4 w-4" />
                  Inclure test
                </Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button onClick={handleExportPDF} disabled={!billerInfo}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
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

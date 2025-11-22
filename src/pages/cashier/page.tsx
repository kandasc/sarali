import { Authenticated } from "convex/react";
import DashboardLayout from "@/components/dashboard-layout.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import OverviewTab from "./_components/overview-tab.tsx";
import TransactionsTab from "./_components/transactions-tab.tsx";
import StatsTab from "./_components/stats-tab.tsx";

export default function CashierDashboard() {
  return (
    <Authenticated>
      <DashboardLayout title="Tableau de bord Caissier">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Accueil</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsTab />
          </TabsContent>

          <TabsContent value="stats">
            <StatsTab />
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </Authenticated>
  );
}

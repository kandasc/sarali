import { Authenticated } from "convex/react";
import DashboardLayout from "@/components/dashboard-layout.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import OverviewTab from "./_components/overview-tab.tsx";
import CashiersTab from "./_components/cashiers-tab.tsx";
import CreditsTab from "./_components/credits-tab.tsx";
import TransactionsTab from "./_components/transactions-tab.tsx";
import ActivityTab from "./_components/activity-tab.tsx";

export default function AgencyDashboard() {
  return (
    <Authenticated>
      <DashboardLayout title="Tableau de bord Chef d'Agence">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Accueil</TabsTrigger>
            <TabsTrigger value="cashiers">Caissiers</TabsTrigger>
            <TabsTrigger value="credits">Crédits</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="activity">Activité</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="cashiers">
            <CashiersTab />
          </TabsContent>

          <TabsContent value="credits">
            <CreditsTab />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsTab />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab />
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </Authenticated>
  );
}

import { Authenticated } from "convex/react";
import DashboardLayout from "@/components/dashboard-layout.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Users, Building2, Activity } from "lucide-react";
import UsersTab from "./_components/users-tab.tsx";
import AgenciesTab from "./_components/agencies-tab.tsx";

export default function MasterDashboard() {
  return (
    <Authenticated>
      <DashboardLayout title="Tableau de bord Master">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Utilisateurs</span>
            </TabsTrigger>
            <TabsTrigger value="agencies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Agences</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Activité</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="agencies">
            <AgenciesTab />
          </TabsContent>

          <TabsContent value="activity">
            <div className="text-center py-12 text-muted-foreground">
              Fonctionnalité à venir dans les prochaines milestones
            </div>
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </Authenticated>
  );
}

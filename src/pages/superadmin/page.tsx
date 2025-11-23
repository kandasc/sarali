import { Authenticated } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import DashboardLayout from "@/components/dashboard-layout.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Shield, Users, Sparkles, BarChart } from "lucide-react";
import OverviewTab from "./_components/overview-tab.tsx";
import UsersTab from "./_components/users-tab.tsx";
import BillersTab from "../master/_components/billers-tab.tsx";

export default function SuperAdminDashboard() {
  const currentUser = useQuery(api.users.getCurrentUser);

  if (!currentUser) {
    return null;
  }

  return (
    <Authenticated>
      <DashboardLayout title="Super Admin">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8 text-purple-500" />
              Super Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              System-wide management and oversight
            </p>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">
                <BarChart className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="billers">
                <Sparkles className="h-4 w-4 mr-2" />
                Billers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <OverviewTab />
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <UsersTab />
            </TabsContent>

            <TabsContent value="billers" className="space-y-4">
              <BillersTab />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </Authenticated>
  );
}

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import DashboardLayout from "@/components/dashboard-layout.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Shield, Users, Sparkles, BarChart, AlertCircle } from "lucide-react";
import OverviewTab from "./_components/overview-tab.tsx";
import UsersTab from "./_components/users-tab.tsx";
import BillersTab from "../master/_components/billers-tab.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { useNavigate, useParams } from "react-router-dom";

function SuperAdminContent() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const navigate = useNavigate();
  const { lng } = useParams<{ lng: string }>();

  if (currentUser === undefined) {
    return (
      <DashboardLayout title="Super Admin">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              User not found. Please sign in again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignInButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is actually a super admin
  if (currentUser.role !== "SUPER_ADMIN") {
    const langPrefix = lng ? `/${lng}` : "/fr";
    // Redirect to appropriate dashboard based on role
    if (currentUser.role === "MASTER") {
      navigate(`${langPrefix}/master`, { replace: true });
    } else if (currentUser.role === "MANAGER") {
      navigate(`${langPrefix}/manager`, { replace: true });
    } else if (currentUser.role === "CHEF_AGENCE") {
      navigate(`${langPrefix}/agency`, { replace: true });
    } else if (currentUser.role === "CAISSIER") {
      navigate(`${langPrefix}/cashier`, { replace: true });
    }
    return null;
  }

  return (
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
  );
}

export default function SuperAdminDashboard() {
  return (
    <>
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                You need to sign in to access the Super Admin dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignInButton />
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">
          <Skeleton className="h-96 w-full max-w-4xl" />
        </div>
      </AuthLoading>
      <Authenticated>
        <SuperAdminContent />
      </Authenticated>
    </>
  );
}

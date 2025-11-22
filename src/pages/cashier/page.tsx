import { Authenticated } from "convex/react";
import DashboardLayout from "@/components/dashboard-layout.tsx";
import { ConstructionIcon } from "lucide-react";

export default function CashierDashboard() {
  return (
    <Authenticated>
      <DashboardLayout title="Tableau de bord Caissier">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <ConstructionIcon className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-bold">Interface Caissier</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Cette interface sera disponible dans la milestone "Interface Caissier"
          </p>
        </div>
      </DashboardLayout>
    </Authenticated>
  );
}

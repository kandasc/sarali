import { Authenticated } from "convex/react";
import DashboardLayout from "@/components/dashboard-layout.tsx";
import { ConstructionIcon } from "lucide-react";

export default function AgencyDashboard() {
  return (
    <Authenticated>
      <DashboardLayout title="Tableau de bord Chef d'Agence">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <ConstructionIcon className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-bold">Interface Chef d'Agence</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Cette interface sera disponible dans la milestone "Interface Chef d'agence"
          </p>
        </div>
      </DashboardLayout>
    </Authenticated>
  );
}

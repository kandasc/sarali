import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Eye, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

export function RoleSimulationBanner() {
  const session = useQuery(api.roleSimulation.getActiveSimulation);
  const endSimulation = useMutation(api.roleSimulation.endSimulation);
  const navigate = useNavigate();
  const { lng } = useParams<{ lng: string }>();

  if (!session) return null;

  const handleEnd = async () => {
    await endSimulation({ sessionId: session.sessionId });
    // Navigate back to admin dashboard
    const langPrefix = lng ? `/${lng}` : "/fr";
    navigate(`${langPrefix}/superadmin`);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "BILLER": return "Fournisseur";
      case "MANAGER": return "Manager";
      case "CHEF_AGENCE": return "Chef d'Agence";
      case "CAISSIER": return "Caissier";
      default: return role;
    }
  };

  return (
    <Alert className="mb-4 border-orange-500 bg-orange-50 dark:bg-orange-950">
      <AlertDescription>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-orange-600" />
            <span className="font-medium text-orange-900 dark:text-orange-100">
              Mode Simulation Active:{" "}
              <span className="font-bold">{getRoleLabel(session.simulatedRole)}</span>
            </span>
            {session.targetUser && (
              <span className="text-sm text-orange-700 dark:text-orange-300">
                • Utilisateur: {session.targetUser.name}
              </span>
            )}
            {session.targetBiller && (
              <span className="text-sm text-orange-700 dark:text-orange-300">
                • Fournisseur: {session.targetBiller.name}
              </span>
            )}
          </div>
          <Button
            onClick={handleEnd}
            variant="default"
            size="sm"
            className="bg-orange-600 hover:bg-orange-700"
          >
            <X className="mr-2 h-4 w-4" />
            Quitter Simulation
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Activity,
  UserPlus,
  Edit,
  Ban,
  Building2,
  ArrowRightLeft,
  Plus,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { useState } from "react";

export default function ActivityTab() {
  const [filterAction, setFilterAction] = useState<string>("all");
  const activityLogs = useQuery(api.rbac.getActivityLogs, { limit: 50 });

  if (activityLogs === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE_USER":
        return <UserPlus className="h-4 w-4" />;
      case "UPDATE_USER":
        return <Edit className="h-4 w-4" />;
      case "DEACTIVATE_USER":
        return <Ban className="h-4 w-4" />;
      case "CREATE_AGENCY":
        return <Building2 className="h-4 w-4" />;
      case "TRANSFER_CREDIT":
        return <ArrowRightLeft className="h-4 w-4" />;
      case "ADD_CREDIT":
        return <Plus className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE_USER":
      case "CREATE_AGENCY":
      case "ADD_CREDIT":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "UPDATE_USER":
      case "TRANSFER_CREDIT":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "DEACTIVATE_USER":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "CREATE_USER":
        return "Création utilisateur";
      case "UPDATE_USER":
        return "Modification utilisateur";
      case "DEACTIVATE_USER":
        return "Désactivation utilisateur";
      case "CREATE_AGENCY":
        return "Création agence";
      case "UPDATE_AGENCY":
        return "Modification agence";
      case "TRANSFER_CREDIT":
        return "Transfert crédit";
      case "ADD_CREDIT":
        return "Ajout crédit";
      default:
        return action;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter logs
  const filteredLogs =
    filterAction === "all"
      ? activityLogs
      : activityLogs.filter((log) => log.action === filterAction);

  // Get unique actions for filter
  const uniqueActions = Array.from(
    new Set(activityLogs.map((log) => log.action))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Journal d'Activité</h2>
          <p className="text-muted-foreground">
            Historique des actions dans le système
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrer par action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {getActionLabel(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Actions
                </p>
                <p className="text-3xl font-bold">{activityLogs.length}</p>
              </div>
              <Activity className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Créations
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {
                    activityLogs.filter(
                      (log) =>
                        log.action === "CREATE_USER" ||
                        log.action === "CREATE_AGENCY"
                    ).length
                  }
                </p>
              </div>
              <UserPlus className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Modifications
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {
                    activityLogs.filter((log) => log.action === "UPDATE_USER")
                      .length
                  }
                </p>
              </div>
              <Edit className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>
            Activités Récentes ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucune activité trouvée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log._id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div
                    className={`p-2 rounded-lg ${getActionColor(log.action)}`}
                  >
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">
                        {log.user?.name || "Utilisateur inconnu"}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${getActionColor(log.action)}`}
                      >
                        {getActionLabel(log.action)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {log.details || "Aucun détail disponible"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(log._creationTime)}
                    </p>
                  </div>
                  {log.entityType && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {log.entityType === "users" ? (
                        <UserPlus className="h-3 w-3" />
                      ) : (
                        <Building2 className="h-3 w-3" />
                      )}
                      <span>{log.entityType}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

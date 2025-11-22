import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  UserPlusIcon,
  UserIcon,
  ActivityIcon,
  FileTextIcon,
} from "lucide-react";

export default function ActivityTab() {
  const activityLogs = useQuery(api.agencyDashboard.getAgencyActivityLogs, { limit: 100 });

  if (!activityLogs) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    if (action === "CREATE_USER") {
      return <UserPlusIcon className="h-4 w-4" />;
    } else if (action === "UPDATE_USER") {
      return <UserIcon className="h-4 w-4" />;
    } else if (action === "DEACTIVATE_USER") {
      return <UserIcon className="h-4 w-4" />;
    }
    return <FileTextIcon className="h-4 w-4" />;
  };

  const getActionColor = (action: string) => {
    if (action === "CREATE_USER") {
      return "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400";
    } else if (action === "UPDATE_USER") {
      return "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400";
    } else if (action === "DEACTIVATE_USER") {
      return "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400";
    }
    return "bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400";
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      CREATE_USER: "Création",
      UPDATE_USER: "Modification",
      DEACTIVATE_USER: "Désactivation",
      CREATE_AGENCY: "Création Agence",
      UPDATE_AGENCY: "Modification Agence",
    };
    return labels[action] || action;
  };

  // Calculate statistics
  const totalActivities = activityLogs.length;
  const createActions = activityLogs.filter((log) => log.action === "CREATE_USER").length;
  const updateActions = activityLogs.filter((log) => log.action === "UPDATE_USER").length;

  // Group by date
  const groupedByDate: Record<string, typeof activityLogs> = {};
  activityLogs.forEach((log) => {
    const date = new Date(log._creationTime).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }
    groupedByDate[date].push(log);
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Journal d'Activités</h2>
        <p className="text-muted-foreground">Historique des actions dans votre agence</p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activités</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivities}</div>
            <p className="text-xs text-muted-foreground">Actions enregistrées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créations</CardTitle>
            <UserPlusIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{createActions}</div>
            <p className="text-xs text-muted-foreground">Nouveaux utilisateurs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modifications</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{updateActions}</div>
            <p className="text-xs text-muted-foreground">Mises à jour</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      {totalActivities === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ActivityIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune activité</h3>
            <p className="text-sm text-muted-foreground text-center">
              Les activités de votre agence apparaîtront ici
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, logs]) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="text-base">{date}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log._id}
                      className="flex items-start gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">{getActionLabel(log.action)}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {log.entityType}
                          </span>
                        </div>

                        {log.details && (
                          <p className="text-sm mb-2">{log.details}</p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Par: {log.user?.name || "Inconnu"}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(log._creationTime).toLocaleTimeString("fr-FR")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

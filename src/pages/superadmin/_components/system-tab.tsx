import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  TestTube,
  Rocket,
  Trash2,
  Tag,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function SystemTab() {
  const [isRunningMigration, setIsRunningMigration] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "test" | "live">("all");
  
  const stats = useQuery(api.billPayments.getPaymentStats);
  const payments = useQuery(api.billPayments.listPayments, { 
    isTest: paymentFilter === "all" ? undefined : paymentFilter === "test",
    limit: 20 
  });
  
  const markAsTest = useMutation(api.migrations.markExistingTransactionsAsTest);
  const deleteTestTransactions = useMutation(api.migrations.deleteTestTransactions);

  const handleMarkAsTest = async () => {
    setIsRunningMigration(true);
    try {
      const result = await markAsTest({});
      toast.success(result.message);
    } catch (error) {
      toast.error("Erreur lors de l'exécution de la migration");
    } finally {
      setIsRunningMigration(false);
    }
  };

  const handleDeleteTestTransactions = async () => {
    setIsRunningMigration(true);
    try {
      const result = await deleteTestTransactions({});
      toast.success(result.message);
    } catch (error) {
      toast.error("Erreur lors de la suppression des transactions test");
    } finally {
      setIsRunningMigration(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle className="h-3 w-3 mr-1" />Complété</Badge>;
      case "PROCESSING":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"><Clock className="h-3 w-3 mr-1" />En cours</Badge>;
      case "PENDING":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case "FAILED":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"><XCircle className="h-3 w-3 mr-1" />Échoué</Badge>;
      case "CANCELLED":
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (stats === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Transactions Test</CardTitle>
            <TestTube className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.test.count}</div>
            <p className="text-xs text-muted-foreground">
              {stats.test.completed} complétées • {stats.test.totalAmount.toLocaleString()} XOF
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Transactions Live</CardTitle>
            <Rocket className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.live.count}</div>
            <p className="text-xs text-muted-foreground">
              {stats.live.completed} complétées • {stats.live.totalAmount.toLocaleString()} XOF
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Non marquées</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unmarked}</div>
            <p className="text-xs text-muted-foreground">
              Transactions sans statut test/live
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Migration Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Actions de Migration
          </CardTitle>
          <CardDescription>
            Gérer les transactions test et live
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              onClick={handleMarkAsTest}
              disabled={isRunningMigration || stats.unmarked === 0}
            >
              <Tag className="h-4 w-4 mr-2" />
              Marquer {stats.unmarked} transactions comme Test
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={isRunningMigration || stats.test.count === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer {stats.test.count} transactions Test
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                  <AlertDialogDescription>
                    Êtes-vous sûr de vouloir supprimer toutes les {stats.test.count} transactions test ?
                    Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteTestTransactions}>
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions de Paiement</CardTitle>
          <CardDescription>
            Liste des paiements de factures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as "all" | "test" | "live")}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                Tous ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="test">
                <TestTube className="h-4 w-4 mr-1" />
                Test ({stats.test.count})
              </TabsTrigger>
              <TabsTrigger value="live">
                <Rocket className="h-4 w-4 mr-1" />
                Live ({stats.live.count})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={paymentFilter}>
              {payments === undefined ? (
                <Skeleton className="h-64 w-full" />
              ) : payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune transaction {paymentFilter !== "all" && (paymentFilter === "test" ? "test" : "live")}
                </p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Référence</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Fournisseur</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment._id}>
                          <TableCell className="font-mono text-xs">
                            {payment.paymentReference}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{payment.customerName}</p>
                              <p className="text-xs text-muted-foreground">{payment.customerPhone}</p>
                            </div>
                          </TableCell>
                          <TableCell>{payment.provider}</TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {payment.totalAmount.toLocaleString()} {payment.currency}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>
                            {payment.isTest ? (
                              <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                                <TestTube className="h-3 w-3 mr-1" />
                                Test
                              </Badge>
                            ) : payment.isTest === false ? (
                              <Badge variant="outline" className="border-green-500 text-green-600">
                                <Rocket className="h-3 w-3 mr-1" />
                                Live
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Non défini
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {format(new Date(payment._creationTime), "Pp", { locale: fr })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

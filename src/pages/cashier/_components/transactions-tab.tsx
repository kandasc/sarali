import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ArrowUpIcon, ArrowDownIcon, RefreshCwIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth.ts";

export default function TransactionsTab() {
  const { user } = useAuth();
  const transactions = useQuery(api.cashierDashboard.getCashierTransactions, { limit: 50 });

  if (!transactions) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ` ${currency}`;
  };

  const getTransactionIcon = (type: string, toId: string) => {
    // Check if current user is recipient
    if (toId === user?.profile.sub) {
      return <ArrowDownIcon className="h-4 w-4" />;
    }
    return <ArrowUpIcon className="h-4 w-4" />;
  };

  const getTransactionColor = (type: string, toId: string) => {
    // Check if current user is recipient
    if (toId === user?.profile.sub) {
      return "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400";
    }
    return "bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400";
  };

  const getStatusBadge = (status: string) => {
    if (status === "COMPLETED") {
      return <Badge variant="default">Complété</Badge>;
    } else if (status === "PENDING") {
      return <Badge variant="secondary">En attente</Badge>;
    }
    return <Badge variant="destructive">Échoué</Badge>;
  };

  const isReceived = (tx: { toType: string; toEntity?: { _id: string } | null }) => {
    if (!tx.toEntity) return false;
    return true; // Assuming the transaction is for current user since we're querying their transactions
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Historique des Transactions</h2>
        <p className="text-muted-foreground">
          {transactions.length} transaction{transactions.length > 1 ? "s" : ""}
        </p>
      </div>

      {transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCwIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune transaction</h3>
            <p className="text-sm text-muted-foreground text-center">
              Vos transactions apparaîtront ici
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Toutes les Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx._id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-2 rounded-lg ${getTransactionColor(tx.type, tx.toId)}`}>
                      {getTransactionIcon(tx.type, tx.toId)}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{tx.reason || "Transfert"}</p>
                        {getStatusBadge(tx.status)}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          De:{" "}
                          {tx.fromType === "SYSTEM"
                            ? "Système"
                            : tx.fromEntity
                            ? "name" in tx.fromEntity
                              ? tx.fromEntity.name
                              : "Inconnu"
                            : "Système"}
                        </span>
                        <span>→</span>
                        <span>
                          Vers:{" "}
                          {tx.toEntity
                            ? "name" in tx.toEntity
                              ? tx.toEntity.name
                              : "Inconnu"
                            : "Inconnu"}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{new Date(tx._creationTime).toLocaleString("fr-FR")}</span>
                        {tx.initiator && (
                          <span>
                            Par: {tx.initiator.name || "Inconnu"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <p className={`text-lg font-bold ${
                      isReceived(tx) ? "text-green-600" : "text-orange-600"
                    }`}>
                      {isReceived(tx) ? "+" : "-"}
                      {formatCurrency(tx.amount, tx.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Solde: {formatCurrency(tx.balanceAfter, tx.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

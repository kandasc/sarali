import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  CheckCircle,
  Clock,
  XCircle,
  Search,
  TestTube,
  Rocket,
  User,
  Phone,
  Mail,
  Receipt,
  CreditCard,
  Calendar,
  Hash,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type StatusFilter = "all" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
type ModeFilter = "all" | "test" | "live";
type Transaction = Doc<"billPayments">;

export default function TransactionsTab() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const transactions = useQuery(api.billerDashboard.getTransactions, {
    status: statusFilter === "all" ? undefined : statusFilter,
    isTest: modeFilter === "all" ? undefined : modeFilter === "test",
    limit: 100,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Complété
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            En cours
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            Échoué
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Annulé
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter by search query
  const filteredTransactions = transactions?.filter((t) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.paymentReference.toLowerCase().includes(query) ||
      t.customerName.toLowerCase().includes(query) ||
      t.customerPhone.includes(query) ||
      t.billReference.toLowerCase().includes(query)
    );
  });

  if (transactions === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="COMPLETED">Complété</SelectItem>
                <SelectItem value="PROCESSING">En cours</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="FAILED">Échoué</SelectItem>
                <SelectItem value="CANCELLED">Annulé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={modeFilter} onValueChange={(v) => setModeFilter(v as ModeFilter)}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="test">Test</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            {filteredTransactions?.length || 0} transaction(s) trouvée(s) • Cliquez sur une ligne pour voir les détails
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions && filteredTransactions.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Réf. Facture</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Frais</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow 
                      key={transaction._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      <TableCell className="font-mono text-xs">
                        {transaction.paymentReference}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.customerPhone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {transaction.billReference}
                      </TableCell>
                      <TableCell className="font-medium">
                        {transaction.amount.toLocaleString()} {transaction.currency}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.fees.toLocaleString()} {transaction.currency}
                      </TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell>
                        {transaction.isTest ? (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                            <TestTube className="h-3 w-3 mr-1" />
                            Test
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-500 text-green-600">
                            <Rocket className="h-3 w-3 mr-1" />
                            Live
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(transaction._creationTime), "Pp", { locale: fr })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Aucune transaction trouvée
            </p>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Détails de la Transaction
            </DialogTitle>
            <DialogDescription>
              Référence: {selectedTransaction?.paymentReference}
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              {/* Status and Mode */}
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedTransaction.status)}
                {selectedTransaction.isTest ? (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                    <TestTube className="h-3 w-3 mr-1" />
                    Mode Test
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-green-500 text-green-600">
                    <Rocket className="h-3 w-3 mr-1" />
                    Mode Live
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Customer Info */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Informations Client
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nom:</span>
                    <p className="font-medium">{selectedTransaction.customerName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Téléphone:
                    </span>
                    <p className="font-medium">{selectedTransaction.customerPhone}</p>
                  </div>
                  {selectedTransaction.customerEmail && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email:
                      </span>
                      <p className="font-medium">{selectedTransaction.customerEmail}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Payment Details */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Détails du Paiement
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Montant:</span>
                    <p className="font-medium text-lg">
                      {selectedTransaction.amount.toLocaleString()} {selectedTransaction.currency}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Frais:</span>
                    <p className="font-medium">
                      {selectedTransaction.fees.toLocaleString()} {selectedTransaction.currency}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Montant Total:</span>
                    <p className="font-bold text-lg text-primary">
                      {selectedTransaction.totalAmount.toLocaleString()} {selectedTransaction.currency}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* References */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Références
                </h4>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-muted-foreground">Réf. Paiement:</span>
                    <code className="font-mono text-xs bg-background px-2 py-1 rounded">
                      {selectedTransaction.paymentReference}
                    </code>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-muted-foreground">Réf. Facture:</span>
                    <code className="font-mono text-xs bg-background px-2 py-1 rounded">
                      {selectedTransaction.billReference}
                    </code>
                  </div>
                  {selectedTransaction.accountNumber && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-muted-foreground">N° Compte:</span>
                      <code className="font-mono text-xs bg-background px-2 py-1 rounded">
                        {selectedTransaction.accountNumber}
                      </code>
                    </div>
                  )}
                  {selectedTransaction.saraliTransactionId && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-muted-foreground">ID SAYELE:</span>
                      <code className="font-mono text-xs bg-background px-2 py-1 rounded">
                        {selectedTransaction.saraliTransactionId}
                      </code>
                    </div>
                  )}
                  {selectedTransaction.gatewayPaymentId && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-muted-foreground">ID Gateway:</span>
                      <code className="font-mono text-xs bg-background px-2 py-1 rounded">
                        {selectedTransaction.gatewayPaymentId}
                      </code>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Timestamps */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Dates
                </h4>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Créée le:</span>
                    <span className="font-medium">
                      {format(new Date(selectedTransaction._creationTime), "PPpp", { locale: fr })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {selectedTransaction.errorMessage && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-destructive">
                      <FileText className="h-4 w-4" />
                      Message d'Erreur
                    </h4>
                    <p className="text-sm bg-destructive/10 text-destructive p-3 rounded border border-destructive/20">
                      {selectedTransaction.errorMessage}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

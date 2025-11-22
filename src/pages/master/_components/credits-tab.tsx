import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Plus,
  ArrowRightLeft,
  Wallet,
  AlertCircle,
  TrendingUp,
  Building2,
  User,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

const addCreditSchema = z.object({
  amount: z.coerce
    .number()
    .min(1, "Le montant doit être supérieur à 0"),
});

const transferToUserSchema = z.object({
  userId: z.string().min(1, "Sélectionnez un utilisateur"),
  amount: z.coerce
    .number()
    .min(1, "Le montant doit être supérieur à 0"),
  reason: z.string().optional(),
});

const transferToAgencySchema = z.object({
  agencyId: z.string().min(1, "Sélectionnez une agence"),
  amount: z.coerce
    .number()
    .min(1, "Le montant doit être supérieur à 0"),
  reason: z.string().optional(),
});

type AddCreditFormData = z.infer<typeof addCreditSchema>;
type TransferToUserFormData = z.infer<typeof transferToUserSchema>;
type TransferToAgencyFormData = z.infer<typeof transferToAgencySchema>;

export default function CreditsTab() {
  const overview = useQuery(api.credits.getCreditOverview, {});
  const transactions = useQuery(api.credits.getTransactionHistory, {
    limit: 20,
  });
  const lowCreditAlerts = useQuery(api.credits.getLowCreditAlerts, {});
  const users = useQuery(api.rbac.listUsers, {});
  const agencies = useQuery(api.agencies.listAgencies, {});

  const addSystemCredit = useMutation(api.credits.addSystemCredit);
  const transferToUser = useMutation(api.credits.transferCreditToUser);
  const transferToAgency = useMutation(api.credits.transferCreditToAgency);

  const [isAddCreditDialogOpen, setIsAddCreditDialogOpen] = useState(false);
  const [isTransferUserDialogOpen, setIsTransferUserDialogOpen] =
    useState(false);
  const [isTransferAgencyDialogOpen, setIsTransferAgencyDialogOpen] =
    useState(false);

  const addCreditForm = useForm<AddCreditFormData>({
    resolver: zodResolver(addCreditSchema),
    defaultValues: {
      amount: 0,
    },
  });

  const transferUserForm = useForm<TransferToUserFormData>({
    resolver: zodResolver(transferToUserSchema),
    defaultValues: {
      userId: "",
      amount: 0,
      reason: "",
    },
  });

  const transferAgencyForm = useForm<TransferToAgencyFormData>({
    resolver: zodResolver(transferToAgencySchema),
    defaultValues: {
      agencyId: "",
      amount: 0,
      reason: "",
    },
  });

  const handleAddCredit = async (data: AddCreditFormData) => {
    try {
      await addSystemCredit({ amount: data.amount });
      toast.success("Crédit ajouté avec succès");
      setIsAddCreditDialogOpen(false);
      addCreditForm.reset();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors de l'ajout du crédit");
      }
    }
  };

  const handleTransferToUser = async (data: TransferToUserFormData) => {
    try {
      await transferToUser({
        toUserId: data.userId as Id<"users">,
        amount: data.amount,
        reason: data.reason,
      });
      toast.success("Transfert effectué avec succès");
      setIsTransferUserDialogOpen(false);
      transferUserForm.reset();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors du transfert");
      }
    }
  };

  const handleTransferToAgency = async (data: TransferToAgencyFormData) => {
    try {
      await transferToAgency({
        toAgencyId: data.agencyId as Id<"agencies">,
        amount: data.amount,
        reason: data.reason,
      });
      toast.success("Transfert effectué avec succès");
      setIsTransferAgencyDialogOpen(false);
      transferAgencyForm.reset();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors du transfert");
      }
    }
  };

  if (
    overview === undefined ||
    transactions === undefined ||
    lowCreditAlerts === undefined
  ) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string) => {
    return (
      new Intl.NumberFormat("fr-FR", {
        style: "decimal",
        minimumFractionDigits: 0,
      }).format(amount) +
      " " +
      currency
    );
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion du Crédit</h2>
          <p className="text-muted-foreground">
            Redistribution et suivi des crédits transactionnels
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog
            open={isAddCreditDialogOpen}
            onOpenChange={setIsAddCreditDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter Crédit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter du Crédit au Système</DialogTitle>
              </DialogHeader>
              <Form {...addCreditForm}>
                <form
                  onSubmit={addCreditForm.handleSubmit(handleAddCredit)}
                  className="space-y-4"
                >
                  <FormField
                    control={addCreditForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant ({overview.currency})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddCreditDialogOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit">Ajouter</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isTransferUserDialogOpen}
            onOpenChange={setIsTransferUserDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="secondary">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transférer à Utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Transférer du Crédit</DialogTitle>
              </DialogHeader>
              <Form {...transferUserForm}>
                <form
                  onSubmit={transferUserForm.handleSubmit(handleTransferToUser)}
                  className="space-y-4"
                >
                  <FormField
                    control={transferUserForm.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destinataire</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un utilisateur" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users?.map((user) => (
                              <SelectItem key={user._id} value={user._id}>
                                {user.name} ({user.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={transferUserForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant ({overview.currency})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="50000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={transferUserForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Raison (optionnel)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Approvisionnement mensuel"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsTransferUserDialogOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit">Transférer</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isTransferAgencyDialogOpen}
            onOpenChange={setIsTransferAgencyDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="secondary">
                <Building2 className="h-4 w-4 mr-2" />
                Transférer à Agence
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Transférer du Crédit à une Agence</DialogTitle>
              </DialogHeader>
              <Form {...transferAgencyForm}>
                <form
                  onSubmit={transferAgencyForm.handleSubmit(
                    handleTransferToAgency
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={transferAgencyForm.control}
                    name="agencyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agence</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une agence" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {agencies?.map((agency) => (
                              <SelectItem key={agency._id} value={agency._id}>
                                {agency.name} ({agency.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={transferAgencyForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant ({overview.currency})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={transferAgencyForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Raison (optionnel)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Approvisionnement agence"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsTransferAgencyDialogOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit">Transférer</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mon Solde
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <p className="text-2xl font-bold">
                {formatCurrency(overview.myBalance, overview.currency)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Crédit Total Système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <p className="text-2xl font-bold">
                {formatCurrency(overview.totalSystemCredit, overview.currency)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Crédit Agences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <p className="text-2xl font-bold">
                {formatCurrency(overview.totalAgencyCredit, overview.currency)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Crédit Utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-500" />
              <p className="text-2xl font-bold">
                {formatCurrency(overview.totalUserCredit, overview.currency)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="history" className="space-y-6">
        <TabsList>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="alerts">
            Alertes
            {lowCreditAlerts.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs">
                {lowCreditAlerts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <h3 className="text-lg font-semibold">Historique des Transactions</h3>
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Aucune transaction
                </CardContent>
              </Card>
            ) : (
              transactions.map((tx) => (
                <Card key={tx._id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-lg ${
                            tx.type === "DEPOSIT"
                              ? "bg-green-100 dark:bg-green-900"
                              : tx.type === "TRANSFER"
                                ? "bg-blue-100 dark:bg-blue-900"
                                : "bg-red-100 dark:bg-red-900"
                          }`}
                        >
                          {tx.type === "DEPOSIT" ? (
                            <ArrowDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : tx.type === "TRANSFER" ? (
                            <ArrowRightLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <ArrowUp className="h-5 w-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {tx.type === "DEPOSIT"
                              ? "Dépôt système"
                              : tx.type === "TRANSFER"
                                ? "Transfert"
                                : "Déduction"}
                          </p>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {tx.fromEntity && (
                              <p>
                                De:{" "}
                                {"name" in tx.fromEntity
                                  ? tx.fromEntity.name
                                  : "Système"}
                              </p>
                            )}
                            {tx.toEntity && (
                              <p>
                                Vers:{" "}
                                {"name" in tx.toEntity
                                  ? tx.toEntity.name
                                  : "Inconnu"}
                              </p>
                            )}
                            {tx.reason && <p className="italic">{tx.reason}</p>}
                            <p className="text-xs">
                              {formatDate(tx.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${
                            tx.type === "DEPOSIT"
                              ? "text-green-600"
                              : "text-foreground"
                          }`}
                        >
                          {formatCurrency(tx.amount, tx.currency)}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            tx.status === "COMPLETED"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : tx.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Alertes Crédit Faible</h3>
          </div>
          <div className="space-y-3">
            {lowCreditAlerts.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Aucune alerte pour le moment
                </CardContent>
              </Card>
            ) : (
              lowCreditAlerts.map((user) => (
                <Card key={user._id} className="border-orange-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.role}
                          {user.agency && ` • ${user.agency.name}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600">
                          {formatCurrency(user.creditBalance, user.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Solde faible
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
